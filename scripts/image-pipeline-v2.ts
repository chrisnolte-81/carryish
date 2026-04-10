/**
 * Carryish image pipeline v2.
 *
 * For each product in Payload:
 *   1. Resolve a source URL (override → affiliateUrl → product page).
 *   2. Scrape candidate image URLs via Firecrawl.
 *   3. Rank candidates with Claude vision (score 0–100).
 *   4. Download the best candidate.
 *   5. Remove background with rembg (scripts/python/remove-bg.py).
 *   6. Composite onto a 1600×1200 pure white canvas (scripts/python/standardize.py).
 *   7. Upload the WebP to Payload Media, PATCH the product's images array.
 *   8. Fallback: generate a branded placeholder if nothing usable was found.
 *
 * Usage:
 *   PAYLOAD_URL=https://carryish.ai pnpm tsx scripts/image-pipeline-v2.ts --dry-run
 *   PAYLOAD_URL=https://carryish.ai pnpm tsx scripts/image-pipeline-v2.ts --product=tern-gsd-gen-3
 *   PAYLOAD_URL=https://carryish.ai pnpm tsx scripts/image-pipeline-v2.ts --limit=5
 *   PAYLOAD_URL=https://carryish.ai pnpm tsx scripts/image-pipeline-v2.ts --only-missing
 *   PAYLOAD_URL=https://carryish.ai pnpm tsx scripts/image-pipeline-v2.ts --skip-score
 *   PAYLOAD_URL=https://carryish.ai pnpm tsx scripts/image-pipeline-v2.ts --placeholder-only
 *
 * Required env:
 *   PAYLOAD_URL, PAYLOAD_EMAIL, PAYLOAD_PASSWORD
 *   FIRECRAWL_API_KEY
 *   ANTHROPIC_API_KEY
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import Firecrawl from '@mendable/firecrawl-js'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const TMP_DIR = path.join(ROOT, '.tmp-pipeline')
const PY_DIR = path.join(__dirname, 'python')
const VENV_PY = path.join(ROOT, '.venv-pipeline/bin/python')

const BASE_URL = process.env.PAYLOAD_URL || 'http://localhost:3000'
const EMAIL = process.env.PAYLOAD_EMAIL || 'demo-author@example.com'
const PASSWORD = process.env.PAYLOAD_PASSWORD || 'password'
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY || ''
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ''

const args = process.argv.slice(2)
const FLAG_DRY_RUN = args.includes('--dry-run')
const FLAG_ONLY_MISSING = args.includes('--only-missing')
const FLAG_SKIP_SCORE = args.includes('--skip-score')
const FLAG_PLACEHOLDER_ONLY = args.includes('--placeholder-only')
const FLAG_FORCE = args.includes('--force')
const FLAG_KEEP_TMP = args.includes('--keep-tmp')
const FLAG_PRODUCT = args.find((a) => a.startsWith('--product='))?.split('=')[1]
const FLAG_BRAND = args.find((a) => a.startsWith('--brand='))?.split('=')[1]
const FLAG_LIMIT = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1]) || 0

// Manufacturer URLs known to be more reliable than whatever is stored as
// affiliateUrl. Mirrors the list in scrape-missing-firecrawl.ts — kept here so
// the v2 pipeline is self-contained.
const URL_OVERRIDES: Record<string, string> = {
  'xtracycle-swoop-asm': 'https://xtracycle.com/products/swoop-asm',
  'urban-arrow-familynext-pro': 'https://www.urbanarrow.com/en-na/familynext/',
  'urban-arrow-family-cargo-line': 'https://www.urbanarrow.com/en-na/family/',
  'urban-arrow-family-performance-line': 'https://www.urbanarrow.com/en-na/family/',
  'trek-fetch-plus-4': 'https://www.trekbikes.com/us/en_US/bikes/cargo-bikes/fetch/fetch-4/p/46011/',
  'trek-fetch-plus-2': 'https://www.trekbikes.com/us/en_US/bikes/cargo-bikes/fetch/fetch-2/p/46012/',
  'tern-nbd': 'https://store.ternbicycles.com/products/nbd-s5i',
  'tern-quick-haul': 'https://store.ternbicycles.com/products/quick-haul-p9',
  'tern-gsd-gen-3': 'https://store.ternbicycles.com/products/gsd-s10-gen-3',
  'tenways-cargo-one': 'https://us.tenways.com/products/cargo-one-1',
  'surly-big-dummy': 'https://surlybikes.com/products/big-dummy',
  'surface-604-werk': 'https://surface604bikes.com/products/werk-500',
  'pedego-stretch': 'https://www.pedegoelectricbikes.com/product/stretch/',
  'madsen-dk2-non-electric': 'https://www.madsencycles.com/products/dk2',
  'larry-vs-harry-ebullitt': 'https://www.larryvsharry.com/products/bullitt-e-6100',
  'himiway-big-dog': 'https://himiwaybike.com/products/big-dog-1',
  'heybike-hauler': 'https://www.heybike.com/products/hauler-1',
  'gocycle-cx-plus': 'https://gocycle.com/us/webstore/gocycles/gocycle-g4/gocycle-cxplus/',
  'gocycle-cxi': 'https://gocycle.com/us/webstore/gocycles/gocycle-g4/gocycle-cxi/',
  'fiido-t2': 'https://www.fiido.com/products/fiido-t2',
  'carqon-cruise-smart': 'https://www.carqon.com/us/carqon-cruise-smart/',
  'butchers-and-bicycles-mk1-e': 'https://www.butchersandbicycles.com/mk1-e/',
  'addmotor-m-330': 'https://www.addmotor.com/products/m-330-electric-cargo-bike',
  'also-tm-q': 'https://ridealso.com/products/quad',
  'momentum-cito-e-plus': 'https://www.momentum-biking.com/us/cito-eplus',
  'cero-bikes-cero-one': 'https://www.cerobicycles.com/cero-one',
  'coaster-cycles-freighter': 'https://www.coastercycles.com/freighter',
  'coaster-cycles-venture': 'https://www.coastercycles.com/venture',
}

const SKIP_IMG_PATTERNS = [
  /logo/i,
  /icon/i,
  /badge/i,
  /flag/i,
  /payment/i,
  /social/i,
  /avatar/i,
  /spinner/i,
  /loading/i,
  /placeholder/i,
  /pixel/i,
  /tracking/i,
  /analytics/i,
  /facebook/i,
  /twitter/i,
  /instagram/i,
  /youtube/i,
  /svg$/i,
  /1x1/i,
  /spacer/i,
  /thumbnail/i,
  /favicon/i,
]

// ─── Types ───

interface Brand {
  id: number
  name: string
  slug: string
}

interface MediaRef {
  id: number
  url?: string
  filename?: string
  width?: number
  height?: number
}

interface Product {
  id: number
  name: string
  slug: string
  affiliateUrl?: string
  brand?: Brand | null
  // Depth>=1 returns populated MediaRef objects, depth=0 returns number IDs.
  images?: Array<MediaRef | number>
}

interface ScoredCandidate {
  url: string
  score: number
  visual: number
  hits: number
  reason: string
}

// ─── Logging ───

function log(msg: string) {
  console.log(`[pipeline] ${msg}`)
}
function warn(msg: string) {
  console.warn(`[pipeline] ⚠ ${msg}`)
}
function section(msg: string) {
  console.log(`\n── ${msg} ──`)
}

// ─── Payload API ───

async function login(): Promise<string> {
  log(`Logging in to ${BASE_URL}…`)
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return data.token
}

async function fetchProducts(token: string): Promise<Product[]> {
  let url = `${BASE_URL}/api/products?limit=250&depth=2`
  if (FLAG_PRODUCT) url += `&where[slug][equals]=${encodeURIComponent(FLAG_PRODUCT)}`
  if (FLAG_BRAND) url += `&where[brand.slug][equals]=${encodeURIComponent(FLAG_BRAND)}`

  const res = await fetch(url, { headers: { Authorization: `JWT ${token}` } })
  if (!res.ok) throw new Error(`Fetch products failed (${res.status})`)
  const data = await res.json()
  return data.docs || []
}

async function uploadMedia(filePath: string, alt: string, token: string): Promise<number> {
  const form = new FormData()
  const buf = fs.readFileSync(filePath)
  form.append('file', new Blob([buf], { type: 'image/webp' }), path.basename(filePath))
  form.append('alt', alt)

  const res = await fetch(`${BASE_URL}/api/media`, {
    method: 'POST',
    headers: { Authorization: `JWT ${token}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Upload failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return data.doc.id
}

async function patchProduct(
  id: number,
  body: Record<string, unknown>,
  token: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = (await res.text()).slice(0, 200)
    throw new Error(`Patch failed (${res.status}): ${txt}`)
  }
}

// ─── Product name tokenization ───

// Words that appear in most cargo-bike model names and don't help identify
// the specific model. We ignore them when matching URL slugs.
const STOP_TOKENS = new Set([
  'the',
  'bike',
  'bikes',
  'cargo',
  'electric',
  'non',
  'e',
  'ebike',
  'longtail',
  'pro',
  'plus',
  'model',
  'gen',
  'family',
])

function tokenize(label: string): string[] {
  return label
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOP_TOKENS.has(t))
}

function productTokens(product: Product): string[] {
  const brand = product.brand?.name || ''
  const tokens = new Set<string>()
  tokenize(product.slug).forEach((t) => tokens.add(t))
  tokenize(product.name).forEach((t) => tokens.add(t))
  // Brand tokens are less useful — many candidates live under brand CDNs.
  tokenize(brand).forEach((t) => {
    if (t.length >= 4) tokens.add(t)
  })
  return [...tokens]
}

/**
 * Score a URL from 0..N based on how many product tokens appear in it.
 * Used to prioritise candidates that are clearly about this specific model.
 */
function urlRelevance(url: string, tokens: string[]): number {
  const lower = url.toLowerCase()
  let hits = 0
  for (const token of tokens) {
    if (lower.includes(token)) hits += 1
  }
  return hits
}

/**
 * Rank candidates by URL-token match, preserving original order on ties.
 * This is the first line of defence against picking the wrong product's photo
 * off a page that displays a bunch of them.
 */
function rankByRelevance(urls: string[], tokens: string[]): string[] {
  if (tokens.length === 0) return urls
  const scored = urls.map((url, idx) => ({
    url,
    idx,
    hits: urlRelevance(url, tokens),
  }))
  scored.sort((a, b) => {
    if (b.hits !== a.hits) return b.hits - a.hits
    return a.idx - b.idx
  })
  return scored.map((s) => s.url)
}

// ─── Firecrawl scraping ───

async function scrapeWithFirecrawl(
  firecrawl: Firecrawl,
  url: string,
): Promise<string[]> {
  try {
    log(`  Firecrawl: ${url}`)
    const result = await firecrawl.scrape(url, {
      formats: ['markdown'],
      waitFor: 3000,
      timeout: 30000,
    })

    const markdown: string = (result as { markdown?: string }).markdown || ''
    const urls = new Set<string>()

    // Markdown image syntax
    const mdRe = /!\[[^\]]*\]\(([^)]+)\)/g
    let m: RegExpExecArray | null
    while ((m = mdRe.exec(markdown)) !== null) {
      const u = m[1]
      if (u && !u.startsWith('data:')) urls.add(u)
    }

    // Raw image URLs
    const rawRe = /https?:\/\/[^\s"'<>()]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^\s"'<>()]*)?/gi
    while ((m = rawRe.exec(markdown)) !== null) urls.add(m[0])

    const filtered = [...urls].filter(
      (u) => !SKIP_IMG_PATTERNS.some((p) => p.test(u)),
    )

    // Prefer higher-resolution URLs. Shopify CDN lets us force large sizes.
    const expanded = filtered.map((u) => {
      if (/cdn\.shopify\.com/.test(u) && !/width=/.test(u)) {
        return u.includes('?') ? `${u}&width=2048` : `${u}?width=2048`
      }
      return u
    })

    log(`  Found ${expanded.length} candidate image URLs`)
    return expanded
  } catch (err) {
    warn(`  Firecrawl error: ${(err as Error).message}`)
    return []
  }
}

// ─── Claude vision scoring ───

async function scoreCandidates(
  anthropic: Anthropic,
  product: Product,
  candidates: string[],
): Promise<ScoredCandidate[]> {
  if (candidates.length === 0) return []

  // Rank candidates by how many product-name tokens appear in the URL. On
  // pages that display multiple products (Yuba, Xtracycle, etc.) this avoids
  // picking a sibling model's image, and cheaply eliminates obvious junk.
  const tokens = productTokens(product)
  const ranked = rankByRelevance(candidates, tokens).slice(0, 10)
  const hitMap = new Map<string, number>()
  for (const url of ranked) hitMap.set(url, urlRelevance(url, tokens))
  const maxHits = Math.max(0, ...hitMap.values())

  if (FLAG_SKIP_SCORE) {
    return ranked.map((url, i) => ({
      url,
      score: 100 - i,
      visual: 100 - i,
      hits: hitMap.get(url) || 0,
      reason: 'skipped scoring',
    }))
  }

  const brandName = product.brand?.name || 'Unknown'
  const productLabel = `${brandName} ${product.name}`

  // Score in batches of 5 to keep prompts tight and avoid token spikes.
  const BATCH = 5
  const scored: ScoredCandidate[] = []

  for (let i = 0; i < ranked.length; i += BATCH) {
    const batch = ranked.slice(i, i + BATCH)

    const content: Anthropic.Messages.ContentBlockParam[] = [
      {
        type: 'text',
        text: `You are grading product-catalog photos for a SPECIFIC product:
  • Brand: ${brandName}
  • Model: ${product.name}
  • Slug:  ${product.slug}

Many manufacturer pages show multiple sibling products. You MUST check that each image actually depicts THIS model — the brand and model name you see should match "${productLabel}". If you see a different sibling model (wrong color, wrong frame geometry, wrong name visible on the frame or caption), you MUST score it 0–20 regardless of photo quality. Do NOT pick a good photo of the wrong product.

For images you are confident show THIS product, score 0-100:
  100 = ideal hero shot: clean white/neutral background, full model in frame, sharp, side or 3/4 view, no clutter, no watermark, no text overlay
  70-90 = usable but minor issues (slight background, off-angle, partial crop, people around it)
  40-60 = lifestyle/action shot where the model is clearly visible and identifiable
  0-30 = wrong product, wrong variant, unusable, logo, icon, detail closeup, or graphic

Return ONLY a JSON array matching the order of the images, no prose:
[{"score": 92, "reason": "clean side view on white, frame decals read '${product.name}'"}, ...]`,
      },
    ]

    for (const url of batch) {
      content.push({
        type: 'image',
        source: { type: 'url', url },
      })
    }

    try {
      const res = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content }],
      })

      const textBlock = res.content.find((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      const raw = textBlock?.text || '[]'
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        warn(`  Claude returned no JSON, batch ${i / BATCH + 1}`)
        batch.forEach((url) =>
          scored.push({
            url,
            score: 50,
            visual: 50,
            hits: hitMap.get(url) || 0,
            reason: 'no score',
          }),
        )
        continue
      }

      const parsed = JSON.parse(jsonMatch[0]) as Array<{ score?: number; reason?: string }>
      batch.forEach((url, idx) => {
        const entry = parsed[idx]
        const visual = typeof entry?.score === 'number' ? entry.score : 50
        scored.push({
          url,
          score: visual, // placeholder; combined below
          visual,
          hits: hitMap.get(url) || 0,
          reason: entry?.reason || '',
        })
      })
    } catch (err) {
      warn(`  Claude scoring failed: ${(err as Error).message}`)
      batch.forEach((url) =>
        scored.push({
          url,
          score: 40,
          visual: 40,
          hits: hitMap.get(url) || 0,
          reason: 'scoring error',
        }),
      )
    }
  }

  // Combine visual quality with URL-name relevance. When a page shows many
  // sibling products, Claude can't always read the frame decals, so a strong
  // URL token match is the decisive tiebreaker. If *no* URL contains any
  // product tokens (common on generic gallery pages), fall back to visual
  // score only so we don't demote every candidate.
  for (const c of scored) {
    if (maxHits > 0) {
      // +10 per hit, capped at 100. A lifestyle shot (visual 50) with 3 hits
      // beats a studio shot of the wrong model (visual 90) with 0 hits.
      c.score = Math.min(100, c.visual + c.hits * 12)
    }
  }

  return scored.sort((a, b) => b.score - a.score)
}

// ─── Image download ───

async function downloadImage(url: string, outPath: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        Accept: 'image/webp,image/png,image/*;q=0.8,*/*;q=0.5',
      },
      redirect: 'follow',
    })
    if (!res.ok) return false
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 5000) return false
    fs.writeFileSync(outPath, buf)
    return true
  } catch {
    return false
  }
}

// ─── Python helpers ───

function runPython(script: string, argv: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(VENV_PY, [path.join(PY_DIR, script), ...argv], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stderr = ''
    child.stdout.on('data', (d) => process.stdout.write(`    ${d}`))
    child.stderr.on('data', (d) => {
      stderr += d
      process.stderr.write(`    ${d}`)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${script} exited with code ${code}: ${stderr}`))
    })
  })
}

// ─── Main per-product flow ───

function resolveSourceUrl(product: Product): string | null {
  if (URL_OVERRIDES[product.slug]) return URL_OVERRIDES[product.slug]
  if (product.affiliateUrl) return product.affiliateUrl
  return null
}

function hasUsableImage(product: Product): boolean {
  const imgs = product.images || []
  if (imgs.length === 0) return false
  return imgs.some((entry) => typeof entry === 'object' && entry !== null && Boolean(entry.url))
}

async function generatePlaceholder(
  product: Product,
  tmp: string,
  token: string,
): Promise<void> {
  const outPath = path.join(tmp, `${product.slug}-placeholder.webp`)
  const pyArgs =
    product.brand?.name
      ? [product.name, product.brand.name, outPath]
      : [product.name, outPath]

  log(`  Generating placeholder`)
  await runPython('make-placeholder.py', pyArgs)

  if (FLAG_DRY_RUN) {
    log(`  [dry-run] would upload ${outPath}`)
    return
  }

  const label = product.brand?.name ? `${product.brand.name} ${product.name} — placeholder` : product.name
  const mediaId = await uploadMedia(outPath, label, token)
  await patchProduct(
    product.id,
    { images: [mediaId], _status: 'published' },
    token,
  )
  log(`  ✓ placeholder uploaded (media ${mediaId})`)
}

async function processProduct(
  product: Product,
  firecrawl: Firecrawl,
  anthropic: Anthropic,
  token: string,
): Promise<'uploaded' | 'placeholder' | 'skipped' | 'failed'> {
  const label = `${product.brand?.name || 'Unknown'} ${product.name}`
  section(label)

  if (!FLAG_FORCE && !FLAG_ONLY_MISSING && FLAG_PLACEHOLDER_ONLY === false) {
    // no-op: intentional, FORCE controls re-processing
  }

  if (FLAG_ONLY_MISSING && hasUsableImage(product)) {
    log('  Already has an image, skipping (--only-missing)')
    return 'skipped'
  }

  const tmp = path.join(TMP_DIR, product.slug)
  fs.mkdirSync(tmp, { recursive: true })

  // Placeholder-only short-circuit (fast branded placeholder pass)
  if (FLAG_PLACEHOLDER_ONLY) {
    try {
      await generatePlaceholder(product, tmp, token)
      return 'placeholder'
    } catch (err) {
      warn(`  Placeholder failed: ${(err as Error).message}`)
      return 'failed'
    }
  }

  const sourceUrl = resolveSourceUrl(product)
  if (!sourceUrl) {
    warn('  No source URL, generating placeholder')
    try {
      await generatePlaceholder(product, tmp, token)
      return 'placeholder'
    } catch (err) {
      warn(`  Placeholder failed: ${(err as Error).message}`)
      return 'failed'
    }
  }

  const candidates = await scrapeWithFirecrawl(firecrawl, sourceUrl)
  if (candidates.length === 0) {
    warn('  No candidates from Firecrawl, generating placeholder')
    try {
      await generatePlaceholder(product, tmp, token)
      return 'placeholder'
    } catch (err) {
      warn(`  Placeholder failed: ${(err as Error).message}`)
      return 'failed'
    }
  }

  const scored = await scoreCandidates(anthropic, product, candidates)
  if (scored.length) {
    const top = scored.slice(0, 3)
    log('  Top candidates:')
    top.forEach((c, i) =>
      log(
        `    ${i + 1}. score=${c.score} (visual=${c.visual} hits=${c.hits}) ${c.url.slice(0, 72)} — ${c.reason}`,
      ),
    )
  }

  // Walk the ranked list; first one that downloads + rembg cleanly wins.
  let rawPath: string | null = null
  let chosen: ScoredCandidate | null = null
  for (const cand of scored) {
    if (cand.score < 30) break
    const ext = cand.url.match(/\.(webp|jpg|jpeg|png|avif)/i)?.[1] || 'jpg'
    const candidatePath = path.join(tmp, `raw.${ext}`)
    log(`  Downloading candidate [${cand.score}]`)
    const ok = await downloadImage(cand.url, candidatePath)
    if (!ok) {
      log('    download failed, trying next')
      continue
    }
    rawPath = candidatePath
    chosen = cand
    break
  }

  if (!rawPath || !chosen) {
    warn('  All candidates failed, generating placeholder')
    try {
      await generatePlaceholder(product, tmp, token)
      return 'placeholder'
    } catch (err) {
      warn(`  Placeholder failed: ${(err as Error).message}`)
      return 'failed'
    }
  }

  const cutoutPath = path.join(tmp, 'cutout.png')
  try {
    log('  Removing background…')
    await runPython('remove-bg.py', [rawPath, cutoutPath])
  } catch (err) {
    warn(`  rembg failed: ${(err as Error).message}`)
    try {
      await generatePlaceholder(product, tmp, token)
      return 'placeholder'
    } catch (phErr) {
      warn(`  Placeholder failed: ${(phErr as Error).message}`)
      return 'failed'
    }
  }

  const stdPath = path.join(tmp, `${product.slug}-std.webp`)
  try {
    log('  Standardizing…')
    await runPython('standardize.py', [cutoutPath, stdPath])
  } catch (err) {
    warn(`  standardize failed: ${(err as Error).message}`)
    return 'failed'
  }

  if (FLAG_DRY_RUN) {
    log(`  [dry-run] would upload ${stdPath}`)
    return 'uploaded'
  }

  try {
    const mediaId = await uploadMedia(stdPath, `${label} — standardized`, token)
    await patchProduct(
      product.id,
      { images: [mediaId], _status: 'published' },
      token,
    )
    log(`  ✓ uploaded (media ${mediaId})`)
    return 'uploaded'
  } catch (err) {
    warn(`  Upload failed: ${(err as Error).message}`)
    return 'failed'
  }
}

// ─── Main ───

async function main() {
  log('=== Carryish image pipeline v2 ===')
  log(`URL: ${BASE_URL}`)
  log(`Mode: ${FLAG_DRY_RUN ? 'DRY RUN' : 'LIVE'}`)

  if (!fs.existsSync(VENV_PY)) {
    throw new Error(
      `Python venv not found at ${VENV_PY}. Run:\n` +
        `  python3 -m venv .venv-pipeline && .venv-pipeline/bin/pip install 'rembg[cpu]' Pillow requests`,
    )
  }
  if (!FIRECRAWL_KEY && !FLAG_PLACEHOLDER_ONLY) {
    throw new Error('FIRECRAWL_API_KEY not set (required unless --placeholder-only)')
  }
  if (!ANTHROPIC_KEY && !FLAG_SKIP_SCORE && !FLAG_PLACEHOLDER_ONLY) {
    throw new Error('ANTHROPIC_API_KEY not set (required unless --skip-score or --placeholder-only)')
  }

  fs.mkdirSync(TMP_DIR, { recursive: true })

  const firecrawl = FIRECRAWL_KEY ? new Firecrawl({ apiKey: FIRECRAWL_KEY }) : (null as unknown as Firecrawl)
  const anthropic = ANTHROPIC_KEY ? new Anthropic({ apiKey: ANTHROPIC_KEY }) : (null as unknown as Anthropic)

  const token = await login()
  let products = await fetchProducts(token)
  log(`Fetched ${products.length} products`)

  if (FLAG_LIMIT > 0) products = products.slice(0, FLAG_LIMIT)

  const counts = { uploaded: 0, placeholder: 0, skipped: 0, failed: 0 }
  for (const product of products) {
    try {
      const result = await processProduct(product, firecrawl, anthropic, token)
      counts[result] += 1
    } catch (err) {
      warn(`  Uncaught error: ${(err as Error).message}`)
      counts.failed += 1
    }
    // Gentle pacing for Firecrawl + Anthropic
    await new Promise((r) => setTimeout(r, 1500))
  }

  console.log('\n' + '═'.repeat(52))
  console.log(
    `  RESULTS: ${counts.uploaded} uploaded · ${counts.placeholder} placeholder · ${counts.skipped} skipped · ${counts.failed} failed`,
  )
  console.log('═'.repeat(52))

  if (!FLAG_KEEP_TMP && fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error('[pipeline] Fatal:', err)
  process.exit(1)
})

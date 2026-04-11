/**
 * Tern brand scrape — deliberate, high-quality pass for Tern bikes.
 *
 * Pipeline per model:
 *   1. Cache scrape HTML in scripts/brand-cache/tern/{slug}.html
 *   2. Firecrawl scrape (html + markdown)
 *   3. Pick hero image (og:image or first gallery img)
 *   4. Pick 2–3 lifestyle images (non-logo, non-icon content shots)
 *   5. Extract structured specs via Claude tool_use
 *   6. Process hero: download → rembg → standardize to 1600×1200 white → upload
 *   7. Process lifestyle: download → resize to max 1600w WebP → upload
 *   8. Upsert product:
 *      - UPDATE existing: specs + images + lifestyleImages, preserve editorial content
 *      - CREATE new: full payload with defaults, carryishTake, initial scores
 *   9. Log to scripts/brand-scrape-tern.log
 *
 * Also supports deleting the two duplicate Tern products (Gen 2/3) via --cleanup.
 *
 * Usage:
 *   PAYLOAD_URL=https://carryish.ai pnpm tsx scripts/brand-scrape-tern.ts
 *   PAYLOAD_URL=https://carryish.ai pnpm tsx scripts/brand-scrape-tern.ts --dry-run
 *   PAYLOAD_URL=https://carryish.ai pnpm tsx scripts/brand-scrape-tern.ts --product=tern-gsd-s10
 *   PAYLOAD_URL=https://carryish.ai pnpm tsx scripts/brand-scrape-tern.ts --skip-cleanup
 *   PAYLOAD_URL=https://carryish.ai pnpm tsx scripts/brand-scrape-tern.ts --skip-images
 *   PAYLOAD_URL=https://carryish.ai pnpm tsx scripts/brand-scrape-tern.ts --cleanup-only
 *   PAYLOAD_URL=https://carryish.ai pnpm tsx scripts/brand-scrape-tern.ts --force
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
const TMP_DIR = path.join(ROOT, '.tmp-pipeline/tern')
const CACHE_DIR = path.join(__dirname, 'brand-cache/tern')
const REVIEWS_DIR = path.join(ROOT, 'data/reviews')
const LOG_PATH = path.join(__dirname, 'brand-scrape-tern.log')
const PY_DIR = path.join(__dirname, 'python')
const VENV_PY = path.join(ROOT, '.venv-pipeline/bin/python')

const BASE_URL = process.env.PAYLOAD_URL || 'http://localhost:3000'
const EMAIL = process.env.PAYLOAD_EMAIL || 'demo-author@example.com'
const PASSWORD = process.env.PAYLOAD_PASSWORD || 'password'
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY || ''
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ''

const args = process.argv.slice(2)
const FLAG_DRY_RUN = args.includes('--dry-run')
const FLAG_SKIP_CLEANUP = args.includes('--skip-cleanup')
const FLAG_SKIP_IMAGES = args.includes('--skip-images')
const FLAG_CLEANUP_ONLY = args.includes('--cleanup-only')
const FLAG_FORCE = args.includes('--force')
const FLAG_PRODUCT = args.find((a) => a.startsWith('--product='))?.split('=')[1]

// ─── Tern model list ───

type TernFamily = 'gsd' | 'hsd' | 'quick-haul' | 'nbd' | 'orox' | 'short-haul'
type CargoLayout = 'longtail' | 'compact' | 'midtail' | 'front-box' | 'trike'

interface TernModel {
  slug: string
  name: string
  url: string
  family: TernFamily
  cargoLayout: CargoLayout
  foldable: boolean
  // Slug of the existing Payload product, if this entry should PATCH rather
  // than POST. New variants omit this and get created.
  existingSlug?: string
}

const TERN_MODELS: TernModel[] = [
  {
    slug: 'tern-gsd-s10',
    name: 'Tern GSD S10',
    url: 'https://www.ternbicycles.com/us/bikes/473/gsd-s10',
    family: 'gsd',
    cargoLayout: 'longtail',
    foldable: true,
    existingSlug: 'tern-gsd-s10',
  },
  {
    slug: 'tern-gsd-r14',
    name: 'Tern GSD R14',
    url: 'https://www.ternbicycles.com/us/bikes/473/gsd-r14',
    family: 'gsd',
    cargoLayout: 'longtail',
    foldable: true,
  },
  {
    slug: 'tern-gsd-p00',
    name: 'Tern GSD P00',
    url: 'https://www.ternbicycles.com/us/bikes/473/gsd-p00',
    family: 'gsd',
    cargoLayout: 'longtail',
    foldable: true,
  },
  {
    slug: 'tern-hsd-p5i',
    name: 'Tern HSD P5i',
    url: 'https://www.ternbicycles.com/us/bikes/472/hsd-p5i',
    family: 'hsd',
    cargoLayout: 'compact',
    foldable: false,
    existingSlug: 'tern-hsd-p5i',
  },
  {
    slug: 'tern-quick-haul-p9-sport',
    name: 'Tern Quick Haul P9 Sport',
    url: 'https://www.ternbicycles.com/us/bikes/471/quick-haul-p9-sport',
    family: 'quick-haul',
    cargoLayout: 'compact',
    foldable: true,
    // Update the existing 'tern-quick-haul' entry, rename to Quick Haul P9 Sport
    existingSlug: 'tern-quick-haul',
  },
  {
    slug: 'tern-quick-haul-long-d9',
    name: 'Tern Quick Haul Long D9',
    url: 'https://www.ternbicycles.com/us/bikes/471/quick-haul-long-d9',
    family: 'quick-haul',
    cargoLayout: 'midtail',
    foldable: true,
    existingSlug: 'tern-quick-haul-long-d9',
  },
  {
    slug: 'tern-nbd-p8i',
    name: 'Tern NBD P8i',
    url: 'https://www.ternbicycles.com/us/bikes/471/nbd-p8i',
    family: 'nbd',
    cargoLayout: 'longtail',
    foldable: false,
    existingSlug: 'tern-nbd',
  },
  {
    slug: 'tern-orox',
    name: 'Tern Orox',
    url: 'https://www.ternbicycles.com/us/bikes/471/orox',
    family: 'orox',
    cargoLayout: 'longtail',
    foldable: false,
    existingSlug: 'tern-orox',
  },
  {
    slug: 'tern-short-haul-d8',
    name: 'Tern Short Haul D8',
    url: 'https://www.ternbicycles.com/us/bikes/471/short-haul-d8',
    family: 'short-haul',
    cargoLayout: 'compact',
    foldable: false,
    existingSlug: 'tern-short-haul-d8',
  },
]

// Products to delete during the cleanup phase. The Gen 2/3 entries are
// superseded by the per-variant products above.
const CLEANUP_SLUGS = ['tern-gsd-gen-3', 'tern-hsd-gen-2']

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
  /sprite/i,
  /swatch/i,
  /flag/i,
]

// ─── Logging ───

let logBuffer: string[] = []

function log(msg: string) {
  const line = `[tern] ${msg}`
  console.log(line)
  logBuffer.push(line)
}
function warn(msg: string) {
  const line = `[tern] ⚠ ${msg}`
  console.warn(line)
  logBuffer.push(line)
}
function section(msg: string) {
  const line = `\n── ${msg} ──`
  console.log(line)
  logBuffer.push(line)
}
function flushLog() {
  try {
    const stamp = new Date().toISOString()
    fs.appendFileSync(LOG_PATH, `\n==== ${stamp} ====\n${logBuffer.join('\n')}\n`)
  } catch {
    // best-effort, ignore
  }
}

// ─── Types ───

interface MediaRef {
  id: number
  url?: string
  filename?: string
}

interface ExistingProduct {
  id: number
  name: string
  slug: string
  brand?: { id: number; name: string; slug: string } | null
  images?: Array<MediaRef | number>
  lifestyleImages?: Array<{ id?: string; image?: MediaRef | number }>
}

interface ExtractedSpecs {
  price?: number
  weightLbs?: number
  maxSystemWeightLbs?: number
  cargoCapacityLbs?: number
  motorBrand?: string
  motorTorqueNm?: number
  motorNominalWatts?: number
  batteryBrand?: string
  batteryWh?: number
  dualBatteryCapable?: boolean
  dualBatteryWh?: number
  statedRangeMi?: number
  drivetrainType?: 'chain' | 'belt'
  drivetrainBrand?: string
  gearType?: 'derailleur' | 'internal-hub' | 'cvp'
  numberOfGears?: number
  brakeBrand?: string
  frontWheelSize?: string
  rearWheelSize?: string
  suspensionType?: 'rigid' | 'front' | 'full' | 'seatpost'
  foldable?: boolean
  fitsInElevator?: boolean
  riderHeightMin?: string
  riderHeightMax?: string
  integratedLights?: boolean
  absAvailable?: boolean
  display?: string
  maxChildPassengers?: number
  childSeatCompatibility?: string
  hasFootboards?: boolean
  hasWheelGuards?: boolean
  rackSystem?: string
  warrantyYears?: number
  pressQuotes?: Array<{ quote: string; source: string; url?: string }>
}

interface Scores {
  hillScore: number
  cargoScore: number
  rangeScore: number
  valueScore: number
  familyScore: number
  overallScore: number
}

interface PerModelResult {
  slug: string
  name: string
  status: 'updated' | 'created' | 'skipped' | 'failed'
  price?: number
  hero: boolean
  lifestyle: number
}

// ─── Payload REST helpers ───

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

async function findBrandId(token: string, slug: string): Promise<number | null> {
  const res = await fetch(
    `${BASE_URL}/api/brands?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=0`,
    { headers: { Authorization: `JWT ${token}` } },
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.docs?.[0]?.id ?? null
}

async function findProductBySlug(
  token: string,
  slug: string,
): Promise<ExistingProduct | null> {
  const res = await fetch(
    `${BASE_URL}/api/products?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=1`,
    { headers: { Authorization: `JWT ${token}` } },
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.docs?.[0] ?? null
}

async function uploadMedia(
  filePath: string,
  alt: string,
  token: string,
): Promise<number> {
  const form = new FormData()
  const buf = fs.readFileSync(filePath)
  form.append('file', new Blob([buf], { type: 'image/webp' }), path.basename(filePath))
  form.append('alt', alt)

  const res = await fetch(`${BASE_URL}/api/media`, {
    method: 'POST',
    headers: { Authorization: `JWT ${token}` },
    body: form,
  })
  if (!res.ok) {
    throw new Error(
      `Upload failed (${res.status}): ${(await res.text()).slice(0, 200)}`,
    )
  }
  const data = await res.json()
  return data.doc.id
}

async function createProduct(
  body: Record<string, unknown>,
  token: string,
): Promise<number> {
  const res = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(
      `Create failed (${res.status}): ${(await res.text()).slice(0, 300)}`,
    )
  }
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
    throw new Error(
      `Patch failed (${res.status}): ${(await res.text()).slice(0, 300)}`,
    )
  }
}

async function deleteProduct(id: number, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/products/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `JWT ${token}` },
  })
  if (!res.ok) {
    throw new Error(
      `Delete product failed (${res.status}): ${(await res.text()).slice(0, 200)}`,
    )
  }
}

async function deleteMedia(id: number, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/media/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `JWT ${token}` },
  })
  if (!res.ok) {
    warn(`  Delete media ${id} failed (${res.status})`)
  }
}

// ─── Firecrawl scrape + cache ───

interface ScrapeResult {
  html: string
  markdown: string
}

async function scrapeWithCache(
  firecrawl: Firecrawl,
  model: TernModel,
): Promise<ScrapeResult> {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  const htmlPath = path.join(CACHE_DIR, `${model.slug}.html`)
  const mdPath = path.join(CACHE_DIR, `${model.slug}.md`)

  if (!FLAG_FORCE && fs.existsSync(htmlPath) && fs.existsSync(mdPath)) {
    log(`  Cache hit: ${model.slug}`)
    return {
      html: fs.readFileSync(htmlPath, 'utf-8'),
      markdown: fs.readFileSync(mdPath, 'utf-8'),
    }
  }

  log(`  Firecrawl: ${model.url}`)
  const result = await firecrawl.scrape(model.url, {
    formats: ['html', 'markdown'],
    waitFor: 3000,
    timeout: 45000,
  })

  const html: string = (result as { html?: string }).html || ''
  const markdown: string = (result as { markdown?: string }).markdown || ''

  if (html) fs.writeFileSync(htmlPath, html)
  if (markdown) fs.writeFileSync(mdPath, markdown)

  return { html, markdown }
}

// ─── Image extraction from HTML ───

function absoluteUrl(base: string, href: string): string {
  try {
    return new URL(href, base).toString()
  } catch {
    return href
  }
}

function extractOgImage(html: string, baseUrl: string): string | null {
  const match = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  )
  if (!match) return null
  return absoluteUrl(baseUrl, match[1])
}

/**
 * Drupal on ternbicycles.com generates thumbnails at
 *   /sites/default/files/styles/<style>/public/YYYY-MM/foo.jpg.webp?itok=…
 * The true original sits at
 *   /sites/default/files/YYYY-MM/foo.jpg
 * This rewrites any styled URL back to the original so we get a full-res
 * download instead of a 480×320 thumbnail.
 */
function rewriteDrupalStyle(url: string): string {
  let u = url
  // strip ?itok= query string
  u = u.replace(/\?itok=[^&]*(&|$)/, '$1').replace(/\?$/, '')
  // drop /styles/<style>/public/ from the path
  u = u.replace(/\/sites\/default\/files\/styles\/[^/]+\/public\//, '/sites/default/files/')
  // Drupal's webp derivative pattern: foo.jpg.webp → foo.jpg
  u = u.replace(/\.(jpe?g|png)\.webp$/i, '.$1')
  return u
}

function extractAllImages(html: string, baseUrl: string): string[] {
  const urls = new Set<string>()

  const push = (raw: string) => {
    urls.add(rewriteDrupalStyle(absoluteUrl(baseUrl, raw)))
  }

  // <a href="…"> — Tern gallery "click to open" links are usually full-res
  const aHrefRe = /<a[^>]+href=["']([^"']+\.(?:jpe?g|png|webp)(?:\.webp)?(?:\?[^"']*)?)["']/gi
  let m: RegExpExecArray | null
  while ((m = aHrefRe.exec(html)) !== null) push(m[1])

  // <img src="…">
  const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  while ((m = imgRe.exec(html)) !== null) push(m[1])

  // <img data-src="…">
  const dataSrcRe = /<img[^>]+data-src=["']([^"']+)["'][^>]*>/gi
  while ((m = dataSrcRe.exec(html)) !== null) push(m[1])

  // srcset — take the largest from each
  const srcsetRe = /srcset=["']([^"']+)["']/gi
  while ((m = srcsetRe.exec(html)) !== null) {
    const parts = m[1].split(',')
    const last = parts[parts.length - 1]?.trim().split(/\s+/)[0]
    if (last) push(last)
  }

  return [...urls].filter(
    (u) =>
      /^https?:/.test(u) &&
      !u.startsWith('data:') &&
      /\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(u) &&
      !SKIP_IMG_PATTERNS.some((p) => p.test(u)),
  )
}

interface ChosenImages {
  hero: string | null
  lifestyle: string[]
}

function chooseImages(html: string, baseUrl: string): ChosenImages {
  const ogImage = extractOgImage(html, baseUrl)
  const all = extractAllImages(html, baseUrl).map((u) => rewriteDrupalStyle(u))

  // Tern's product pages have a clean side-profile as the og:image.
  // Fall back to the first gallery image if og:image is missing.
  const hero = (ogImage ? rewriteDrupalStyle(ogImage) : null) || all[0] || null

  // Lifestyle candidates: dedupe by exact URL only. The Drupal rewrite
  // already collapses the same image across different thumbnail styles to
  // one canonical original URL. We want variety, so we don't collapse
  // different color variants — the editor can pick the ones they like.
  // Take up to 3.
  const seen = new Set<string>()
  if (hero) seen.add(hero)
  const lifestyle: string[] = []
  for (const url of all) {
    if (seen.has(url)) continue
    seen.add(url)
    lifestyle.push(url)
    if (lifestyle.length >= 3) break
  }

  return { hero, lifestyle }
}

// ─── Markdown spec-section extraction (lifted from enrich-specs.ts) ───

function extractSpecSections(markdown: string): string {
  const lines = markdown.split('\n')
  const specKeywords =
    /spec|motor|battery|weight|torque|watt|range|class|speed|brakes?|drivetrain|gears?|wheel|tire|frame|capacity|dimension|height|foldable|display|suspension|charge|voltage|amp|cargo|rider|warranty|fold|elevator|child|passenger|rack|abs|light|price|msrp|\$[0-9]|usd/i
  const boilerKeywords =
    /cookie|privacy|gdpr|analytics|tracking|consent|wishlist|newsletter|subscribe|footer|copyright|terms of service/i

  const specLines: number[] = []
  for (let i = 0; i < lines.length; i++) {
    if (specKeywords.test(lines[i]) && !boilerKeywords.test(lines[i])) {
      specLines.push(i)
    }
  }

  if (specLines.length === 0) return markdown.slice(-12000)

  const sections: string[] = []
  let lastEnd = -1
  for (const lineNum of specLines) {
    const start = Math.max(lineNum - 2, lastEnd + 1)
    const end = Math.min(lineNum + 5, lines.length - 1)
    if (start <= end) {
      sections.push(lines.slice(start, end + 1).join('\n'))
      lastEnd = end
    }
  }
  const result = sections.join('\n---\n')
  return result.length > 15000 ? result.slice(0, 15000) : result
}

// ─── Claude tool_use spec extraction ───

const EXTRACT_SPECS_TOOL = {
  name: 'record_tern_specs',
  description: 'Record the structured spec data extracted from a Tern bike page.',
  input_schema: {
    type: 'object' as const,
    properties: {
      price: { type: 'number', description: 'USD price, numeric only (starting MSRP)' },
      weightLbs: { type: 'number' },
      maxSystemWeightLbs: { type: 'number', description: 'Max Gross Vehicle Weight' },
      cargoCapacityLbs: { type: 'number', description: 'Rear rack weight limit' },
      motorBrand: { type: 'string' },
      motorTorqueNm: { type: 'number' },
      motorNominalWatts: { type: 'number' },
      batteryBrand: { type: 'string' },
      batteryWh: { type: 'number' },
      dualBatteryCapable: { type: 'boolean' },
      dualBatteryWh: { type: 'number' },
      statedRangeMi: { type: 'number', description: 'Convert km to miles if needed' },
      drivetrainType: { type: 'string', enum: ['chain', 'belt'] },
      drivetrainBrand: { type: 'string' },
      gearType: { type: 'string', enum: ['derailleur', 'internal-hub', 'cvp'] },
      numberOfGears: { type: 'number' },
      brakeBrand: { type: 'string' },
      frontWheelSize: { type: 'string' },
      rearWheelSize: { type: 'string' },
      suspensionType: {
        type: 'string',
        enum: ['rigid', 'front', 'full', 'seatpost'],
      },
      foldable: { type: 'boolean' },
      fitsInElevator: { type: 'boolean' },
      riderHeightMin: { type: 'string' },
      riderHeightMax: { type: 'string' },
      integratedLights: { type: 'boolean' },
      absAvailable: { type: 'boolean' },
      display: { type: 'string' },
      maxChildPassengers: { type: 'number' },
      childSeatCompatibility: { type: 'string' },
      hasFootboards: { type: 'boolean' },
      hasWheelGuards: { type: 'boolean' },
      rackSystem: { type: 'string' },
      warrantyYears: { type: 'number' },
      pressQuotes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            quote: { type: 'string' },
            source: { type: 'string' },
            url: { type: 'string' },
          },
          required: ['quote', 'source'],
        },
      },
    },
  },
} as const

/**
 * Claude occasionally returns placeholders like "<UNKNOWN>" or "N/A" for
 * fields it can't find, even when told to omit them. Coerce numeric fields,
 * drop placeholder strings, and keep only known keys.
 */
const NUMBER_KEYS: ReadonlyArray<keyof ExtractedSpecs> = [
  'price',
  'weightLbs',
  'maxSystemWeightLbs',
  'cargoCapacityLbs',
  'motorTorqueNm',
  'motorNominalWatts',
  'batteryWh',
  'dualBatteryWh',
  'statedRangeMi',
  'numberOfGears',
  'maxChildPassengers',
  'warrantyYears',
]
const STRING_KEYS: ReadonlyArray<keyof ExtractedSpecs> = [
  'motorBrand',
  'batteryBrand',
  'drivetrainBrand',
  'brakeBrand',
  'frontWheelSize',
  'rearWheelSize',
  'riderHeightMin',
  'riderHeightMax',
  'display',
  'childSeatCompatibility',
  'rackSystem',
]
const BOOL_KEYS: ReadonlyArray<keyof ExtractedSpecs> = [
  'dualBatteryCapable',
  'foldable',
  'fitsInElevator',
  'integratedLights',
  'absAvailable',
  'hasFootboards',
  'hasWheelGuards',
]
const PLACEHOLDER_RE = /^(unknown|n\/a|none|tbd|tba|varies|--|-)$/i

function isPlaceholder(v: unknown): boolean {
  if (v == null) return true
  if (typeof v !== 'string') return false
  const s = v.replace(/[<>]/g, '').trim()
  return s.length === 0 || PLACEHOLDER_RE.test(s)
}

function normalizeSpecs(raw: Record<string, unknown>): ExtractedSpecs {
  const out: ExtractedSpecs = {}
  for (const key of NUMBER_KEYS) {
    const v = raw[key]
    if (isPlaceholder(v)) continue
    if (typeof v === 'number' && Number.isFinite(v)) {
      ;(out as Record<string, unknown>)[key] = v
    } else if (typeof v === 'string') {
      const cleaned = v.replace(/[$,]/g, '').trim()
      const n = Number(cleaned)
      if (Number.isFinite(n)) (out as Record<string, unknown>)[key] = n
    }
  }
  for (const key of STRING_KEYS) {
    const v = raw[key]
    if (isPlaceholder(v)) continue
    if (typeof v === 'string' && v.trim().length > 0) {
      ;(out as Record<string, unknown>)[key] = v.trim()
    }
  }
  for (const key of BOOL_KEYS) {
    const v = raw[key]
    if (typeof v === 'boolean') (out as Record<string, unknown>)[key] = v
  }
  // enum-constrained strings
  if (raw.drivetrainType === 'chain' || raw.drivetrainType === 'belt') {
    out.drivetrainType = raw.drivetrainType
  }
  if (
    raw.gearType === 'derailleur' ||
    raw.gearType === 'internal-hub' ||
    raw.gearType === 'cvp'
  ) {
    out.gearType = raw.gearType
  }
  if (
    raw.suspensionType === 'rigid' ||
    raw.suspensionType === 'front' ||
    raw.suspensionType === 'full' ||
    raw.suspensionType === 'seatpost'
  ) {
    out.suspensionType = raw.suspensionType
  }
  // press quotes
  if (Array.isArray(raw.pressQuotes)) {
    const quotes: Array<{ quote: string; source: string; url?: string }> = []
    for (const q of raw.pressQuotes as unknown[]) {
      if (q && typeof q === 'object') {
        const qo = q as Record<string, unknown>
        if (typeof qo.quote === 'string' && typeof qo.source === 'string') {
          quotes.push({
            quote: qo.quote,
            source: qo.source,
            url: typeof qo.url === 'string' ? qo.url : undefined,
          })
        }
      }
    }
    if (quotes.length) out.pressQuotes = quotes
  }
  return out
}

async function extractSpecs(
  anthropic: Anthropic,
  model: TernModel,
  markdown: string,
): Promise<ExtractedSpecs> {
  const specContent = extractSpecSections(markdown)
  const prompt = `You are extracting specifications from a Tern bicycle product page.

Product: ${model.name}
URL: ${model.url}
Family: ${model.family}

PAGE CONTENT (spec-relevant sections from the manufacturer page):
${specContent}

Call the record_tern_specs tool with ONLY the fields you can confidently extract from the content. Omit any field you're uncertain about — do NOT guess. Convert metric units (kg → lbs, km → miles) when needed. If the page includes press quotes or testimonials from publications like Wirecutter, Bicycling, Cycling Weekly, Electric Bike Report, etc., include them in pressQuotes.`

  let retries = 0
  while (retries < 3) {
    try {
      const res = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        tools: [EXTRACT_SPECS_TOOL as unknown as Anthropic.Messages.Tool],
        tool_choice: { type: 'tool', name: 'record_tern_specs' },
        messages: [{ role: 'user', content: prompt }],
      })

      const toolUse = res.content.find(
        (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use',
      )
      if (!toolUse) {
        warn('  Claude returned no tool_use block')
        return {}
      }
      return normalizeSpecs(toolUse.input as Record<string, unknown>)
    } catch (err: unknown) {
      const errObj = err as { error?: { type?: string } }
      if (errObj?.error?.type === 'rate_limit_error' && retries < 2) {
        const wait = (retries + 1) * 30
        log(`  Rate limited, waiting ${wait}s…`)
        await new Promise((r) => setTimeout(r, wait * 1000))
        retries++
      } else {
        throw err
      }
    }
  }
  return {}
}

// ─── Carryish Take generation (new products only) ───

const TAKE_SYSTEM = `You are the editorial voice of Carryish, an independent cargo bike discovery platform. Your tone is warm, knowledgeable, and honest — like a friend who happens to know everything about cargo bikes.

Voice rules:
- Write like you're texting a smart friend, not writing marketing copy
- Have opinions. Name biases. Be specific with numbers and names.
- Never hedge with "it depends" unless it truly depends
- Contractions always. "It's" not "it is."
- Vary sentence length. Short sentences hit. Mix it up.
- Prices in USD, weights in lbs, distances in miles

KILL LIST — never use these words:
game-changer, revolutionize, seamless, cutting-edge, innovative, leverage, utilize, elevate, robust, holistic, synergy, best-in-class, unparalleled, empower, reimagine, curated, delve, landscape, navigate (metaphorical), ecosystem (non-nature), journey, solution, boasts, moreover, furthermore, comprehensive, nuanced, paradigm, facilitate, showcase, pivotal, garner, foster, underscore, realm, intricate, embark

BANNED phrases: "Whether you're looking for", "In today's fast-paced world", "Look no further", "Takes it to the next level", "A wide range of", "It's worth noting", "At the end of the day", "When it comes to", "Perfect for" (be more specific), "Let's dive in"

BANNED structures: "Not only X, but also Y", starting 3+ sentences the same way, rule of three abstract nouns, "It's not X — it's Y" negation-reframe, opening with rhetorical questions, present participle padding, bolded keyword + colon + restatement

Respond with ONLY the three paragraphs of the Carryish Take. No preamble, no headings, no meta commentary.`

async function generateCarryishTake(
  anthropic: Anthropic,
  model: TernModel,
  specs: ExtractedSpecs,
): Promise<string> {
  const specLines = [
    specs.price && `Starting MSRP: $${specs.price.toLocaleString()}`,
    specs.motorBrand &&
      `Motor: ${specs.motorBrand}${specs.motorTorqueNm ? ` (${specs.motorTorqueNm}Nm)` : ''}`,
    specs.batteryWh && `Battery: ${specs.batteryWh}Wh${specs.dualBatteryCapable ? ' (dual-capable)' : ''}`,
    specs.statedRangeMi && `Stated range: ${specs.statedRangeMi} mi`,
    specs.weightLbs && `Weight: ${specs.weightLbs} lbs`,
    specs.maxSystemWeightLbs && `Max system weight: ${specs.maxSystemWeightLbs} lbs`,
    specs.cargoCapacityLbs && `Rear rack capacity: ${specs.cargoCapacityLbs} lbs`,
    specs.drivetrainType && `Drivetrain: ${specs.drivetrainType}${specs.drivetrainBrand ? ` (${specs.drivetrainBrand})` : ''}`,
    specs.maxChildPassengers && `Max kids: ${specs.maxChildPassengers}`,
    specs.foldable && 'Foldable',
    specs.fitsInElevator && 'Fits in elevator',
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = `Write a Carryish Take for the ${model.name}.

Product family: ${model.family} (${model.cargoLayout})
URL: ${model.url}

Specs:
${specLines || '(sparse spec data)'}

Write exactly 3 paragraphs, 200–350 words total:
1. What this bike is and who it's for — lead with the personality
2. What it does well AND the real tradeoffs (weight, price, limitations)
3. The bottom line — is it worth the money? Who should buy it instead?

Respond with ONLY the three paragraphs, separated by blank lines. No headings, no meta commentary.`

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: TAKE_SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  })

  const textBlock = res.content.find(
    (b): b is Anthropic.Messages.TextBlock => b.type === 'text',
  )
  return textBlock?.text?.trim() || ''
}

// ─── Lexical richtext ───

interface LexicalRoot {
  root: {
    type: 'root'
    children: Array<{
      type: 'paragraph'
      children: Array<{ type: 'text'; text: string; version: number }>
      version: number
      direction: 'ltr'
      format: ''
      indent: 0
    }>
    direction: 'ltr'
    format: ''
    indent: 0
    version: 1
  }
}

function textToLexical(text: string): LexicalRoot {
  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean)

  return {
    root: {
      type: 'root',
      children: paragraphs.map((p) => ({
        type: 'paragraph' as const,
        children: [{ type: 'text' as const, text: p, version: 1 }],
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0 as const,
        version: 1,
      })),
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

// ─── Score heuristics ───

function scoreFromSpecs(specs: ExtractedSpecs): Scores {
  const torque = specs.motorTorqueNm || 0
  const hillScore = torque >= 80 ? 9 : torque >= 60 ? 7 : 5
  const cargoScore = Math.min(
    10,
    Math.max(4, Math.round((specs.cargoCapacityLbs || 80) / 40)),
  )
  const wh = specs.batteryWh || 0
  const rangeScore = wh >= 800 ? 9 : wh >= 500 ? 7 : 5
  const familyScore = (specs.maxChildPassengers || 0) >= 2 ? 9 : 6
  const valueScore = 7
  const overallScore = Math.round(
    (hillScore + cargoScore + rangeScore + familyScore + valueScore) / 5,
  )
  return { hillScore, cargoScore, rangeScore, valueScore, familyScore, overallScore }
}

// ─── Spec → Payload field mapping ───

function mapSpecsToPayload(specs: ExtractedSpecs): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (specs.price !== undefined) out.price = specs.price
  if (specs.weightLbs !== undefined) out.weightLbs = specs.weightLbs
  if (specs.maxSystemWeightLbs !== undefined)
    out.maxSystemWeightLbs = specs.maxSystemWeightLbs
  if (specs.cargoCapacityLbs !== undefined)
    out.cargoCapacityLbs = specs.cargoCapacityLbs
  if (specs.motorBrand) out.motorBrand = specs.motorBrand
  if (specs.motorTorqueNm !== undefined) out.motorTorqueNm = specs.motorTorqueNm
  if (specs.motorNominalWatts !== undefined)
    out.motorNominalWatts = specs.motorNominalWatts
  if (specs.batteryBrand) out.batteryBrand = specs.batteryBrand
  if (specs.batteryWh !== undefined) out.batteryWh = specs.batteryWh
  if (specs.dualBatteryCapable !== undefined)
    out.dualBatteryCapable = specs.dualBatteryCapable
  if (specs.dualBatteryWh !== undefined) out.dualBatteryWh = specs.dualBatteryWh
  if (specs.statedRangeMi !== undefined) out.statedRangeMi = specs.statedRangeMi
  if (specs.drivetrainType) out.drivetrainType = specs.drivetrainType
  if (specs.drivetrainBrand) out.drivetrainBrand = specs.drivetrainBrand
  if (specs.gearType) out.gearType = specs.gearType
  if (specs.numberOfGears !== undefined) out.numberOfGears = specs.numberOfGears
  if (specs.brakeBrand) out.brakeBrand = specs.brakeBrand
  if (specs.frontWheelSize) out.frontWheelSize = specs.frontWheelSize
  if (specs.rearWheelSize) out.rearWheelSize = specs.rearWheelSize
  if (specs.suspensionType) out.suspensionType = specs.suspensionType
  if (specs.foldable !== undefined) out.foldable = specs.foldable
  if (specs.fitsInElevator !== undefined) out.fitsInElevator = specs.fitsInElevator
  if (specs.riderHeightMin) out.riderHeightMin = specs.riderHeightMin
  if (specs.riderHeightMax) out.riderHeightMax = specs.riderHeightMax
  if (specs.integratedLights !== undefined)
    out.integratedLights = specs.integratedLights
  if (specs.absAvailable !== undefined) out.absAvailable = specs.absAvailable
  if (specs.display) out.display = specs.display
  if (specs.maxChildPassengers !== undefined)
    out.maxChildPassengers = specs.maxChildPassengers
  if (specs.childSeatCompatibility)
    out.childSeatCompatibility = specs.childSeatCompatibility
  if (specs.hasFootboards !== undefined) out.hasFootboards = specs.hasFootboards
  if (specs.hasWheelGuards !== undefined) out.hasWheelGuards = specs.hasWheelGuards
  if (specs.rackSystem) out.rackSystem = specs.rackSystem
  if (specs.warrantyYears !== undefined) out.warrantyYears = specs.warrantyYears
  return out
}

// ─── Fixed defaults per family ───

function familyDefaults(model: TernModel): Record<string, unknown> {
  const isElectric = model.family !== 'short-haul'
  const defaults: Record<string, unknown> = {
    category: 'cargo-bike',
    powerType: isElectric ? 'electric' : 'non-electric',
    brakeType: 'hydraulic-disc',
    cargoLayout: model.cargoLayout,
    foldable: model.foldable,
    fitsInElevator: model.family === 'gsd' || model.family === 'hsd',
  }
  if (isElectric) {
    defaults.bikeClass = 'class-1'
    defaults.topSpeedMph = 20
    defaults.motorPosition = 'mid-drive'
  }
  return defaults
}

// ─── Image processing ───

function runPython(script: string, argv: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(VENV_PY, [path.join(PY_DIR, script), ...argv], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => {
      stdout += d
      process.stdout.write(`    ${d}`)
    })
    child.stderr.on('data', (d) => {
      stderr += d
      process.stderr.write(`    ${d}`)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve(stdout)
      else reject(new Error(`${script} exited with code ${code}: ${stderr}`))
    })
  })
}

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

async function processHero(
  model: TernModel,
  url: string,
  tmp: string,
  token: string,
): Promise<number | null> {
  const ext = url.match(/\.(webp|jpg|jpeg|png|avif)/i)?.[1] || 'jpg'
  const rawPath = path.join(tmp, `hero-raw.${ext}`)

  log('  Downloading hero…')
  const ok = await downloadImage(url, rawPath)
  if (!ok) {
    warn('  Hero download failed')
    return null
  }

  const cutoutPath = path.join(tmp, 'hero-cutout.png')
  try {
    log('  Removing background…')
    await runPython('remove-bg.py', [rawPath, cutoutPath])
  } catch (err) {
    warn(`  rembg failed: ${(err as Error).message}`)
    return null
  }

  const stdPath = path.join(tmp, `${model.slug}-std.webp`)
  try {
    log('  Standardizing…')
    await runPython('standardize.py', [cutoutPath, stdPath])
  } catch (err) {
    warn(`  standardize failed: ${(err as Error).message}`)
    return null
  }

  if (FLAG_DRY_RUN) {
    log(`  [dry-run] would upload hero ${stdPath}`)
    return -1
  }
  try {
    const mediaId = await uploadMedia(
      stdPath,
      `${model.name} — standardized hero`,
      token,
    )
    log(`  ✓ hero uploaded (media ${mediaId})`)
    return mediaId
  } catch (err) {
    warn(`  Hero upload failed: ${(err as Error).message}`)
    return null
  }
}

async function processLifestyle(
  model: TernModel,
  urls: string[],
  tmp: string,
  token: string,
): Promise<number[]> {
  const mediaIds: number[] = []
  let idx = 0
  for (const url of urls) {
    idx++
    const ext = url.match(/\.(webp|jpg|jpeg|png|avif)/i)?.[1] || 'jpg'
    const rawPath = path.join(tmp, `life-${idx}.${ext}`)

    log(`  Downloading lifestyle ${idx}/${urls.length}…`)
    const ok = await downloadImage(url, rawPath)
    if (!ok) {
      warn('    download failed, skipping')
      continue
    }

    const outPath = path.join(tmp, `${model.slug}-life-${idx}.webp`)
    let pyOutput = ''
    try {
      pyOutput = await runPython('resize-lifestyle.py', [rawPath, outPath])
    } catch (err) {
      warn(`    resize failed: ${(err as Error).message}`)
      continue
    }
    // resize-lifestyle.py prints "ok WxH /path" — parse width and skip tiny ones
    const dimMatch = pyOutput.match(/ok\s+(\d+)x(\d+)/)
    if (dimMatch) {
      const w = parseInt(dimMatch[1], 10)
      const h = parseInt(dimMatch[2], 10)
      if (w < 800 && h < 800) {
        warn(`    too small (${w}x${h}), skipping lifestyle ${idx}`)
        continue
      }
    }

    if (FLAG_DRY_RUN) {
      log(`    [dry-run] would upload ${outPath}`)
      mediaIds.push(-1)
      continue
    }

    try {
      const alt = `${model.name} — lifestyle photo via ternbicycles.com`
      const mediaId = await uploadMedia(outPath, alt, token)
      log(`    ✓ uploaded (media ${mediaId})`)
      mediaIds.push(mediaId)
    } catch (err) {
      warn(`    upload failed: ${(err as Error).message}`)
    }
  }
  return mediaIds
}

// ─── Press quotes ───

function savePressQuotes(
  model: TernModel,
  quotes: ExtractedSpecs['pressQuotes'],
): void {
  if (!quotes || quotes.length === 0) return
  fs.mkdirSync(REVIEWS_DIR, { recursive: true })
  const outPath = path.join(REVIEWS_DIR, `${model.slug}.json`)
  fs.writeFileSync(outPath, JSON.stringify(quotes, null, 2))
  log(`  Saved ${quotes.length} press quote(s) → data/reviews/${model.slug}.json`)
}

// ─── Cleanup duplicates ───

async function cleanupDuplicates(token: string): Promise<void> {
  section('Cleanup: deleting duplicate Tern products')
  for (const slug of CLEANUP_SLUGS) {
    const existing = await findProductBySlug(token, slug)
    if (!existing) {
      log(`  ${slug}: not found, skipping`)
      continue
    }

    const mediaIds: number[] = []
    for (const img of existing.images || []) {
      if (typeof img === 'object' && img?.id) mediaIds.push(img.id)
    }

    if (FLAG_DRY_RUN) {
      log(
        `  [dry-run] would delete product ${existing.id} (${slug}) and ${mediaIds.length} media`,
      )
      continue
    }

    try {
      await deleteProduct(existing.id, token)
      log(`  ✓ deleted product ${existing.id} (${slug})`)
    } catch (err) {
      warn(`  ✗ delete ${slug}: ${(err as Error).message}`)
      continue
    }

    for (const mediaId of mediaIds) {
      await deleteMedia(mediaId, token)
    }
    if (mediaIds.length) log(`  ✓ deleted ${mediaIds.length} bound media`)
  }
}

// ─── Per-model processing ───

async function processModel(
  model: TernModel,
  firecrawl: Firecrawl,
  anthropic: Anthropic,
  token: string,
  brandId: number,
): Promise<PerModelResult> {
  section(model.name)

  const result: PerModelResult = {
    slug: model.slug,
    name: model.name,
    status: 'failed',
    hero: false,
    lifestyle: 0,
  }

  const tmp = path.join(TMP_DIR, model.slug)
  fs.mkdirSync(tmp, { recursive: true })

  // Scrape (cached)
  let scrape: ScrapeResult
  try {
    scrape = await scrapeWithCache(firecrawl, model)
  } catch (err) {
    warn(`  Scrape failed: ${(err as Error).message}`)
    return result
  }
  if (!scrape.html && !scrape.markdown) {
    warn('  Empty scrape')
    return result
  }

  // Pick images from HTML
  const { hero: heroUrl, lifestyle: lifestyleUrls } = chooseImages(
    scrape.html,
    model.url,
  )
  if (heroUrl) log(`  Hero: ${heroUrl.slice(0, 80)}`)
  log(`  Lifestyle candidates: ${lifestyleUrls.length}`)

  // Extract specs via Claude tool_use
  log('  Extracting specs (Claude)…')
  let specs: ExtractedSpecs = {}
  try {
    specs = await extractSpecs(anthropic, model, scrape.markdown)
    log(`  Got ${Object.keys(specs).length} spec fields`)
  } catch (err) {
    warn(`  Spec extraction failed: ${(err as Error).message}`)
  }

  if (specs.pressQuotes?.length) {
    savePressQuotes(model, specs.pressQuotes)
  }

  result.price = specs.price

  // Process hero image
  let heroMediaId: number | null = null
  if (!FLAG_SKIP_IMAGES && heroUrl) {
    heroMediaId = await processHero(model, heroUrl, tmp, token)
    result.hero = heroMediaId !== null
  } else if (FLAG_SKIP_IMAGES) {
    log('  [--skip-images] hero skipped')
  }

  // Process lifestyle images
  let lifestyleMediaIds: number[] = []
  if (!FLAG_SKIP_IMAGES && lifestyleUrls.length > 0) {
    lifestyleMediaIds = await processLifestyle(model, lifestyleUrls, tmp, token)
    // In dry-run we want the summary to reflect "how many would have shipped"
    // not "how many were actually uploaded" (which is always 0 in dry-run).
    result.lifestyle = FLAG_DRY_RUN
      ? lifestyleUrls.length
      : lifestyleMediaIds.filter((id) => id > 0).length
  }

  // Look up existing product
  const existingSlug = model.existingSlug ?? model.slug
  const existing = await findProductBySlug(token, existingSlug)

  const specUpdates = mapSpecsToPayload(specs)
  const defaults = familyDefaults(model)

  if (existing) {
    // UPDATE: merge specs + defaults + new hero image + lifestyle.
    // Do NOT overwrite editorial content (carryishTake, pros, cons, verdict,
    // scores, bestFor, notFor, faq, tagline, oneLiner, comparisonContext).
    const body: Record<string, unknown> = {
      ...defaults,
      ...specUpdates,
      name: model.name,
      slug: model.slug,
      affiliateUrl: model.url,
      brand: brandId,
      _status: 'published',
    }

    if (heroMediaId && heroMediaId > 0) {
      body.images = [heroMediaId]
      body.imageStatus = 'editorial'
    }

    const validLifestyle = lifestyleMediaIds.filter((id) => id > 0)
    if (validLifestyle.length > 0) {
      body.lifestyleImages = validLifestyle.map((id) => ({
        image: id,
        context: 'lifestyle',
      }))
    }

    if (FLAG_DRY_RUN) {
      log(`  [dry-run] would PATCH product ${existing.id} with ${Object.keys(body).length} fields`)
      result.status = 'updated'
      return result
    }

    try {
      await patchProduct(existing.id, body, token)
      log(`  ✓ updated product ${existing.id}`)
      result.status = 'updated'
    } catch (err) {
      warn(`  Patch failed: ${(err as Error).message}`)
    }
    return result
  }

  // CREATE: new variant, needs full payload including editorial defaults
  log('  No existing product, CREATE path')

  let takeRichText: LexicalRoot | null = null
  try {
    log('  Generating Carryish Take…')
    const takeText = await generateCarryishTake(anthropic, model, specs)
    if (takeText) takeRichText = textToLexical(takeText)
  } catch (err) {
    warn(`  Take generation failed: ${(err as Error).message}`)
  }

  const scores = scoreFromSpecs(specs)

  const body: Record<string, unknown> = {
    name: model.name,
    slug: model.slug,
    brand: brandId,
    affiliateUrl: model.url,
    testingStatus: 'specs-only',
    ...defaults,
    ...specUpdates,
    ...scores,
    _status: 'published',
  }

  if (takeRichText) body.carryishTake = takeRichText

  if (heroMediaId && heroMediaId > 0) {
    body.images = [heroMediaId]
    body.imageStatus = 'editorial'
  }

  const validLifestyle = lifestyleMediaIds.filter((id) => id > 0)
  if (validLifestyle.length > 0) {
    body.lifestyleImages = validLifestyle.map((id) => ({
      image: id,
      context: 'lifestyle',
    }))
  }

  if (FLAG_DRY_RUN) {
    log(`  [dry-run] would CREATE product with ${Object.keys(body).length} fields`)
    result.status = 'created'
    return result
  }

  try {
    const newId = await createProduct(body, token)
    log(`  ✓ created product ${newId}`)
    result.status = 'created'
  } catch (err) {
    warn(`  Create failed: ${(err as Error).message}`)
  }
  return result
}

// ─── Summary ───

function printSummary(results: PerModelResult[], deleted: string[]): void {
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16)
  console.log('\n' + '═'.repeat(72))
  console.log(`  Tern brand scrape — ${stamp}`)
  console.log('─'.repeat(72))
  console.log(
    `  ${'Product'.padEnd(24)} | ${'Slug'.padEnd(26)} | ${'Price'.padEnd(7)} | Hero | Life | Status`,
  )
  console.log('─'.repeat(72))
  for (const r of results) {
    const price =
      typeof r.price === 'number' && Number.isFinite(r.price)
        ? `$${r.price.toLocaleString()}`
        : '—'
    console.log(
      `  ${r.name.padEnd(24)} | ${r.slug.padEnd(26)} | ${price.padEnd(7)} |  ${r.hero ? '✓' : '✗'}   |  ${r.lifestyle}   | ${r.status}`,
    )
  }
  if (deleted.length) {
    console.log('─'.repeat(72))
    console.log(`  Deleted: ${deleted.join(', ')}`)
  }
  console.log('═'.repeat(72))
}

// ─── Main ───

async function main() {
  log('=== Tern brand scrape ===')
  log(`URL: ${BASE_URL}`)
  log(`Mode: ${FLAG_DRY_RUN ? 'DRY RUN' : 'LIVE'}`)

  if (!FLAG_SKIP_IMAGES && !fs.existsSync(VENV_PY)) {
    throw new Error(
      `Python venv not found at ${VENV_PY}. Run:\n` +
        `  python3 -m venv .venv-pipeline && .venv-pipeline/bin/pip install 'rembg[cpu]' Pillow requests`,
    )
  }
  if (!FIRECRAWL_KEY && !FLAG_CLEANUP_ONLY) {
    throw new Error('FIRECRAWL_API_KEY not set (required unless --cleanup-only)')
  }
  if (!ANTHROPIC_KEY && !FLAG_CLEANUP_ONLY) {
    throw new Error('ANTHROPIC_API_KEY not set (required unless --cleanup-only)')
  }

  fs.mkdirSync(TMP_DIR, { recursive: true })

  const firecrawl =
    FIRECRAWL_KEY && !FLAG_CLEANUP_ONLY
      ? new Firecrawl({ apiKey: FIRECRAWL_KEY })
      : (null as unknown as Firecrawl)
  const anthropic =
    ANTHROPIC_KEY && !FLAG_CLEANUP_ONLY
      ? new Anthropic({ apiKey: ANTHROPIC_KEY })
      : (null as unknown as Anthropic)

  const token = await login()

  // Cleanup phase
  const deleted: string[] = []
  if (!FLAG_SKIP_CLEANUP) {
    await cleanupDuplicates(token)
    // Track which ones got removed for the summary. In dry-run just list them.
    for (const slug of CLEANUP_SLUGS) {
      const still = await findProductBySlug(token, slug)
      if (!still || FLAG_DRY_RUN) deleted.push(slug)
    }
  }

  if (FLAG_CLEANUP_ONLY) {
    log('Cleanup-only mode, exiting')
    printSummary([], deleted)
    flushLog()
    return
  }

  // Resolve Tern brand id (hardcoded fallback to 1 if lookup fails)
  let brandId = await findBrandId(token, 'tern')
  if (!brandId) {
    warn('Tern brand not found via slug lookup, falling back to id=1')
    brandId = 1
  }
  log(`Tern brand id = ${brandId}`)

  // Select models to process
  const models = FLAG_PRODUCT
    ? TERN_MODELS.filter((m) => m.slug === FLAG_PRODUCT || m.existingSlug === FLAG_PRODUCT)
    : TERN_MODELS

  if (FLAG_PRODUCT && models.length === 0) {
    throw new Error(`No Tern model matching --product=${FLAG_PRODUCT}`)
  }

  const results: PerModelResult[] = []
  for (const model of models) {
    try {
      const r = await processModel(model, firecrawl, anthropic, token, brandId)
      results.push(r)
    } catch (err) {
      warn(`Uncaught error on ${model.slug}: ${(err as Error).message}`)
      results.push({
        slug: model.slug,
        name: model.name,
        status: 'failed',
        hero: false,
        lifestyle: 0,
      })
    }
    // Polite delay between models
    await new Promise((r) => setTimeout(r, 2000))
  }

  printSummary(results, deleted)
  flushLog()
}

main().catch((err) => {
  console.error('[tern] Fatal:', err)
  flushLog()
  process.exit(1)
})

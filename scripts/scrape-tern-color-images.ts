/**
 * Scrape per-color Tern product images and upload to Payload media.
 *
 * Source: cached HTML in scripts/brand-cache/tern/{slug}.html
 * Pipeline per color:
 *   1. Download profile JPG (and angle JPG if available) from Tern CDN
 *   2. Process with sharp: 1600×1067 WebP on Canvas #FAFAF8 background
 *   3. Upload to Payload media via local API
 *   4. Update product.colorOptions with real {name, hex, heroImage, angleImage}
 *
 * Products with real per-color URLs (curated from cached HTML):
 *   tern-gsd-s10 — beetle, pearl, schoolbus
 *   tern-gsd-r14 — iron_grey only (Tern's R14 is single-color)
 *   tern-gsd-p00 — schoolbus only (papaya has no profile shot)
 *   tern-hsd-p5i — dragonfruit, seabreeze
 *   tern-nbd-p8i — silver_blue, red
 *   tern-quick-haul-long-d9 — black, ice_grey, traffic_red
 *   tern-quick-haul-p9-sport — blue_gray, merlot
 *   tern-short-haul-d8 — black, burnt_orange
 *   tern-orox — SKIP (no color profile URLs in cache)
 *
 * Usage:
 *   pnpm tsx scripts/scrape-tern-color-images.ts --dry-run
 *   pnpm tsx scripts/scrape-tern-color-images.ts
 *   pnpm tsx scripts/scrape-tern-color-images.ts --product=tern-gsd-s10
 *   pnpm tsx scripts/scrape-tern-color-images.ts --force   # re-download cached JPGs
 */
import 'dotenv/config'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

// Load Blob token from .env.vercel (media uploads need it in production)
dotenv.config({ path: '.env.vercel', override: false })

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const TMP_DIR = path.join(ROOT, '.tmp-pipeline/tern-colors')

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FORCE = args.includes('--force')
const PRODUCT_FILTER = args.find((a) => a.startsWith('--product='))?.split('=')[1]

// ─── Color metadata: slug → display name + hex ───
const COLOR_META: Record<string, { name: string; hex: string }> = {
  beetle: { name: 'Beetle Green', hex: '#4a6741' },
  pearl: { name: 'Pearl White', hex: '#e8e4dc' },
  schoolbus: { name: 'Schoolbus Yellow', hex: '#d4a832' },
  iron_grey: { name: 'Iron Grey', hex: '#4a4c52' },
  dragonfruit: { name: 'Dragonfruit', hex: '#c93058' },
  seabreeze: { name: 'Seabreeze', hex: '#8ba5b5' },
  silver_blue: { name: 'Silver Blue', hex: '#8ba5b5' },
  red: { name: 'Red', hex: '#c62828' },
  black: { name: 'Matte Black', hex: '#2a2a2a' },
  ice_grey: { name: 'Ice Grey', hex: '#d8d4c8' },
  traffic_red: { name: 'Traffic Red', hex: '#c62828' },
  blue_gray: { name: 'Blue Gray', hex: '#7a8795' },
  merlot: { name: 'Merlot', hex: '#6e2c3c' },
  burnt_orange: { name: 'Burnt Orange', hex: '#c45a2e' },
}

// ─── Scrape plan: known URLs curated from cached HTML ───
type ColorPlan = {
  colorSlug: string
  profileUrl: string
  angleUrl?: string
}

const BASE = 'https://www.ternbicycles.com/sites/default/files'

const SCRAPE_PLAN: Record<string, ColorPlan[]> = {
  'tern-gsd-s10': [
    {
      colorSlug: 'beetle',
      profileUrl: `${BASE}/2025-02/TN-photo-GSD_S10-gen3-beetle-profile-web_0.jpg`,
      angleUrl: `${BASE}/2025-03/TN-photo-GSD_S10-gen3-beetle-f34.jpg`,
    },
    {
      colorSlug: 'pearl',
      profileUrl: `${BASE}/2025-02/TN-photo-GSD_S10-gen3-pearl-profile-web.jpg`,
    },
    {
      colorSlug: 'schoolbus',
      profileUrl: `${BASE}/2025-02/TN-photo-GSD_S10-gen3-schoolbus-profile-web.jpg`,
      angleUrl: `${BASE}/2025-03/TN-photo-GSD_S10-gen3-schoolbus-f34.jpg`,
    },
  ],
  'tern-gsd-r14': [
    {
      colorSlug: 'iron_grey',
      profileUrl: `${BASE}/2025-02/TN-photo-GSD_R14-gen3-iron_grey-profile-web.jpg`,
      angleUrl: `${BASE}/2025-02/TN-photo-GSD_R14-gen3-iron_grey-fold-web.jpg`,
    },
  ],
  'tern-gsd-p00': [
    {
      colorSlug: 'schoolbus',
      // Drupal generated an ugly filename with spaces; URL-encode them
      profileUrl: `${BASE}/2026-01/TN-photo-GSD_P00-gen3-schoolbus-profile.jpg%20-%20Tern-web.jpg`,
    },
  ],
  'tern-hsd-p5i': [
    {
      colorSlug: 'dragonfruit',
      profileUrl: `${BASE}/2023-06/TN-photo-HSD_P5i-gen2-dragonfruit-web.jpg`,
    },
    {
      colorSlug: 'seabreeze',
      profileUrl: `${BASE}/2023-05/TN-photo-HSD_P5i-gen2-seabreeze-web.jpg`,
      angleUrl: `${BASE}/2023-05/TN-photo-HSD_P5i-gen2-fold-seabreeze-web.jpg`,
    },
  ],
  'tern-nbd-p8i': [
    {
      colorSlug: 'silver_blue',
      profileUrl: `${BASE}/2022-06/TN-photo-NBD_P8i-silver_blue-web.jpg`,
      angleUrl: `${BASE}/2022-06/TN-photo-NBD_P8i-fold-silver_blue-v04-web.jpg`,
    },
    {
      colorSlug: 'red',
      profileUrl: `${BASE}/2022-06/TN-photo-NBD_P8i-red-web.jpg`,
      angleUrl: `${BASE}/2022-06/TN-photo-NBD_P8i-vert-red-v03-web.jpg`,
    },
  ],
  'tern-quick-haul-long-d9': [
    {
      colorSlug: 'black',
      profileUrl: `${BASE}/2024-06/TN-photo-QuickHaulLong-D9-gen1-LR-profile-black-web.jpg`,
    },
    {
      colorSlug: 'ice_grey',
      profileUrl: `${BASE}/2024-06/TN-photo-QuickHaulLong-D9-gen1-LR-profile-ice_grey-web.jpg`,
    },
    {
      colorSlug: 'traffic_red',
      profileUrl: `${BASE}/2024-06/TN-photo-QuickHaulLong-D9-gen1-LR-profile-traffic_red-web.jpg`,
      angleUrl: `${BASE}/2024-06/TN-photo-QuickHaulLong-D9-gen1-LR-vert-traffic_red-web.jpg`,
    },
  ],
  'tern-quick-haul-p9-sport': [
    {
      colorSlug: 'blue_gray',
      profileUrl: `${BASE}/2022-02/TN-photo-QuickHaul_P9-blue_gray-v02.jpg`,
    },
    {
      colorSlug: 'merlot',
      profileUrl: `${BASE}/2022-02/TN-photo-QuickHaul_P9-merlot-v02-web.jpg`,
    },
  ],
  'tern-short-haul-d8': [
    {
      colorSlug: 'black',
      profileUrl: `${BASE}/2022-04/TN-photo-ShortHaul_D8-black-web.jpg`,
    },
    {
      colorSlug: 'burnt_orange',
      profileUrl: `${BASE}/2022-04/TN-photo-ShortHaul_D8-burnt_orange-v02-web.jpg`,
      angleUrl: `${BASE}/2022-04/TN-photo-ShortHaul_D8-vert-burnt_orange-v02-web.jpg`,
    },
  ],
}

// ─── Helpers ───

function log(msg: string) {
  console.log(`[color-scrape] ${msg}`)
}

async function downloadWithCache(url: string, filename: string): Promise<Buffer> {
  fs.mkdirSync(TMP_DIR, { recursive: true })
  const cachePath = path.join(TMP_DIR, filename)

  if (!FORCE && fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath)
  }

  log(`  download: ${url}`)
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
      Accept: 'image/jpeg,image/webp,image/png,*/*;q=0.8',
      Referer: 'https://www.ternbicycles.com/',
    },
  })
  if (!res.ok) throw new Error(`Download failed ${res.status} ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(cachePath, buf)
  return buf
}

/** Process raw JPG to 1600×1067 WebP on Canvas background. */
async function processToCanvas(input: Buffer): Promise<Buffer> {
  return await sharp(input)
    .resize({
      width: 1600,
      height: 1067,
      fit: 'contain',
      background: { r: 250, g: 250, b: 248 }, // #FAFAF8
    })
    .webp({ quality: 90 })
    .toBuffer()
}

type PayloadLike = Awaited<ReturnType<typeof getPayload>>

async function uploadMedia(
  payload: PayloadLike,
  buffer: Buffer,
  filename: string,
  alt: string,
): Promise<number> {
  const doc = await payload.create({
    collection: 'media',
    data: { alt } as any,
    file: {
      data: buffer,
      mimetype: 'image/webp',
      name: filename,
      size: buffer.length,
    },
    overrideAccess: true,
  })
  return doc.id as number
}

// ─── Main ───

async function main() {
  console.log(`\n→ Tern per-color image scrape — mode=${DRY_RUN ? 'DRY' : 'WRITE'}`)
  if (PRODUCT_FILTER) console.log(`  filter: ${PRODUCT_FILTER}`)
  if (FORCE) console.log(`  force: re-download cached JPGs`)
  console.log()

  if (!process.env.BLOB_READ_WRITE_TOKEN && !DRY_RUN) {
    console.log('⚠ BLOB_READ_WRITE_TOKEN not set. Load from .env.vercel:')
    console.log('    export $(grep BLOB_READ_WRITE_TOKEN .env.vercel | xargs)')
    console.log('  Continuing anyway — local uploads may fail.\n')
  }

  const payload = await getPayload({ config: configPromise })

  const slugs = PRODUCT_FILTER
    ? Object.keys(SCRAPE_PLAN).filter((s) => s === PRODUCT_FILTER)
    : Object.keys(SCRAPE_PLAN)

  if (slugs.length === 0) {
    console.log(`⚠ No plan entries match filter ${PRODUCT_FILTER}`)
    process.exit(0)
  }

  type Summary = {
    slug: string
    colors: number
    profileOk: number
    angleOk: number
    status: 'ok' | 'partial' | 'failed' | 'dry'
    error?: string
  }
  const summary: Summary[] = []

  for (const slug of slugs) {
    const plan = SCRAPE_PLAN[slug]
    console.log(`── ${slug} (${plan.length} color${plan.length === 1 ? '' : 's'}) ──`)

    const res = await payload.find({
      collection: 'products',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      draft: false,
    })
    const product = res.docs[0]
    if (!product) {
      console.log('  ✗ product not found')
      summary.push({ slug, colors: plan.length, profileOk: 0, angleOk: 0, status: 'failed', error: 'not found' })
      continue
    }

    const newColorOptions: Array<{
      colorName: string
      colorHex: string
      heroImage?: number
      angleImage?: number
    }> = []

    let profileOk = 0
    let angleOk = 0
    let partial = false

    for (const entry of plan) {
      const meta = COLOR_META[entry.colorSlug]
      if (!meta) {
        console.log(`  ⚠ no meta for color slug '${entry.colorSlug}'`)
        partial = true
        continue
      }
      console.log(`  • ${meta.name} (${entry.colorSlug})`)

      let heroMediaId: number | undefined
      let angleMediaId: number | undefined

      // Profile (hero)
      try {
        // Use decoded filename for cache (filesystem-safe), pass raw URL to fetch
        const srcName = decodeURIComponent(path.basename(entry.profileUrl.split('?')[0]))
          .replace(/\s+/g, '_')
        const buf = await downloadWithCache(entry.profileUrl, srcName)
        const processed = await processToCanvas(buf)
        const outName = `${slug}-${entry.colorSlug}-hero.webp`
        if (DRY_RUN) {
          console.log(`    profile: ${processed.length} bytes [dry]`)
        } else {
          heroMediaId = await uploadMedia(
            payload,
            processed,
            outName,
            `${product.name} — ${meta.name}`,
          )
          console.log(`    profile: media ${heroMediaId}`)
        }
        profileOk++
      } catch (err: any) {
        console.log(`    ✗ profile: ${err.message}`)
        partial = true
      }

      // Angle (optional)
      if (entry.angleUrl) {
        try {
          const srcName = decodeURIComponent(path.basename(entry.angleUrl.split('?')[0]))
            .replace(/\s+/g, '_')
          const buf = await downloadWithCache(entry.angleUrl, srcName)
          const processed = await processToCanvas(buf)
          const outName = `${slug}-${entry.colorSlug}-angle.webp`
          if (DRY_RUN) {
            console.log(`    angle:   ${processed.length} bytes [dry]`)
          } else {
            angleMediaId = await uploadMedia(
              payload,
              processed,
              outName,
              `${product.name} — ${meta.name} (angle)`,
            )
            console.log(`    angle:   media ${angleMediaId}`)
          }
          angleOk++
        } catch (err: any) {
          console.log(`    ⚠ angle: ${err.message}`)
        }
      }

      newColorOptions.push({
        colorName: meta.name,
        colorHex: meta.hex,
        ...(heroMediaId ? { heroImage: heroMediaId } : {}),
        ...(angleMediaId ? { angleImage: angleMediaId } : {}),
      })
    }

    if (DRY_RUN) {
      console.log(`  [dry] would set colorOptions:`)
      for (const c of newColorOptions) {
        console.log(`    - ${c.colorName} ${c.colorHex}`)
      }
      summary.push({ slug, colors: plan.length, profileOk, angleOk, status: 'dry' })
      continue
    }

    try {
      await payload.update({
        collection: 'products',
        id: product.id,
        data: { colorOptions: newColorOptions } as any,
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      console.log(`  ✓ colorOptions updated (${newColorOptions.length} colors)`)
      summary.push({
        slug,
        colors: plan.length,
        profileOk,
        angleOk,
        status: partial ? 'partial' : 'ok',
      })
    } catch (err: any) {
      console.log(`  ✗ update failed: ${err.message || err}`)
      summary.push({
        slug,
        colors: plan.length,
        profileOk,
        angleOk,
        status: 'failed',
        error: err.message || String(err),
      })
    }
  }

  console.log('\n── summary ──')
  for (const row of summary) {
    const status = row.status.padEnd(8)
    console.log(
      `  ${status} ${row.slug.padEnd(26)} profile=${row.profileOk}/${row.colors} angle=${row.angleOk}${row.error ? `  err=${row.error}` : ''}`,
    )
  }
  console.log()

  process.exit(0)
}

main().catch((e) => {
  console.error('fatal', e)
  process.exit(1)
})

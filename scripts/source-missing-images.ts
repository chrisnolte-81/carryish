/**
 * One-shot script: download, validate, optimize, and upload product images
 * for all products that need them.
 *
 * Usage: PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/source-missing-images.ts
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TMP_DIR = path.join(__dirname, '../.tmp-source')
const BASE_URL = process.env.PAYLOAD_URL || 'http://localhost:3000'
const EMAIL = process.env.PAYLOAD_EMAIL || 'demo-author@example.com'
const PASSWORD = process.env.PAYLOAD_PASSWORD || 'password'

const anthropic = new Anthropic()

// ─── Image sources (from manufacturer sites) ───

const IMAGE_SOURCES: Record<
  string,
  { urls: string[]; note?: string }
> = {
  'trek-fetch-plus-4': {
    urls: [
      'https://www.sefiles.net/images/library/zoom/trek-fetch-4-427660-1.jpeg',
      'https://www.sefiles.net/images/library/large/trek-fetch+-4-427660-1.png',
    ],
    note: 'Official Trek product photography via authorized retailer',
  },
  'specialized-globe-haul-lt': {
    urls: [
      'https://assets.specialized.com/i/specialized/91022-90_HAUL-LT-WHTMTN_HERO?fmt=jpg&wid=2000',
      'https://assets.specialized.com/i/specialized/91022-90_HAUL-LT-WHTMTN_FDSQ?fmt=jpg&wid=2000',
    ],
    note: 'Specialized CDN with configurable dimensions',
  },
  'benno-boost-e-10d': {
    urls: [
      'https://bennobikes.com/wp-content/uploads/benno_boost_10d_cx_speed_anthracite_gray_easy_on_evo5-1.jpg',
    ],
    note: 'Direct from bennobikes.com',
  },
  'riese-muller-load-75': {
    urls: [
      'https://cdn.shopify.com/s/files/1/0612/4905/products/Riese_and_Muller_Load_75_Touring_eMTB_full_suspension_coal_grey_profile_on_Fly_Rides.jpg?v=1657548293',
      'https://propelbikes.com/wp-content/uploads/1990/08/riese-muller-load75-vario-coal-grey-matt-jpg.webp',
    ],
    note: 'Official R&M photography via authorized retailers',
  },
  'lectric-xpedition2': {
    urls: [
      'https://cdn.shopify.com/s/files/1/0229/0735/5214/files/XPedition2-STRATUS_WHITE-BF-STUDIO_CAROUSEL.jpg?v=1770981358',
      'https://cdn.shopify.com/s/files/1/0229/0735/5214/files/XPed-W-dual-side_stock_bike.webp?v=1770981326',
    ],
    note: 'From lectricebikes.com Shopify CDN',
  },
  'aventon-abound-lr': {
    urls: [
      'https://cdn.shopify.com/s/files/1/1520/2468/files/01_Abound-LR_Stealth_Side_1-bike.jpg?v=1737999400',
      'https://cdn.shopify.com/s/files/1/1520/2468/files/01_Abound-LR_Sage_Side_1-bike.jpg?v=1737999583',
    ],
    note: 'From aventon.com Shopify CDN, 3000x2025',
  },
  'radwagon-5': {
    urls: [
      'https://cdn.shopify.com/s/files/1/0799/9645/files/1-1-min_3.png?v=1715446424',
      'https://cdn.shopify.com/s/files/1/0799/9645/files/Wagon_5_Metallic_Blue_Right_Angle.png?v=1745426955',
    ],
    note: 'From radpowerbikes.com Shopify CDN',
  },
  'tern-hsd-p5i': {
    urls: [
      'https://store.ternbicycles.com/cdn/shop/files/HSD_P5i-gen2-dragonfruit.jpg?v=1694818068',
      'https://store.ternbicycles.com/cdn/shop/files/TN-photo-HSD_P5i-gen2-seabreeze-web_jpg.webp?v=1694818068',
    ],
    note: 'From Tern store Shopify CDN',
  },
  'tern-gsd-s10': {
    urls: [
      'https://store.ternbicycles.com/cdn/shop/files/TN-photo-GSD_S10-gen3-beetle-profile-web_0_jpg.webp?v=1743019667&width=1920',
      'https://store.ternbicycles.com/cdn/shop/files/TN-photo-GSD_S10-gen3-pearl-profile-web_jpg.webp?v=1743019667&width=1920',
    ],
    note: 'From Tern store Shopify CDN, 1920px',
  },
}

// ─── Helpers ───

function log(msg: string) {
  console.log(`[source] ${msg}`)
}

function warn(msg: string) {
  console.warn(`[source] ⚠ ${msg}`)
}

async function login(): Promise<string> {
  log(`Logging in to ${BASE_URL}...`)
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed (${res.status})`)
  const data = await res.json()
  if (!data.token) throw new Error('No token')
  return data.token
}

async function downloadImage(url: string, outputPath: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
    })
    if (!res.ok) {
      warn(`  HTTP ${res.status} for ${url.substring(0, 80)}`)
      return false
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 5000) {
      warn(`  File too small (${buffer.length} bytes)`)
      return false
    }
    fs.writeFileSync(outputPath, buffer)
    return true
  } catch (err) {
    warn(`  Download error: ${err}`)
    return false
  }
}

async function optimizeImage(inputPath: string): Promise<{ path: string; width: number; height: number }> {
  const outputPath = inputPath.replace(/\.[^.]+$/, '-opt.webp')
  const metadata = await sharp(inputPath).metadata()
  const width = metadata.width || 0
  const height = metadata.height || 0

  let pipeline = sharp(inputPath)
  if (width > 2000) {
    pipeline = pipeline.resize(2000, null, { withoutEnlargement: true })
  }
  pipeline = pipeline.rotate()
  await pipeline.webp({ quality: 82 }).toFile(outputPath)

  const outMeta = await sharp(outputPath).metadata()
  return { path: outputPath, width: outMeta.width || width, height: outMeta.height || height }
}

async function validateWithVision(
  imagePath: string,
  productName: string,
  brandName: string,
): Promise<{ ok: boolean; quality: number; reason: string }> {
  try {
    const buffer = fs.readFileSync(imagePath)
    const resized = await sharp(buffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()

    const base64 = resized.toString('base64')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
            },
            {
              type: 'text',
              text: `Is this a real product photo of the "${brandName} ${productName}" cargo bike? Rate quality 1-5. JSON only:
{"is_correct": true/false, "quality": 1-5, "reason": "brief"}`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { ok: false, quality: 0, reason: 'Could not parse response' }

    const result = JSON.parse(jsonMatch[0])
    return {
      ok: result.is_correct !== false && (result.quality || 0) >= 3,
      quality: result.quality || 0,
      reason: result.reason || '',
    }
  } catch (err) {
    warn(`  Vision error: ${err}`)
    return { ok: false, quality: 0, reason: `Error: ${err}` }
  }
}

async function uploadMedia(filePath: string, alt: string, token: string): Promise<number> {
  const form = new FormData()
  const fileBuffer = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mime = ext === '.webp' ? 'image/webp' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png'
  const blob = new Blob([fileBuffer], { type: mime })
  form.append('file', blob, path.basename(filePath))
  form.append('alt', alt)

  const res = await fetch(`${BASE_URL}/api/media`, {
    method: 'POST',
    headers: { Authorization: `JWT ${token}` },
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Upload failed (${res.status}): ${text.substring(0, 200)}`)
  }
  const data = await res.json()
  return data.doc.id
}

async function patchProduct(id: number, updates: Record<string, unknown>, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const text = await res.text()
    warn(`Patch failed for product ${id}: ${text.substring(0, 200)}`)
  }
}

// ─── Main ───

async function main() {
  log('=== Image Sourcing Pipeline ===\n')

  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })

  const token = await login()

  // Fetch all products
  const res = await fetch(`${BASE_URL}/api/products?limit=100&depth=1&where[_status][equals]=published`)
  const data = await res.json()
  const products = data.docs as any[]

  log(`Found ${products.length} products\n`)

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const product of products) {
    const brandName = product.brand && typeof product.brand === 'object' ? product.brand.name : 'Unknown'
    const slug = product.slug

    // Check if this product has source URLs defined
    const source = IMAGE_SOURCES[slug]

    // Also check if existing images need replacing
    const existingImages = (product.images || []).filter(
      (img: any) => typeof img === 'object' && img !== null && img.url,
    )
    const realImages = existingImages.filter(
      (img: any) => !img.filename?.endsWith('-card.png'),
    )

    // Check if existing real images are good enough (>= 800px wide)
    const hasGoodImage = realImages.some((img: any) => (img.width || 0) >= 800)

    if (!source && hasGoodImage) {
      log(`✓ ${brandName} ${product.name} — already has good images, skipping`)
      skipped++
      continue
    }

    if (!source && !hasGoodImage && realImages.length > 0) {
      // Has images but they might be low-res — check if we have a source
      log(`⚠ ${brandName} ${product.name} — images exist but may be low-res, no source defined`)
      skipped++
      continue
    }

    if (!source) {
      log(`○ ${brandName} ${product.name} — no image source defined, skipping`)
      skipped++
      continue
    }

    log(`\n── ${brandName} ${product.name} ──`)
    if (source.note) log(`  (${source.note})`)

    let bestImagePath: string | null = null
    let bestQuality = 0
    let bestReason = ''
    let bestWidth = 0
    let bestHeight = 0

    for (let i = 0; i < source.urls.length; i++) {
      const url = source.urls[i]
      const ext = url.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg'
      const tmpPath = path.join(TMP_DIR, `${slug}-candidate-${i}.${ext}`)

      log(`  Downloading candidate ${i + 1}: ${url.substring(0, 80)}...`)
      const ok = await downloadImage(url, tmpPath)
      if (!ok) continue

      // Check resolution
      const meta = await sharp(tmpPath).metadata()
      const w = meta.width || 0
      const h = meta.height || 0
      log(`  Resolution: ${w}x${h}`)

      if (w < 600) {
        log(`  Too small, skipping`)
        fs.unlinkSync(tmpPath)
        continue
      }

      // Validate with Claude Vision
      log(`  Validating with Claude Vision...`)
      const validation = await validateWithVision(tmpPath, product.name, brandName)
      log(`  ${validation.ok ? '✓' : '✗'} quality=${validation.quality}/5 — ${validation.reason}`)

      if (validation.ok && validation.quality > bestQuality) {
        if (bestImagePath && bestImagePath !== tmpPath) {
          fs.unlinkSync(bestImagePath)
        }
        bestImagePath = tmpPath
        bestQuality = validation.quality
        bestReason = validation.reason
        bestWidth = w
        bestHeight = h
      } else {
        fs.unlinkSync(tmpPath)
      }

      // If we found a quality 4+ image, no need to try more
      if (bestQuality >= 4) break

      // Rate limit
      await new Promise((r) => setTimeout(r, 500))
    }

    if (!bestImagePath || bestQuality < 3) {
      warn(`  Could not find a good image for ${product.name}`)
      failed++
      continue
    }

    // Optimize
    log(`  Optimizing... (${bestWidth}x${bestHeight})`)
    const optimized = await optimizeImage(bestImagePath)
    log(`  Optimized: ${optimized.width}x${optimized.height}`)

    // Upload
    log(`  Uploading to Payload...`)
    try {
      const mediaId = await uploadMedia(
        optimized.path,
        `${brandName} ${product.name}`,
        token,
      )
      log(`  Uploaded (media ID: ${mediaId})`)

      // Remove old -card.png fallback images, keep any existing real images
      const keepImageIds = realImages
        .filter((img: any) => (img.width || 0) >= 600)
        .map((img: any) => img.id)

      await patchProduct(
        product.id,
        {
          images: [mediaId, ...keepImageIds],
          imageStatus: 'scraped',
          _status: 'published',
        },
        token,
      )
      log(`  ✓ Product updated!`)
      updated++
    } catch (err) {
      warn(`  Upload/patch failed: ${err}`)
      failed++
    }

    // Clean up temp files
    if (bestImagePath && fs.existsSync(bestImagePath)) fs.unlinkSync(bestImagePath)
    if (fs.existsSync(optimized.path)) fs.unlinkSync(optimized.path)

    // Rate limit between products
    await new Promise((r) => setTimeout(r, 1000))
  }

  console.log('\n' + '═'.repeat(50))
  console.log(`  RESULTS: ${updated} updated, ${skipped} skipped, ${failed} failed`)
  console.log('═'.repeat(50))

  // Cleanup
  if (fs.existsSync(TMP_DIR)) fs.rmSync(TMP_DIR, { recursive: true, force: true })
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})

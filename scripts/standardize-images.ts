/**
 * Standardize product images: consistent white background, 4:3 aspect ratio,
 * bikes all appear the same size in frame, with a soft ground shadow.
 *
 * Process:
 * 1. Download each product's source image (skips previously standardized ones)
 * 2. Trim away background (white or dark)
 * 3. Resize trimmed bike to fit a consistent content area
 * 4. Place centered on a white 1600x1200 canvas with ground shadow
 * 5. Upload as new primary image
 *
 * Usage:
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/standardize-images.ts
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/standardize-images.ts --product=gazelle-cabby
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TMP_DIR = path.join(__dirname, '../.tmp-standardize')
const BASE_URL = process.env.PAYLOAD_URL || 'http://localhost:3000'
const EMAIL = process.env.PAYLOAD_EMAIL || 'demo-author@example.com'
const PASSWORD = process.env.PAYLOAD_PASSWORD || 'password'

const args = process.argv.slice(2)
const FLAG_PRODUCT_SLUG = args.find((a) => a.startsWith('--product='))?.split('=')[1]

// Canvas dimensions (4:3)
const CANVAS_W = 1600
const CANVAS_H = 1200
// The bike should fill this portion of the canvas
const CONTENT_W = Math.round(CANVAS_W * 0.80) // 1280px
const CONTENT_H = Math.round(CANVAS_H * 0.72) // 864px — leave more room at bottom for shadow
const BG_COLOR = { r: 255, g: 255, b: 255, alpha: 1 }

// ─── Helpers ───

function log(msg: string) {
  console.log(`[standardize] ${msg}`)
}

function warn(msg: string) {
  console.warn(`[standardize] ⚠ ${msg}`)
}

async function login(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed (${res.status})`)
  const data = await res.json()
  return data.token
}

async function downloadImage(url: string, outputPath: string): Promise<boolean> {
  try {
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`
    const res = await fetch(fullUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!res.ok) return false
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 5000) return false
    fs.writeFileSync(outputPath, buffer)
    return true
  } catch {
    return false
  }
}

async function uploadMedia(filePath: string, alt: string, token: string): Promise<number> {
  const form = new FormData()
  const fileBuffer = fs.readFileSync(filePath)
  const blob = new Blob([fileBuffer], { type: 'image/webp' })
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
  if (!res.ok) warn(`Patch failed for product ${id}`)
}

// ─── Shadow Generation ───

async function createGroundShadow(bikeWidth: number): Promise<Buffer> {
  // Create a soft elliptical shadow sized relative to the bike
  const shadowW = Math.round(bikeWidth * 0.75)
  const shadowH = 50
  const rx = Math.round(shadowW / 2)
  const ry = 12

  const svg = Buffer.from(
    `<svg width="${shadowW}" height="${shadowH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" />
        </filter>
      </defs>
      <ellipse cx="${shadowW / 2}" cy="${shadowH / 2}" rx="${rx}" ry="${ry}"
        fill="rgba(0,0,0,0.10)" filter="url(#blur)" />
    </svg>`,
  )

  return await sharp(svg).png().toBuffer()
}

// ─── Image Standardization ───

async function standardizeImage(inputPath: string, outputPath: string): Promise<void> {
  const meta = await sharp(inputPath).metadata()
  log(`  Original: ${meta.width}x${meta.height}`)

  // Step 1: Trim background
  let trimmedBuf: Buffer
  try {
    trimmedBuf = await sharp(inputPath).trim({ threshold: 30 }).toBuffer()
    const trimmedMeta = await sharp(trimmedBuf).metadata()

    const origArea = (meta.width || 1) * (meta.height || 1)
    const trimArea = (trimmedMeta.width || 1) * (trimmedMeta.height || 1)

    if (trimArea / origArea < 0.15) {
      warn(`  Trim removed too much (${Math.round((trimArea / origArea) * 100)}%), using original`)
      trimmedBuf = await sharp(inputPath).toBuffer()
    } else {
      log(`  Trimmed to: ${trimmedMeta.width}x${trimmedMeta.height}`)
    }
  } catch {
    warn(`  Trim failed, using original`)
    trimmedBuf = await sharp(inputPath).toBuffer()
  }

  // Step 2: Resize the trimmed bike to fit within the content area
  const resized = await sharp(trimmedBuf)
    .resize(CONTENT_W, CONTENT_H, {
      fit: 'inside',
      withoutEnlargement: false,
    })
    .toBuffer()

  const resizedMeta = await sharp(resized).metadata()
  const bikeW = resizedMeta.width || 0
  const bikeH = resizedMeta.height || 0
  log(`  Resized bike: ${bikeW}x${bikeH}`)

  // Step 3: Position bike — center horizontally, slightly above center vertically
  // to leave room for the shadow below
  const bikeLeft = Math.round((CANVAS_W - bikeW) / 2)
  const bikeTop = Math.round((CANVAS_H - bikeH) / 2) - 20 // nudge up slightly

  // Step 4: Create ground shadow
  const shadowBuf = await createGroundShadow(bikeW)
  const shadowMeta = await sharp(shadowBuf).metadata()
  const shadowLeft = Math.round((CANVAS_W - (shadowMeta.width || 0)) / 2)
  // Place shadow right at the bottom of the bike
  const shadowTop = bikeTop + bikeH - 12

  // Step 5: Composite: canvas → shadow → bike
  await sharp({
    create: {
      width: CANVAS_W,
      height: CANVAS_H,
      channels: 4,
      background: BG_COLOR,
    },
  })
    .composite([
      {
        input: shadowBuf,
        left: shadowLeft,
        top: shadowTop,
      },
      {
        input: resized,
        left: bikeLeft,
        top: bikeTop,
      },
    ])
    .webp({ quality: 88 })
    .toFile(outputPath)

  const finalSize = Math.round(fs.statSync(outputPath).size / 1024)
  log(`  Final: ${CANVAS_W}x${CANVAS_H} (${finalSize}KB) with shadow`)
}

// ─── Find Source Image ───

function findSourceImage(images: any[]): any | null {
  // Skip standardized images and info-card fallbacks to find the original source
  const candidates = images.filter((img: any) => {
    if (typeof img !== 'object' || !img?.url) return false
    const fn = img.filename || ''
    if (fn.endsWith('-card.png')) return false
    if (fn.includes('standardized')) return false
    return true
  })

  if (candidates.length === 0) return null

  // Prefer the highest resolution candidate
  return candidates.sort((a: any, b: any) => {
    const aArea = (a.width || 0) * (a.height || 0)
    const bArea = (b.width || 0) * (b.height || 0)
    return bArea - aArea
  })[0]
}

// ─── Main ───

async function main() {
  log('=== Standardizing Product Images ===\n')

  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })

  const token = await login()
  log('Logged in\n')

  let url = `${BASE_URL}/api/products?limit=100&depth=1&where[_status][equals]=published`
  if (FLAG_PRODUCT_SLUG) {
    url += `&where[slug][equals]=${FLAG_PRODUCT_SLUG}`
  }
  const res = await fetch(url)
  const data = await res.json()
  const products = data.docs as any[]

  if (FLAG_PRODUCT_SLUG) log(`Processing single product: ${FLAG_PRODUCT_SLUG}\n`)

  let updated = 0
  let failed = 0

  for (const product of products) {
    const brandName = product.brand?.name || 'Unknown'
    const label = `${brandName} ${product.name}`
    log(`── ${label} ──`)

    const sourceImage = findSourceImage(product.images || [])
    if (!sourceImage) {
      warn(`  No source image found, skipping`)
      failed++
      continue
    }

    log(`  Source: ${sourceImage.filename} (${sourceImage.width}x${sourceImage.height})`)

    const ext = sourceImage.filename?.split('.').pop() || 'jpg'
    const inputPath = path.join(TMP_DIR, `${product.slug}-input.${ext}`)
    const outputPath = path.join(TMP_DIR, `${product.slug}-standardized.webp`)

    const ok = await downloadImage(sourceImage.url, inputPath)
    if (!ok) {
      warn(`  Download failed`)
      failed++
      continue
    }

    try {
      await standardizeImage(inputPath, outputPath)
    } catch (err) {
      warn(`  Standardization failed: ${err}`)
      failed++
      continue
    }

    try {
      const mediaId = await uploadMedia(outputPath, `${label} — standardized`, token)
      log(`  Uploaded (media ID: ${mediaId})`)

      // Keep original source images, drop old standardized ones
      const keepIds = (product.images || [])
        .filter(
          (img: any) =>
            typeof img === 'object' &&
            img?.id &&
            !img.filename?.includes('standardized') &&
            !img.filename?.endsWith('-card.png'),
        )
        .map((img: any) => img.id)

      await patchProduct(
        product.id,
        { images: [mediaId, ...keepIds], _status: 'published' },
        token,
      )
      log(`  ✓ Product updated\n`)
      updated++
    } catch (err) {
      warn(`  Upload failed: ${err}`)
      failed++
    }

    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
  }

  console.log('\n' + '═'.repeat(50))
  console.log(`  RESULTS: ${updated} standardized, ${failed} failed`)
  console.log('═'.repeat(50))

  if (fs.existsSync(TMP_DIR)) fs.rmSync(TMP_DIR, { recursive: true, force: true })
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})

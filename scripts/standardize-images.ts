/**
 * Standardize product images: consistent white background, 4:3 aspect ratio,
 * bikes all appear the same size in frame.
 *
 * Process:
 * 1. Download each product's primary image
 * 2. Trim away background (white or dark)
 * 3. Resize trimmed bike to fit a consistent content area
 * 4. Place centered on a white 1600x1200 canvas (4:3)
 * 5. Upload as new primary image
 *
 * Usage: PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/standardize-images.ts
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

// Canvas dimensions (4:3)
const CANVAS_W = 1600
const CANVAS_H = 1200
// The bike should fill this portion of the canvas (with padding around it)
const CONTENT_W = Math.round(CANVAS_W * 0.82) // ~1312px for the bike
const CONTENT_H = Math.round(CANVAS_H * 0.78) // ~936px for the bike
const BG_COLOR = { r: 255, g: 255, b: 255, alpha: 1 } // white

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

// ─── Image Standardization ───

async function standardizeImage(inputPath: string, outputPath: string): Promise<void> {
  // Step 1: Read the image
  const input = sharp(inputPath)
  const meta = await input.metadata()
  log(`  Original: ${meta.width}x${meta.height}`)

  // Step 2: Trim background (auto-detects white or dark backgrounds)
  // Use a threshold to handle slight color variations
  let trimmed: sharp.Sharp
  try {
    trimmed = sharp(inputPath).trim({ threshold: 30 })
    const trimmedBuf = await trimmed.toBuffer()
    const trimmedMeta = await sharp(trimmedBuf).metadata()

    // Sanity check: if trim removed too much (< 20% of original), skip trimming
    const origArea = (meta.width || 1) * (meta.height || 1)
    const trimArea = (trimmedMeta.width || 1) * (trimmedMeta.height || 1)

    if (trimArea / origArea < 0.15) {
      warn(`  Trim removed too much (${Math.round(trimArea/origArea*100)}%), using original`)
      trimmed = sharp(inputPath)
    } else {
      log(`  Trimmed to: ${trimmedMeta.width}x${trimmedMeta.height}`)
      // Use the trimmed buffer for further processing
      trimmed = sharp(trimmedBuf)
    }
  } catch {
    warn(`  Trim failed, using original`)
    trimmed = sharp(inputPath)
  }

  // Step 3: Resize the trimmed bike to fit within the content area
  const resized = await trimmed
    .resize(CONTENT_W, CONTENT_H, {
      fit: 'inside',
      withoutEnlargement: false, // allow upscaling small images to fill the space
    })
    .toBuffer()

  const resizedMeta = await sharp(resized).metadata()
  log(`  Resized bike: ${resizedMeta.width}x${resizedMeta.height}`)

  // Step 4: Create white canvas and composite the bike centered
  // Calculate position to center the bike on the canvas
  const left = Math.round((CANVAS_W - (resizedMeta.width || 0)) / 2)
  const top = Math.round((CANVAS_H - (resizedMeta.height || 0)) / 2)

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
        input: resized,
        left,
        top,
      },
    ])
    .webp({ quality: 88 }) // slightly higher quality for the final standardized image
    .toFile(outputPath)

  const finalMeta = await sharp(outputPath).metadata()
  log(`  Final: ${finalMeta.width}x${finalMeta.height} (${Math.round(fs.statSync(outputPath).size / 1024)}KB)`)
}

// ─── Main ───

async function main() {
  log('=== Standardizing Product Images ===\n')

  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })

  const token = await login()
  log('Logged in\n')

  // Fetch all products
  const res = await fetch(`${BASE_URL}/api/products?limit=100&depth=1&where[_status][equals]=published`)
  const data = await res.json()
  const products = data.docs as any[]

  let updated = 0
  let failed = 0

  for (const product of products) {
    const brandName = product.brand?.name || 'Unknown'
    const label = `${brandName} ${product.name}`
    log(`── ${label} ──`)

    // Find the first real image (skip -card.png)
    const images = (product.images || []).filter(
      (img: any) => typeof img === 'object' && img?.url && !img.filename?.endsWith('-card.png'),
    )

    if (images.length === 0) {
      warn(`  No images, skipping`)
      failed++
      continue
    }

    const primaryImage = images[0]
    const inputPath = path.join(TMP_DIR, `${product.slug}-input.${primaryImage.filename?.split('.').pop() || 'jpg'}`)
    const outputPath = path.join(TMP_DIR, `${product.slug}-standardized.webp`)

    // Download
    const ok = await downloadImage(primaryImage.url, inputPath)
    if (!ok) {
      warn(`  Download failed`)
      failed++
      continue
    }

    // Standardize
    try {
      await standardizeImage(inputPath, outputPath)
    } catch (err) {
      warn(`  Standardization failed: ${err}`)
      failed++
      continue
    }

    // Upload
    try {
      const mediaId = await uploadMedia(outputPath, `${label} — standardized`, token)
      log(`  Uploaded (media ID: ${mediaId})`)

      // Keep the original images but put the standardized one first
      const existingIds = images.map((img: any) => img.id)
      await patchProduct(
        product.id,
        { images: [mediaId, ...existingIds], _status: 'published' },
        token,
      )
      log(`  ✓ Product updated\n`)
      updated++
    } catch (err) {
      warn(`  Upload failed: ${err}`)
      failed++
    }

    // Clean up temp files
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

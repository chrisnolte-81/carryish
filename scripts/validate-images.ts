/**
 * Image Validator & Sourcer — uses Claude Vision to audit product images
 * and re-sources from manufacturer sites when images are bad/missing.
 *
 * Usage:
 *   pnpm validate:images                     # validate all products
 *   pnpm validate:images -- --fix            # validate + re-source bad images
 *   pnpm validate:images -- --product=<slug> # single product
 *   pnpm validate:images -- --report-only    # just print report, don't update DB
 *
 * Requires: ANTHROPIC_API_KEY, PAYLOAD_URL, PAYLOAD_EMAIL, PAYLOAD_PASSWORD in .env
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

// ─── Config ───

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TMP_DIR = path.join(__dirname, '../.tmp-validate')
const BASE_URL = process.env.PAYLOAD_URL || 'http://localhost:3000'
const EMAIL = process.env.PAYLOAD_EMAIL || 'demo@payloadcms.com'
const PASSWORD = process.env.PAYLOAD_PASSWORD || 'demo'

const anthropic = new Anthropic() // reads ANTHROPIC_API_KEY from env

// ─── CLI Flags ───

const args = process.argv.slice(2)
const FLAG_FIX = args.includes('--fix')
const FLAG_REPORT_ONLY = args.includes('--report-only')
const FLAG_PRODUCT_SLUG = args.find((a) => a.startsWith('--product='))?.split('=')[1]

// ─── Types ───

interface MediaObject {
  id: number
  filename: string
  url: string
  width?: number
  height?: number
  mimeType?: string
}

interface Product {
  id: number
  name: string
  slug: string
  brand: { id: number; name: string } | null
  category?: string
  price?: number
  affiliateUrl?: string
  cargoLayout?: string
  motorBrand?: string
  images?: (MediaObject | number)[]
  imageStatus?: string
}

interface ValidationResult {
  productName: string
  productSlug: string
  brand: string
  status: 'good' | 'wrong' | 'low-quality' | 'info-card' | 'no-image'
  quality: number // 1-5
  reason: string
  imageUrl?: string
  resolution?: string
}

// ─── Logging ───

function log(msg: string) {
  console.log(`[validate] ${msg}`)
}

function warn(msg: string) {
  console.warn(`[validate] ⚠ ${msg}`)
}

// ─── API Helpers ───

async function login(): Promise<string> {
  log(`Logging in to ${BASE_URL}...`)
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed (${res.status})`)
  const data = await res.json()
  if (!data.token) throw new Error('No token in login response')
  return data.token
}

async function patchProduct(
  id: number,
  updates: Record<string, unknown>,
  token: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/products/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${token}`,
    },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const text = await res.text()
    warn(`Failed to patch product ${id}: ${text}`)
  }
}

function mimeForExt(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.webp') return 'image/webp'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.avif') return 'image/avif'
  return 'image/png'
}

async function uploadMedia(filePath: string, alt: string, token: string): Promise<number> {
  const form = new FormData()
  const fileBuffer = fs.readFileSync(filePath)
  const blob = new Blob([fileBuffer], { type: mimeForExt(filePath) })
  form.append('file', blob, path.basename(filePath))
  form.append('alt', alt)

  const res = await fetch(`${BASE_URL}/api/media`, {
    method: 'POST',
    headers: { Authorization: `JWT ${token}` },
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Upload failed (${res.status}): ${text}`)
  }
  const data = await res.json()
  return data.doc.id
}

// ─── Image Download ───

async function downloadToBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
    })
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 5000) return null // too small
    return buffer
  } catch {
    return null
  }
}

async function downloadToFile(url: string, outputPath: string): Promise<boolean> {
  const buffer = await downloadToBuffer(url)
  if (!buffer) return false
  fs.writeFileSync(outputPath, buffer)
  return true
}

// ─── Image Optimization ───

async function optimizeImage(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace(/\.[^.]+$/, '.webp')
  try {
    const metadata = await sharp(inputPath).metadata()
    if (!metadata.width || !metadata.height) return inputPath
    if (metadata.width < 100 && metadata.height < 100) return inputPath

    let pipeline = sharp(inputPath)
    if (metadata.width > 2000) {
      pipeline = pipeline.resize(2000, null, { withoutEnlargement: true })
    }
    pipeline = pipeline.rotate()
    await pipeline.webp({ quality: 82 }).toFile(outputPath)
    if (outputPath !== inputPath) fs.unlinkSync(inputPath)
    return outputPath
  } catch {
    return inputPath
  }
}

// ─── Claude Vision Validation ───

async function validateImageWithVision(
  imageUrl: string,
  productName: string,
  brandName: string,
  category: string,
): Promise<{ isCorrect: boolean; quality: number; reason: string }> {
  try {
    // Download image to get dimensions first
    const buffer = await downloadToBuffer(imageUrl)
    if (!buffer) {
      return { isCorrect: false, quality: 0, reason: 'Could not download image' }
    }

    // Check resolution
    const metadata = await sharp(buffer).metadata()
    const width = metadata.width || 0
    const height = metadata.height || 0

    if (width < 400 || height < 300) {
      return {
        isCorrect: false,
        quality: 1,
        reason: `Too low resolution: ${width}x${height}`,
      }
    }

    // Convert to base64 for Claude Vision
    // Resize to max 1024px for the API call to save tokens
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
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64,
              },
            },
            {
              type: 'text',
              text: `You are validating a product image for an e-commerce site.

Product: ${productName}
Brand: ${brandName}
Category: ${category || 'cargo bike'}

Answer these questions in JSON format only (no other text):
{
  "is_product_photo": true/false (is this an actual photo of this specific product, not a website screenshot, nav bar, generic banner, or info-card?),
  "is_correct_product": true/false (does this look like it could be a "${brandName} ${productName}" specifically?),
  "quality": 1-5 (1=unusable, 2=poor, 3=acceptable, 4=good, 5=excellent product photo),
  "reason": "brief explanation"
}`,
            },
          ],
        },
      ],
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { isCorrect: false, quality: 2, reason: 'Could not parse vision response' }
    }

    const result = JSON.parse(jsonMatch[0])
    const isCorrect = result.is_product_photo && result.is_correct_product
    const quality = Math.min(5, Math.max(1, result.quality || 1))

    // Penalize low resolution even if content is correct
    if (isCorrect && width < 800) {
      return {
        isCorrect: true,
        quality: Math.min(quality, 3),
        reason: `${result.reason} (low res: ${width}x${height})`,
      }
    }

    return {
      isCorrect,
      quality,
      reason: `${result.reason} (${width}x${height})`,
    }
  } catch (err) {
    warn(`Vision API error: ${err}`)
    return { isCorrect: false, quality: 0, reason: `Vision API error: ${err}` }
  }
}

// ─── Image Sourcing Strategies ───

/**
 * Strategy 1: Extract og:image from the product's affiliate URL
 * This is often the hero product photo and is typically high-res.
 */
async function tryOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
    })
    if (!res.ok) return null
    const html = await res.text()

    // Try og:image first
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
    if (ogMatch?.[1]) {
      const ogUrl = ogMatch[1].startsWith('http') ? ogMatch[1] : new URL(ogMatch[1], url).href
      // Verify it's a real image and decent size
      const buf = await downloadToBuffer(ogUrl)
      if (buf && buf.length > 20000) {
        const meta = await sharp(buf).metadata()
        if (meta.width && meta.width >= 600) {
          return ogUrl
        }
      }
    }

    // Try JSON-LD structured data
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
    if (jsonLdMatch) {
      for (const block of jsonLdMatch) {
        const jsonStr = block.replace(/<\/?script[^>]*>/gi, '')
        try {
          const ld = JSON.parse(jsonStr)
          const imageUrl = ld.image?.[0] || ld.image || ld.thumbnailUrl
          if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
            const buf = await downloadToBuffer(imageUrl)
            if (buf && buf.length > 20000) {
              const meta = await sharp(buf).metadata()
              if (meta.width && meta.width >= 600) {
                return imageUrl
              }
            }
          }
        } catch {
          // invalid JSON-LD, skip
        }
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Strategy 2: Google Image search for the product
 */
async function tryGoogleImages(
  productName: string,
  brandName: string,
): Promise<string[]> {
  try {
    const query = encodeURIComponent(`${brandName} ${productName} cargo bike product photo`)
    const res = await fetch(
      `https://www.google.com/search?q=${query}&tbm=isch&tbs=isz:l`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      },
    )
    if (!res.ok) return []
    const html = await res.text()

    // Extract image URLs from Google's response
    const urls: string[] = []
    const imgRegex = /\["(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)",\s*\d+,\s*\d+\]/gi
    let match
    while ((match = imgRegex.exec(html)) !== null) {
      const imgUrl = match[1]
      // Skip Google's own thumbnails and icons
      if (imgUrl.includes('gstatic.com')) continue
      if (imgUrl.includes('google.com')) continue
      urls.push(imgUrl)
      if (urls.length >= 5) break
    }

    return urls
  } catch {
    return []
  }
}

/**
 * Strategy 3: Known manufacturer image CDN patterns
 */
const MANUFACTURER_IMAGE_PATTERNS: Record<string, (slug: string) => string[]> = {
  'radpowerbikes.com': (slug) => [
    `https://cdn.shopify.com/s/files/1/0604/0797/0493/files/${slug}.jpg`,
  ],
  'aventon.com': (slug) => [
    `https://cdn.shopify.com/s/files/1/0880/8165/0281/files/${slug}.jpg`,
  ],
  'lectricebikes.com': (slug) => [
    `https://cdn.shopify.com/s/files/1/0392/8888/8444/files/${slug}.jpg`,
  ],
}

// ─── Main Pipeline ───

async function main() {
  log('Image Validator starting...')
  log(`  Mode: ${FLAG_FIX ? 'VALIDATE + FIX' : FLAG_REPORT_ONLY ? 'REPORT ONLY' : 'VALIDATE'}`)
  if (FLAG_PRODUCT_SLUG) log(`  Single product: ${FLAG_PRODUCT_SLUG}`)

  // Create temp directory
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true })
  }

  // Only login if we need to write (not report-only)
  let token = ''
  if (!FLAG_REPORT_ONLY) {
    token = await login()
  }

  // Fetch all products with images (public API, no auth needed)
  let url = `${BASE_URL}/api/products?limit=100&depth=1&where[_status][equals]=published`
  if (FLAG_PRODUCT_SLUG) {
    url += `&where[slug][equals]=${FLAG_PRODUCT_SLUG}`
  }
  const productsRes = await fetch(url)
  const productsData = await productsRes.json()
  const products: Product[] = productsData.docs

  log(`Found ${products.length} products to validate.\n`)

  const results: ValidationResult[] = []
  let fixed = 0

  for (const product of products) {
    const brandName =
      product.brand && typeof product.brand === 'object' ? product.brand.name : 'Unknown'
    const productLabel = `${brandName} ${product.name}`

    log(`── ${productLabel} ──`)

    // Get the first real image (skip -card.png fallbacks)
    const images = (product.images || []).filter(
      (img): img is MediaObject =>
        typeof img === 'object' && img !== null && !!img.url,
    )

    const realImages = images.filter((img) => !img.filename?.endsWith('-card.png'))
    const firstImage = realImages[0] || null

    // Resolve relative URLs
    if (firstImage && firstImage.url && !firstImage.url.startsWith('http')) {
      firstImage.url = `${BASE_URL}${firstImage.url}`
    }

    if (!firstImage) {
      log(`  No real images found`)
      results.push({
        productName: product.name,
        productSlug: product.slug,
        brand: brandName,
        status: 'no-image',
        quality: 0,
        reason: images.length > 0 ? 'Only has info-card fallback' : 'No images at all',
      })

      // Try to source an image if --fix
      if (FLAG_FIX && !FLAG_REPORT_ONLY) {
        const sourced = await sourceImage(product, brandName, token)
        if (sourced) fixed++
      }
      continue
    }

    // Validate with Claude Vision
    log(`  Validating: ${firstImage.filename} (${firstImage.width}x${firstImage.height})`)
    const validation = await validateImageWithVision(
      firstImage.url,
      product.name,
      brandName,
      product.category || 'cargo bike',
    )

    let status: ValidationResult['status']
    if (!validation.isCorrect && validation.quality <= 2) {
      status = 'wrong'
    } else if (validation.quality <= 2) {
      status = 'low-quality'
    } else {
      status = 'good'
    }

    const symbol = status === 'good' ? '✓' : status === 'wrong' ? '✗' : '⚠'
    log(`  ${symbol} quality=${validation.quality}/5 — ${validation.reason}`)

    results.push({
      productName: product.name,
      productSlug: product.slug,
      brand: brandName,
      status,
      quality: validation.quality,
      reason: validation.reason,
      imageUrl: firstImage.url,
      resolution: `${firstImage.width}x${firstImage.height}`,
    })

    // Update imageStatus based on validation
    if (!FLAG_REPORT_ONLY) {
      if (status === 'good' && validation.quality >= 4) {
        await patchProduct(product.id, { imageStatus: 'scraped' }, token)
      } else if (status === 'wrong' || status === 'low-quality') {
        await patchProduct(product.id, { imageStatus: 'needs-images' }, token)

        // Try to source a better image if --fix
        if (FLAG_FIX) {
          const sourced = await sourceImage(product, brandName, token)
          if (sourced) fixed++
        }
      }
    }

    // Rate limit — be nice to Claude API
    await new Promise((r) => setTimeout(r, 1000))
  }

  // ─── Report ───

  console.log('\n' + '═'.repeat(60))
  console.log('  IMAGE VALIDATION REPORT')
  console.log('═'.repeat(60))

  const good = results.filter((r) => r.status === 'good')
  const wrong = results.filter((r) => r.status === 'wrong')
  const lowQuality = results.filter((r) => r.status === 'low-quality')
  const noImage = results.filter((r) => r.status === 'no-image')
  const infoCard = results.filter((r) => r.status === 'info-card')

  console.log(`\n  ✓ Good:        ${good.length}`)
  console.log(`  ✗ Wrong:       ${wrong.length}`)
  console.log(`  ⚠ Low quality: ${lowQuality.length}`)
  console.log(`  ○ No image:    ${noImage.length}`)
  console.log(`  □ Info card:   ${infoCard.length}`)
  if (FLAG_FIX) console.log(`  ★ Fixed:       ${fixed}`)

  if (wrong.length > 0) {
    console.log('\n── Wrong images (not the actual product): ──')
    for (const r of wrong) {
      console.log(`  ✗ ${r.brand} ${r.productName}: ${r.reason}`)
    }
  }

  if (lowQuality.length > 0) {
    console.log('\n── Low quality images: ──')
    for (const r of lowQuality) {
      console.log(`  ⚠ ${r.brand} ${r.productName}: ${r.reason} [${r.resolution}]`)
    }
  }

  if (noImage.length > 0) {
    console.log('\n── Missing images: ──')
    for (const r of noImage) {
      console.log(`  ○ ${r.brand} ${r.productName}: ${r.reason}`)
    }
  }

  console.log('\n' + '═'.repeat(60))

  // Cleanup
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true })
  }

  log('Done!')
}

// ─── Image Sourcing ───

async function sourceImage(
  product: Product,
  brandName: string,
  token: string,
): Promise<boolean> {
  log(`  Sourcing better image for ${brandName} ${product.name}...`)

  // Strategy 1: og:image from affiliate URL
  if (product.affiliateUrl) {
    log(`    Trying og:image from ${new URL(product.affiliateUrl).hostname}...`)
    const ogUrl = await tryOgImage(product.affiliateUrl)
    if (ogUrl) {
      log(`    Found og:image! Downloading...`)
      const result = await downloadAndUpload(ogUrl, product, brandName, token)
      if (result) return true
    }
  }

  // Strategy 2: Google Image search
  log(`    Trying Google Images...`)
  const googleUrls = await tryGoogleImages(product.name, brandName)
  if (googleUrls.length > 0) {
    for (const imgUrl of googleUrls.slice(0, 3)) {
      // Validate each candidate with Claude Vision before using
      log(`    Checking candidate: ${imgUrl.substring(0, 80)}...`)
      const validation = await validateImageWithVision(
        imgUrl,
        product.name,
        brandName,
        product.category || 'cargo bike',
      )

      if (validation.isCorrect && validation.quality >= 3) {
        log(`    ✓ Good match (quality ${validation.quality}/5). Downloading...`)
        const result = await downloadAndUpload(imgUrl, product, brandName, token)
        if (result) return true
      } else {
        log(`    ✗ Not a match: ${validation.reason}`)
      }
    }
  }

  log(`    Could not find a suitable image. Manual upload needed.`)
  await patchProduct(product.id, { imageStatus: 'needs-images' }, token)
  return false
}

async function downloadAndUpload(
  imageUrl: string,
  product: Product,
  brandName: string,
  token: string,
): Promise<boolean> {
  try {
    const ext = imageUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg'
    const tmpPath = path.join(TMP_DIR, `source-${product.slug}.${ext}`)

    const ok = await downloadToFile(imageUrl, tmpPath)
    if (!ok) {
      warn(`    Download failed`)
      return false
    }

    // Check resolution
    const meta = await sharp(tmpPath).metadata()
    if (!meta.width || meta.width < 600) {
      warn(`    Too small: ${meta.width}x${meta.height}`)
      fs.unlinkSync(tmpPath)
      return false
    }

    // Optimize
    const optimized = await optimizeImage(tmpPath)

    // Upload
    const mediaId = await uploadMedia(optimized, `${brandName} ${product.name}`, token)
    log(`    Uploaded (media ID: ${mediaId})`)

    // Get existing image IDs to prepend the new one
    const existingIds = (product.images || [])
      .filter((img): img is MediaObject => typeof img === 'object' && img !== null)
      .filter((img) => !img.filename?.endsWith('-card.png')) // drop old fallback cards
      .map((img) => img.id)

    await patchProduct(
      product.id,
      {
        images: [mediaId, ...existingIds],
        imageStatus: 'scraped',
        _status: 'published',
      },
      token,
    )
    log(`    ✓ Product updated with new image`)
    return true
  } catch (err) {
    warn(`    Upload/patch failed: ${err}`)
    return false
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})

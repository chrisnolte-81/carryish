/**
 * Scrape, standardize, and upload product images.
 *
 * Strategy:
 * 1. Shopify JSON — hit {domain}/products/{handle}.json for ~60 products (free, no credits)
 * 2. Playwright — scrape non-Shopify product pages for ~40 products
 * 3. Manual brands — skip, flag as needs-images
 *
 * Image processing: trim background → resize to 1600×1200 white canvas → upload as WebP
 *
 * Usage:
 *   node --import tsx/esm scripts/scrape-product-images.ts                    # all products
 *   node --import tsx/esm scripts/scrape-product-images.ts --shopify-only     # Shopify brands only
 *   node --import tsx/esm scripts/scrape-product-images.ts --brand=tern       # single brand
 *   node --import tsx/esm scripts/scrape-product-images.ts --product=tern-gsd-gen-3  # single product
 *   node --import tsx/esm scripts/scrape-product-images.ts --dry-run          # preview without uploading
 *   node --import tsx/esm scripts/scrape-product-images.ts --force            # re-scrape even if images exist
 *
 * Environment:
 *   PAYLOAD_URL     — server URL (default: http://localhost:3000)
 *   PAYLOAD_EMAIL   — admin email
 *   PAYLOAD_PASSWORD — admin password
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TMP_DIR = path.join(__dirname, '../.tmp-scrape')
const BASE_URL = process.env.PAYLOAD_URL || 'http://localhost:3000'
const EMAIL = process.env.PAYLOAD_EMAIL || 'demo-author@example.com'
const PASSWORD = process.env.PAYLOAD_PASSWORD || 'password'

// ─── Canvas settings ───
const CANVAS_W = 1600
const CANVAS_H = 1200
const CONTENT_W = Math.round(CANVAS_W * 0.80) // 1280px
const CONTENT_H = Math.round(CANVAS_H * 0.75) // 900px

// ─── CLI flags ───
const args = process.argv.slice(2)
const FLAG_SHOPIFY_ONLY = args.includes('--shopify-only')
const FLAG_DRY_RUN = args.includes('--dry-run')
const FLAG_FORCE = args.includes('--force')
const FLAG_BRAND = args.find((a) => a.startsWith('--brand='))?.split('=')[1]
const FLAG_PRODUCT = args.find((a) => a.startsWith('--product='))?.split('=')[1]

// ─── Brand → Scraper Config ───
// Derived from the Scraper Config sheet in the XLSX

interface ScraperConfig {
  method: 'shopify' | 'playwright' | 'manual'
  baseUrl: string
  imageSelector?: string
}

const SCRAPER_CONFIG: Record<string, ScraperConfig> = {
  // Shopify brands
  addmotor: { method: 'shopify', baseUrl: 'https://www.addmotor.com' },
  aventon: { method: 'shopify', baseUrl: 'https://www.aventon.com' },
  blix: { method: 'shopify', baseUrl: 'https://www.blixbike.com' },
  'bunch-bikes': { method: 'shopify', baseUrl: 'https://www.bunchbike.com' },
  'buzz-bicycles': { method: 'shopify', baseUrl: 'https://www.buzzbicycles.com' },
  engwe: { method: 'shopify', baseUrl: 'https://us.engwe.com' },
  ferla: { method: 'shopify', baseUrl: 'https://www.ferlafamilybikes.com' },
  heybike: { method: 'shopify', baseUrl: 'https://www.heybike.com' },
  kbo: { method: 'shopify', baseUrl: 'https://www.kbobike.com' },
  'larry-vs-harry': { method: 'shopify', baseUrl: 'https://www.larryvsharry.com' },
  lectric: { method: 'shopify', baseUrl: 'https://lectricebikes.com' },
  madsen: { method: 'shopify', baseUrl: 'https://www.madsencycles.com' },
  magnum: { method: 'shopify', baseUrl: 'https://magnumbikes.com' },
  'mod-bikes': { method: 'shopify', baseUrl: 'https://mod-bikes.com' },
  'omnium-cargo': { method: 'shopify', baseUrl: 'https://omniumcargo.us' },
  pedego: { method: 'shopify', baseUrl: 'https://www.pedegoelectricbikes.com' },
  'rad-power-bikes': { method: 'shopify', baseUrl: 'https://www.radpowerbikes.com' },
  'radio-flyer': { method: 'shopify', baseUrl: 'https://www.radioflyer.com' },
  ride1up: { method: 'shopify', baseUrl: 'https://ride1up.com' },
  surly: { method: 'shopify', baseUrl: 'https://surlybikes.com' },
  tenways: { method: 'shopify', baseUrl: 'https://us.tenways.com' },
  tern: { method: 'shopify', baseUrl: 'https://store.ternbicycles.com' },
  velotric: { method: 'shopify', baseUrl: 'https://velotricbike.com' },
  xtracycle: { method: 'shopify', baseUrl: 'https://xtracycle.com' },
  fiido: { method: 'shopify', baseUrl: 'https://www.fiido.com' },
  himiway: { method: 'shopify', baseUrl: 'https://himiwaybike.com' },
  mokwheel: { method: 'shopify', baseUrl: 'https://www.mokwheel.com' },
  'surface-604': { method: 'shopify', baseUrl: 'https://surface604bikes.com' },

  // Playwright (non-Shopify, JS-rendered)
  'riese-and-muller': {
    method: 'playwright',
    baseUrl: 'https://www.r-m.de',
    imageSelector: "img[src*='media'], picture source",
  },
  'urban-arrow': {
    method: 'playwright',
    baseUrl: 'https://www.urbanarrow.com',
    imageSelector: "img[src*='cloudinary']",
  },
  trek: {
    method: 'playwright',
    baseUrl: 'https://www.trekbikes.com',
    imageSelector: "img[src*='trekbikes'], img[data-src]",
  },
  specialized: {
    method: 'playwright',
    baseUrl: 'https://www.specialized.com',
    imageSelector: "img[src*='assets.specialized']",
  },
  cannondale: {
    method: 'playwright',
    baseUrl: 'https://www.cannondale.com',
    imageSelector: "img[src*='widencdn']",
  },
  yuba: {
    method: 'playwright',
    baseUrl: 'https://yubabikes.com',
    imageSelector: 'img.wp-image, .woocommerce-product-gallery img',
  },
  benno: {
    method: 'playwright',
    baseUrl: 'https://www.bennobikes.com',
    imageSelector: 'img.wp-image, .product-gallery img',
  },
  momentum: {
    method: 'playwright',
    baseUrl: 'https://www.momentum-biking.com',
    imageSelector: 'img.product-image',
  },
  carqon: {
    method: 'playwright',
    baseUrl: 'https://www.carqon.com',
    imageSelector: 'img.gallery-placeholder__image',
  },
  'bike-friday': {
    method: 'playwright',
    baseUrl: 'https://www.bikefriday.com',
    imageSelector: '.woocommerce-product-gallery img',
  },

  // Playwright — remaining non-Shopify brands
  'butchers-and-bicycles': { method: 'playwright', baseUrl: 'https://www.butchersandbicycles.com' },
  'cero-bikes': { method: 'playwright', baseUrl: 'https://www.cerobicycles.com' },
  'christiania-bikes': { method: 'playwright', baseUrl: 'https://www.christianiabikesamerica.com' },
  gocycle: { method: 'playwright', baseUrl: 'https://gocycle.com' },
  'icicle-tricycles': { method: 'playwright', baseUrl: 'https://icetrikes.com' },
  mongoose: { method: 'playwright', baseUrl: 'https://www.mongoose.com' },
  nihola: { method: 'playwright', baseUrl: 'https://nihola.com' },
  triobike: { method: 'playwright', baseUrl: 'https://triobike.com' },
  'virtue-cycles': { method: 'playwright', baseUrl: 'https://virtuecycles.com' },
  'worksman-cycles': { method: 'playwright', baseUrl: 'https://www.worksmancycles.com' },

  // Manual brands — skip
  also: { method: 'manual', baseUrl: 'https://ridealso.com' },
  honda: { method: 'manual', baseUrl: 'https://fastport.honda.com' },
  mubea: { method: 'manual', baseUrl: 'https://us.mubea-umobility.com' },
  'coaster-cycles': { method: 'manual', baseUrl: 'https://www.coastercycles.com' },
  rytle: { method: 'manual', baseUrl: 'https://rytle.com' },
  fernhay: { method: 'manual', baseUrl: 'https://fernhay.com' },
}

// ─── Logging ───

function log(msg: string) {
  console.log(`[scrape] ${msg}`)
}

function warn(msg: string) {
  console.warn(`[scrape] ⚠ ${msg}`)
}

// ─── API Helpers ───

async function login(): Promise<string> {
  log(`Logging in to ${BASE_URL}...`)
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return data.token
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

async function patchProduct(
  id: number,
  updates: Record<string, unknown>,
  token: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify(updates),
  })
  if (!res.ok) warn(`Patch failed for product ${id}`)
}

// ─── Image Download ───

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
    if (!res.ok) return false
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 5000) return false
    fs.writeFileSync(outputPath, buffer)
    return true
  } catch {
    return false
  }
}

// ─── Image Processing (trim + canvas, no shadow) ───

async function standardizeImage(inputPath: string, outputPath: string): Promise<boolean> {
  try {
    const meta = await sharp(inputPath).metadata()
    if (!meta.width || !meta.height || meta.width < 100) return false

    // Step 1: Trim background
    let trimmedBuf: Buffer
    try {
      trimmedBuf = await sharp(inputPath).trim({ threshold: 30 }).toBuffer()
      const trimMeta = await sharp(trimmedBuf).metadata()
      const origArea = meta.width * meta.height
      const trimArea = (trimMeta.width || 1) * (trimMeta.height || 1)

      if (trimArea / origArea < 0.15) {
        trimmedBuf = await sharp(inputPath).toBuffer()
      }
    } catch {
      trimmedBuf = await sharp(inputPath).toBuffer()
    }

    // Step 2: Resize to fit content area
    const resized = await sharp(trimmedBuf)
      .resize(CONTENT_W, CONTENT_H, { fit: 'inside', withoutEnlargement: false })
      .toBuffer()

    const resizedMeta = await sharp(resized).metadata()
    const bikeW = resizedMeta.width || 0
    const bikeH = resizedMeta.height || 0

    // Step 3: Place centered on white canvas
    const bikeLeft = Math.round((CANVAS_W - bikeW) / 2)
    const bikeTop = Math.round((CANVAS_H - bikeH) / 2)

    await sharp({
      create: {
        width: CANVAS_W,
        height: CANVAS_H,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: resized, left: bikeLeft, top: bikeTop }])
      .webp({ quality: 88 })
      .toFile(outputPath)

    return true
  } catch (err) {
    warn(`  Standardization failed: ${err}`)
    return false
  }
}

// ─── Shopify JSON Extraction ───

interface ShopifyImage {
  src: string
  width: number
  height: number
  alt?: string
}

async function fetchShopifyImages(productUrl: string): Promise<string[]> {
  // Extract handle from URL: https://store.com/products/some-handle → some-handle
  const handleMatch = productUrl.match(/\/products\/([^/?#]+)/)
  if (!handleMatch) {
    warn(`  Could not extract Shopify handle from: ${productUrl}`)
    return []
  }

  const handle = handleMatch[1]
  const origin = new URL(productUrl).origin
  const jsonUrl = `${origin}/products/${handle}.json`

  try {
    const res = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      warn(`  Shopify JSON returned ${res.status} for ${jsonUrl}`)
      return []
    }

    const data = await res.json()
    const images: ShopifyImage[] = data.product?.images || []

    if (images.length === 0) {
      warn(`  No images in Shopify JSON for ${handle}`)
      return []
    }

    // Return image URLs, preferring larger ones
    return images
      .sort((a, b) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0))
      .slice(0, 5)
      .map((img) => {
        // Remove Shopify size suffix to get max resolution
        return img.src.replace(/_\d+x\d*\./, '.')
      })
  } catch (err) {
    warn(`  Shopify JSON fetch error: ${err}`)
    return []
  }
}

// ─── Playwright Scraping ───

const SKIP_PATTERNS = [
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
  /pinterest/i,
  /youtube/i,
  /svg$/i,
  /1x1/i,
  /spacer/i,
]

async function scrapeWithPlaywright(
  productUrl: string,
  imageSelector?: string,
): Promise<string[]> {
  let browser
  try {
    const { chromium } = await import('@playwright/test')
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
    })
    const page = await context.newPage()

    const response = await page.goto(productUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    })

    if (!response || response.status() >= 400) {
      warn(`  Got status ${response?.status()} for ${productUrl}`)
      return []
    }

    // Wait for images to load
    await page.waitForTimeout(3000)

    // Dismiss cookie banners
    try {
      const dismissSelectors = [
        '[class*="cookie"] button',
        '[class*="consent"] button',
        'button[aria-label="Close"]',
        'button[aria-label="Accept"]',
      ]
      for (const sel of dismissSelectors) {
        const btn = page.locator(sel).first()
        if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
          await btn.click().catch(() => {})
          break
        }
      }
    } catch {
      // ignore
    }

    await page.waitForTimeout(1000)

    // Collect images
    const images = await page.evaluate((selector) => {
      const results: { url: string; width: number }[] = []
      const seen = new Set<string>()

      // If a custom selector is provided, use it first
      const selectors = selector ? [selector, 'img'] : ['img']

      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach((el) => {
          const img = el as HTMLImageElement
          const src =
            img.getAttribute('data-zoom-image') ||
            img.getAttribute('data-src') ||
            img.getAttribute('data-lazy-src') ||
            img.getAttribute('srcset')?.split(',')[0]?.trim()?.split(' ')[0] ||
            img.src

          if (!src || src.startsWith('data:')) return
          const url = new URL(src, window.location.href).href
          if (seen.has(url)) return
          seen.add(url)

          const w = img.naturalWidth || parseInt(img.getAttribute('width') || '0')
          if (w > 200 || !img.complete) {
            results.push({ url, width: w || 500 })
          }
        })
      }

      // Also check picture sources
      document.querySelectorAll('picture source').forEach((source) => {
        const srcset = source.getAttribute('srcset')
        if (!srcset) return
        const firstUrl = srcset.split(',')[0]?.trim()?.split(' ')[0]
        if (!firstUrl || seen.has(firstUrl)) return
        seen.add(firstUrl)
        const url = new URL(firstUrl, window.location.href).href
        results.push({ url, width: 800 })
      })

      return results
    }, imageSelector || null)

    const filtered = images
      .filter((img) => {
        if (img.width < 300) return false
        return !SKIP_PATTERNS.some((p) => p.test(img.url))
      })
      .sort((a, b) => b.width - a.width)
      .slice(0, 5)

    return filtered.map((img) => img.url)
  } catch (err) {
    warn(`  Playwright scrape failed: ${err}`)
    return []
  } finally {
    if (browser) await browser.close()
  }
}

// ─── Main Pipeline ───

interface Product {
  id: number
  name: string
  slug: string
  affiliateUrl: string
  brand: { id: number; name: string; slug: string } | null
  images?: any[]
  imageStatus?: string
}

async function processProduct(
  product: Product,
  token: string,
): Promise<'scraped' | 'skipped' | 'failed'> {
  const brandSlug = product.brand?.slug || 'unknown'
  const brandName = product.brand?.name || 'Unknown'
  const label = `${brandName} ${product.name}`

  log(`\n── ${label} ──`)

  // Skip if already has images (unless --force)
  if (product.images && product.images.length > 0 && !FLAG_FORCE) {
    const realImages = product.images.filter(
      (img: any) => typeof img === 'object' && img?.url && !img.filename?.endsWith('-card.png'),
    )
    if (realImages.length > 0) {
      log(`  Already has ${realImages.length} images, skipping`)
      return 'skipped'
    }
  }

  const config = SCRAPER_CONFIG[brandSlug]

  if (!config) {
    warn(`  No scraper config for brand "${brandSlug}", skipping`)
    return 'failed'
  }

  if (config.method === 'manual') {
    log(`  Manual brand — skipping (needs manual image sourcing)`)
    return 'skipped'
  }

  if (FLAG_SHOPIFY_ONLY && config.method !== 'shopify') {
    log(`  Skipping non-Shopify brand (--shopify-only)`)
    return 'skipped'
  }

  if (!product.affiliateUrl) {
    warn(`  No affiliate URL, skipping`)
    return 'failed'
  }

  if (FLAG_DRY_RUN) {
    log(`  [DRY RUN] Would ${config.method === 'shopify' ? 'fetch Shopify JSON' : 'scrape with Playwright'}: ${product.affiliateUrl}`)
    return 'skipped'
  }

  // Fetch image URLs
  let imageUrls: string[] = []

  if (config.method === 'shopify') {
    log(`  Fetching Shopify JSON...`)
    imageUrls = await fetchShopifyImages(product.affiliateUrl)

    // Fallback to Playwright if Shopify JSON fails (wrong handle, collection page, etc.)
    if (imageUrls.length === 0 && !FLAG_SHOPIFY_ONLY) {
      log(`  Shopify JSON failed, falling back to Playwright...`)
      imageUrls = await scrapeWithPlaywright(product.affiliateUrl, config.imageSelector)
    }
  } else if (config.method === 'playwright') {
    log(`  Scraping with Playwright...`)
    imageUrls = await scrapeWithPlaywright(product.affiliateUrl, config.imageSelector)
  }

  if (imageUrls.length === 0) {
    warn(`  No images found`)
    return 'failed'
  }

  log(`  Found ${imageUrls.length} image URLs`)

  // Download the best image (first = largest)
  let bestImagePath: string | null = null

  for (let i = 0; i < Math.min(imageUrls.length, 3); i++) {
    const ext = imageUrls[i].match(/\.(webp|jpg|jpeg|png|avif)/i)?.[1] || 'jpg'
    const tmpPath = path.join(TMP_DIR, `${product.slug}-raw-${i}.${ext}`)

    log(`  Downloading candidate ${i + 1}...`)
    const ok = await downloadImage(imageUrls[i], tmpPath)
    if (!ok) continue

    // Check resolution
    try {
      const meta = await sharp(tmpPath).metadata()
      if ((meta.width || 0) < 400) {
        log(`  Too small (${meta.width}px wide), trying next`)
        fs.unlinkSync(tmpPath)
        continue
      }
      bestImagePath = tmpPath
      log(`  Downloaded: ${meta.width}x${meta.height}`)
      break
    } catch {
      fs.unlinkSync(tmpPath)
      continue
    }
  }

  if (!bestImagePath) {
    warn(`  All downloads failed`)
    return 'failed'
  }

  // Standardize image
  const stdPath = path.join(TMP_DIR, `${product.slug}-std.webp`)
  log(`  Standardizing...`)
  const stdOk = await standardizeImage(bestImagePath, stdPath)

  if (!stdOk) {
    // Upload raw image as fallback
    warn(`  Standardization failed, uploading raw image`)
    const rawWebpPath = path.join(TMP_DIR, `${product.slug}-raw.webp`)
    await sharp(bestImagePath).webp({ quality: 82 }).toFile(rawWebpPath)

    try {
      const mediaId = await uploadMedia(rawWebpPath, label, token)
      await patchProduct(product.id, { images: [mediaId], imageStatus: 'scraped', _status: 'published' }, token)
      log(`  Uploaded raw image (media ID: ${mediaId})`)
      cleanup(bestImagePath, rawWebpPath)
      return 'scraped'
    } catch (err) {
      warn(`  Upload failed: ${err}`)
      cleanup(bestImagePath, rawWebpPath)
      return 'failed'
    }
  }

  // Upload standardized image
  try {
    const mediaId = await uploadMedia(stdPath, label, token)
    log(`  Uploaded (media ID: ${mediaId})`)

    // Keep existing real images if any
    const keepIds = (product.images || [])
      .filter((img: any) => typeof img === 'object' && img?.id && !img.filename?.endsWith('-card.png'))
      .map((img: any) => img.id)

    await patchProduct(
      product.id,
      { images: [mediaId, ...keepIds], imageStatus: 'scraped', _status: 'published' },
      token,
    )
    log(`  Product updated!`)
    cleanup(bestImagePath, stdPath)
    return 'scraped'
  } catch (err) {
    warn(`  Upload/patch failed: ${err}`)
    cleanup(bestImagePath, stdPath)
    return 'failed'
  }
}

function cleanup(...paths: (string | null)[]) {
  for (const p of paths) {
    if (p && fs.existsSync(p)) fs.unlinkSync(p)
  }
}

async function main() {
  log('=== Product Image Scraper ===')
  log(`URL: ${BASE_URL}`)
  log(`Mode: ${FLAG_DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  if (FLAG_SHOPIFY_ONLY) log('Scope: Shopify brands only')
  if (FLAG_BRAND) log(`Brand filter: ${FLAG_BRAND}`)
  if (FLAG_PRODUCT) log(`Product filter: ${FLAG_PRODUCT}`)
  if (FLAG_FORCE) log('Force: re-processing existing images')

  if (!FLAG_DRY_RUN && !fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true })
  }

  const token = await login()
  log('Logged in')

  // Fetch products
  let url = `${BASE_URL}/api/products?limit=200&depth=1&where[_status][equals]=published`
  if (FLAG_PRODUCT) {
    url += `&where[slug][equals]=${FLAG_PRODUCT}`
  }
  const res = await fetch(url, { headers: { Authorization: `JWT ${token}` } })
  const data = await res.json()
  let products: Product[] = data.docs || []

  // Filter by brand if requested
  if (FLAG_BRAND) {
    products = products.filter(
      (p) => p.brand && (p.brand.slug === FLAG_BRAND || p.brand.name.toLowerCase() === FLAG_BRAND.toLowerCase()),
    )
  }

  log(`\nProcessing ${products.length} products...\n`)

  let scraped = 0
  let skipped = 0
  let failed = 0

  for (const product of products) {
    const result = await processProduct(product, token)
    if (result === 'scraped') scraped++
    else if (result === 'skipped') skipped++
    else failed++

    // Rate limiting
    if (result === 'scraped') {
      await new Promise((r) => setTimeout(r, 1500))
    }
  }

  console.log('\n' + '═'.repeat(50))
  console.log(`  RESULTS: ${scraped} scraped, ${skipped} skipped, ${failed} failed`)
  console.log('═'.repeat(50))

  // Cleanup
  if (!FLAG_DRY_RUN && fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error('[scrape] Fatal error:', err)
  process.exit(1)
})

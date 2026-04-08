/**
 * Image Pipeline — source, optimize, upload, assign images for brands & products.
 *
 * Usage:
 *   pnpm seed:images                     # process everything
 *   pnpm seed:images -- --brands         # brands only
 *   pnpm seed:images -- --products       # products only
 *   pnpm seed:images -- --product=<slug> # single product
 *   pnpm seed:images -- --force          # re-process even if images exist
 *   pnpm seed:images -- --dry-run        # preview without uploading
 *
 * Reads PAYLOAD_URL, PAYLOAD_EMAIL, PAYLOAD_PASSWORD from .env
 * Requires: @playwright/test, sharp (both already installed)
 * Install browser if needed: npx playwright install chromium
 */

import 'dotenv/config'
import { chromium, type Browser, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

// ─── Config ───

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TMP_DIR = path.join(__dirname, '../.tmp-images')
const BASE_URL = process.env.PAYLOAD_URL || 'http://localhost:3000'
const EMAIL = process.env.PAYLOAD_EMAIL || 'demo@payloadcms.com'
const PASSWORD = process.env.PAYLOAD_PASSWORD || 'demo'

// ─── CLI Flags ───

const args = process.argv.slice(2)
const FLAG_BRANDS = args.includes('--brands')
const FLAG_PRODUCTS = args.includes('--products')
const FLAG_FORCE = args.includes('--force')
const FLAG_DRY_RUN = args.includes('--dry-run')
const FLAG_PRODUCT_SLUG = args.find((a) => a.startsWith('--product='))?.split('=')[1]

// If neither --brands nor --products specified, do both
const DO_BRANDS = FLAG_BRANDS || (!FLAG_BRANDS && !FLAG_PRODUCTS)
const DO_PRODUCTS = FLAG_PRODUCTS || (!FLAG_BRANDS && !FLAG_PRODUCTS)

// ─── Per-site overrides ───

const SITE_OVERRIDES: Record<string, { skip?: boolean; imageSelector?: string }> = {
  'ternbicycles.com': { skip: true },
  'riese-und-muller.com': { skip: true },
  'r-m.de': { skip: true },
}

function shouldSkipSite(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    return Object.entries(SITE_OVERRIDES).some(
      ([domain, config]) => config.skip && hostname.includes(domain),
    )
  } catch {
    return true // invalid URL, skip
  }
}

// ─── Logging ───

function log(msg: string) {
  console.log(`[image-pipeline] ${msg}`)
}

function warn(msg: string) {
  console.warn(`[image-pipeline] WARNING: ${msg}`)
}

function dryLog(msg: string) {
  if (FLAG_DRY_RUN) console.log(`[DRY RUN] ${msg}`)
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

// ─── Image Processing ───

async function processImage(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace(/\.[^.]+$/, '.webp')

  try {
    const metadata = await sharp(inputPath).metadata()

    // Skip non-raster images (SVGs rendered to buffer are fine, but tiny files aren't)
    if (!metadata.width || !metadata.height) {
      warn(`  Skipping ${path.basename(inputPath)}: no dimensions detected`)
      return inputPath
    }

    // Skip tracking pixels / tiny images
    if (metadata.width < 100 && metadata.height < 100) {
      warn(`  Skipping ${path.basename(inputPath)}: too small (${metadata.width}x${metadata.height})`)
      return inputPath
    }

    let pipeline = sharp(inputPath)

    // Resize to max 2000px wide, preserving aspect ratio
    if (metadata.width > 2000) {
      pipeline = pipeline.resize(2000, null, { withoutEnlargement: true })
    }

    // Strip EXIF, convert to WebP at quality 82
    pipeline = pipeline.rotate() // auto-rotate from EXIF before stripping
    await pipeline.webp({ quality: 82 }).toFile(outputPath)

    // Clean up original if different
    if (outputPath !== inputPath) {
      fs.unlinkSync(inputPath)
    }

    return outputPath
  } catch (err) {
    warn(`  sharp processing failed for ${path.basename(inputPath)}: ${err}`)
    return inputPath // fall back to original
  }
}

// ─── API Helpers ───

async function login(): Promise<string> {
  log(`Logging in to ${BASE_URL}/api/users/login...`)
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Login failed (${res.status}): ${text}`)
  }
  const data = await res.json()
  const token = data.token
  if (!token) throw new Error('No token in login response')
  log('Logged in successfully.')
  return token
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
    throw new Error(`Upload failed for ${alt} (${res.status}): ${text}`)
  }
  const data = await res.json()
  return data.doc.id
}

async function patchBrand(
  id: number,
  updates: Record<string, unknown>,
  token: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/brands/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${token}`,
    },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const text = await res.text()
    warn(`Failed to patch brand ${id}: ${text}`)
  }
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

// ─── Brand Logo Generation ───

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function generateBrandLogo(page: Page, brandName: string, outputPath: string): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 800px;
      height: 400px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #FAFAF8;
      font-family: 'Inter', sans-serif;
    }
    .wordmark { text-align: center; }
    .name {
      font-size: 64px;
      font-weight: 600;
      color: #7A7A8C;
      letter-spacing: -1px;
      line-height: 1.2;
    }
    .accent {
      width: 60px;
      height: 3px;
      background: #C4C4D0;
      margin: 18px auto 0;
      border-radius: 2px;
    }
  </style>
</head>
<body>
  <div class="wordmark">
    <div class="name">${escapeHtml(brandName)}</div>
    <div class="accent"></div>
  </div>
</body>
</html>`

  await page.setViewportSize({ width: 800, height: 400 })
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => document.fonts.ready)
  await sleep(500)
  await page.screenshot({ path: outputPath, type: 'png' })
}

// ─── Product Image Scraping ───

interface ScrapedImage {
  url: string
  width: number
}

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

async function scrapeProductImages(page: Page, url: string, productName: string): Promise<string[]> {
  log(`  Scraping: ${url}`)

  try {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    })

    if (!response || response.status() >= 400) {
      warn(`  Got status ${response?.status()} for ${url}`)
      return []
    }

    await sleep(3000)

    // Dismiss cookie banners
    try {
      const dismissSelectors = [
        '[class*="cookie"] button',
        '[class*="Cookie"] button',
        '[id*="cookie"] button',
        '[class*="consent"] button',
        '[class*="banner"] button[class*="close"]',
        '[class*="modal"] button[class*="close"]',
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

    await sleep(1000)

    // Collect images
    const images: ScrapedImage[] = await page.evaluate(() => {
      const results: { url: string; width: number }[] = []
      const seen = new Set<string>()

      document.querySelectorAll('img').forEach((img) => {
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
    })

    const filtered = images
      .filter((img) => {
        if (img.width < 300) return false
        return !SKIP_PATTERNS.some((p) => p.test(img.url))
      })
      .sort((a, b) => b.width - a.width)
      .slice(0, 5)

    return filtered.map((img) => img.url)
  } catch (err) {
    warn(`  Scrape failed for ${productName}: ${err}`)
    return []
  }
}

async function downloadImage(imageUrl: string, outputPath: string): Promise<boolean> {
  try {
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
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

// ─── Fallback Info-Card ───

async function generateFallbackCard(
  page: Page,
  product: {
    name: string
    brand: string
    price?: number
    overallScore?: number
    cargoLayout?: string
    motorBrand?: string
    weightLbs?: number
  },
  outputPath: string,
): Promise<void> {
  const specs = [
    product.cargoLayout && `Layout: ${product.cargoLayout}`,
    product.motorBrand && `Motor: ${product.motorBrand}`,
    product.weightLbs && `Weight: ${product.weightLbs} lbs`,
    product.price && `MSRP: $${product.price.toLocaleString()}`,
  ]
    .filter(Boolean)
    .join(' &middot; ')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1200px;
      height: 800px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #E8E0D4 0%, #D4CCC0 100%);
      font-family: 'Inter', sans-serif;
    }
    .card { text-align: center; max-width: 800px; padding: 60px; }
    .brand {
      font-family: 'Inter', sans-serif;
      font-size: 18px;
      font-weight: 500;
      color: #7A7A8C;
      text-transform: uppercase;
      letter-spacing: 3px;
      margin-bottom: 16px;
    }
    .name {
      font-family: 'Fraunces', serif;
      font-size: 52px;
      font-weight: 600;
      color: #1A1A2E;
      line-height: 1.2;
      letter-spacing: -1px;
    }
    .divider {
      width: 80px;
      height: 3px;
      background: #E85D3A;
      margin: 28px auto;
      border-radius: 2px;
    }
    .specs { font-size: 16px; color: #7A7A8C; letter-spacing: 0.3px; line-height: 1.6; }
    .score {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #E85D3A;
      color: white;
      font-family: 'Inter', sans-serif;
      font-size: 20px;
      font-weight: 600;
      margin-top: 24px;
    }
    .score-label {
      font-size: 12px;
      color: #7A7A8C;
      margin-top: 8px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">${escapeHtml(product.brand)}</div>
    <div class="name">${escapeHtml(product.name)}</div>
    <div class="divider"></div>
    <div class="specs">${specs}</div>
    ${product.overallScore ? `<div class="score">${product.overallScore}</div><div class="score-label">Carryish Score</div>` : ''}
  </div>
</body>
</html>`

  await page.setViewportSize({ width: 1200, height: 800 })
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => document.fonts.ready)
  await sleep(500)
  await page.screenshot({ path: outputPath, type: 'png' })
}

// ─── Main Pipeline ───

interface Brand {
  id: number
  name: string
  slug: string
  logo?: { id: number } | number | null
  logoStatus?: string
}

interface Product {
  id: number
  name: string
  slug: string
  affiliateUrl: string
  brand: { id: number; name: string } | null
  price?: number
  overallScore?: number
  cargoLayout?: string
  motorBrand?: string
  weightLbs?: number
  images?: unknown[]
  imageStatus?: string
}

async function processBrands(brands: Brand[], token: string, browser: Browser) {
  log('\n=== PROCESSING BRAND LOGOS ===')
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()

  let processed = 0
  let skipped = 0

  for (const brand of brands) {
    const hasLogo = brand.logo && (typeof brand.logo === 'object' ? brand.logo.id : brand.logo)

    if (hasLogo && !FLAG_FORCE) {
      log(`  [skip] ${brand.name} — already has logo`)
      skipped++
      continue
    }

    if (FLAG_DRY_RUN) {
      dryLog(`Would generate placeholder logo for: ${brand.name}`)
      continue
    }

    try {
      const pngPath = path.join(TMP_DIR, `brand-${brand.slug}.png`)
      log(`Generating logo: ${brand.name}`)
      await generateBrandLogo(page, brand.name, pngPath)

      // Optimize: convert to WebP
      const webpPath = await processImage(pngPath)

      log(`  Uploading logo...`)
      const mediaId = await uploadMedia(webpPath, `${brand.name} logo`, token)
      log(`  Uploaded (media ID: ${mediaId}). Patching brand...`)
      await patchBrand(brand.id, { logo: mediaId, logoStatus: 'placeholder' }, token)
      log(`  Done: ${brand.name}`)
      processed++
    } catch (err) {
      warn(`  Failed for ${brand.name}: ${err}`)
    }
  }

  await page.close()
  await context.close()
  log(`\nBrands: ${processed} processed, ${skipped} skipped`)
}

async function processProducts(products: Product[], token: string, browser: Browser) {
  log('\n=== PROCESSING PRODUCT IMAGES ===')
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  })
  const scrapePage = await context.newPage()

  let scraped = 0
  let fallbacks = 0
  let skipped = 0
  let failed = 0

  for (const product of products) {
    const brandName =
      product.brand && typeof product.brand === 'object' ? product.brand.name : 'Unknown'

    log(`\nProcessing: ${product.name} (${brandName})`)

    // Skip if already has images (unless --force)
    if (product.images && product.images.length > 0 && !FLAG_FORCE) {
      log(`  [skip] Already has ${product.images.length} images`)
      skipped++
      continue
    }

    if (FLAG_DRY_RUN) {
      const willSkipSite = product.affiliateUrl && shouldSkipSite(product.affiliateUrl)
      if (willSkipSite) {
        dryLog(`Would generate fallback card for: ${product.name} (site blocked)`)
      } else if (product.affiliateUrl) {
        dryLog(`Would scrape images from: ${product.affiliateUrl}`)
      } else {
        dryLog(`Would generate fallback card for: ${product.name} (no affiliate URL)`)
      }
      continue
    }

    try {
      const imageIds: number[] = []
      let didScrape = false

      // Try scraping if we have a URL and the site isn't blocked
      if (product.affiliateUrl && !shouldSkipSite(product.affiliateUrl)) {
        const imageUrls = await scrapeProductImages(scrapePage, product.affiliateUrl, product.name)

        if (imageUrls.length > 0) {
          log(`  Found ${imageUrls.length} images. Downloading & optimizing...`)
          let downloadCount = 0

          for (let i = 0; i < imageUrls.length; i++) {
            const ext = imageUrls[i].match(/\.(webp|jpg|jpeg|png|avif)/i)?.[1] || 'png'
            const rawPath = path.join(TMP_DIR, `product-${product.slug}-${i}.${ext}`)

            const ok = await downloadImage(imageUrls[i], rawPath)
            if (ok) {
              try {
                // Optimize with sharp
                const optimizedPath = await processImage(rawPath)
                const mediaId = await uploadMedia(
                  optimizedPath,
                  `${product.name} - image ${i + 1}`,
                  token,
                )
                imageIds.push(mediaId)
                downloadCount++
                log(`  Uploaded image ${i + 1} (media ID: ${mediaId})`)
              } catch (err) {
                warn(`  Upload failed for image ${i + 1}: ${err}`)
              }
            } else {
              warn(`  Download failed for: ${imageUrls[i].substring(0, 80)}...`)
            }
          }

          if (downloadCount > 0) didScrape = true
        }
      } else if (product.affiliateUrl) {
        log(`  Site blocked by override, skipping to fallback`)
      }

      // Fallback: generate info-card
      if (!didScrape) {
        log(`  No images scraped. Generating fallback card...`)
        const cardPngPath = path.join(TMP_DIR, `product-${product.slug}-card.png`)
        const fallbackPage = await context.newPage()
        try {
          await generateFallbackCard(
            fallbackPage,
            {
              name: product.name,
              brand: brandName,
              price: product.price,
              overallScore: product.overallScore,
              cargoLayout: product.cargoLayout,
              motorBrand: product.motorBrand,
              weightLbs: product.weightLbs,
            },
            cardPngPath,
          )

          // Optimize fallback card
          const optimizedPath = await processImage(cardPngPath)
          const mediaId = await uploadMedia(
            optimizedPath,
            `${product.name} - editorial card`,
            token,
          )
          imageIds.push(mediaId)
          log(`  Uploaded fallback card (media ID: ${mediaId})`)
        } catch (err) {
          warn(`  Fallback card failed: ${err}`)
        } finally {
          await fallbackPage.close()
        }
      }

      // Patch product with images and status
      if (imageIds.length > 0) {
        const imageStatus = didScrape ? 'scraped' : 'placeholder'
        await patchProduct(
          product.id,
          { images: imageIds, imageStatus, _status: 'published' },
          token,
        )
        log(`  Patched product with ${imageIds.length} image(s), status: ${imageStatus}`)
        if (didScrape) scraped++
        else fallbacks++
      } else {
        failed++
      }
    } catch (err) {
      warn(`  Skipping ${product.name} due to error: ${err}`)
      failed++
    }

    // Be polite between requests
    await sleep(2000)
  }

  await scrapePage.close()
  await context.close()
  log(`\nProducts: ${scraped} scraped, ${fallbacks} fallbacks, ${skipped} skipped, ${failed} failed`)
}

async function main() {
  log('Image Pipeline starting...')
  log(`  URL: ${BASE_URL}`)
  log(`  Mode: ${FLAG_DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  log(`  Scope: ${DO_BRANDS && DO_PRODUCTS ? 'all' : DO_BRANDS ? 'brands' : 'products'}`)
  if (FLAG_PRODUCT_SLUG) log(`  Single product: ${FLAG_PRODUCT_SLUG}`)
  if (FLAG_FORCE) log(`  Force: re-processing existing images`)

  // Create temp directory
  if (!FLAG_DRY_RUN) {
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true })
    }
  }

  // Login
  const token = await login()

  // Fetch data
  log('Fetching brands...')
  const brandsRes = await fetch(`${BASE_URL}/api/brands?limit=100&depth=1`, {
    headers: { Authorization: `JWT ${token}` },
  })
  const brandsData = await brandsRes.json()
  const brands: Brand[] = brandsData.docs

  log('Fetching products...')
  let productsUrl = `${BASE_URL}/api/products?limit=100&depth=1&where[_status][equals]=published`
  if (FLAG_PRODUCT_SLUG) {
    productsUrl += `&where[slug][equals]=${FLAG_PRODUCT_SLUG}`
  }
  const productsRes = await fetch(productsUrl, {
    headers: { Authorization: `JWT ${token}` },
  })
  const productsData = await productsRes.json()
  const products: Product[] = productsData.docs

  log(`Found ${brands.length} brands and ${products.length} products.`)

  if (FLAG_PRODUCT_SLUG && products.length === 0) {
    warn(`No product found with slug "${FLAG_PRODUCT_SLUG}"`)
    process.exit(1)
  }

  // Launch browser (needed for logo generation and fallback cards)
  log('Launching Chromium...')
  const browser: Browser = await chromium.launch({ headless: true })

  try {
    if (DO_BRANDS) {
      await processBrands(brands, token, browser)
    }

    if (DO_PRODUCTS) {
      await processProducts(products, token, browser)
    }
  } finally {
    await browser.close()
  }

  // Cleanup
  if (!FLAG_DRY_RUN && fs.existsSync(TMP_DIR)) {
    log('\nCleaning up temp files...')
    fs.rmSync(TMP_DIR, { recursive: true, force: true })
  }

  log('\nDone!')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})

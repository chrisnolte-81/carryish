# Carryish Image Pipeline — Claude Code Project Spec

## What this is

A Node.js CLI tool that scrapes every cargo bike manufacturer's website, downloads all product images, normalizes them to a consistent format, and organizes them by brand/model for import into the Carryish catalog (Payload CMS).

The goal: build the richest possible media library for ~100 parent products across ~40 brands. Every angle, every color, every lifestyle shot. White background, consistent dimensions, ready to serve.

## Tech stack

- **Node.js** (TypeScript)
- **Firecrawl SDK** (`@mendable/firecrawl-js`) — for scraping non-Shopify sites
- **Sharp** — image processing (resize, background normalization, format conversion)
- **Got / node-fetch** — HTTP for Shopify JSON endpoints and direct image downloads
- **fs-extra** — file management
- **xlsx** (SheetJS) — read the master catalog spreadsheet as the input manifest

## Input

The master spreadsheet (`carryish_cargo_bike_catalog.xlsx`) serves as the manifest. The scraper reads the **Products** sheet and **Scraper Config** sheet to know:
- Which brands to scrape
- What extraction method to use per brand
- Product page URLs to hit
- Shopify JSON endpoints where available

## Output structure

```
/output/
  /images/
    /tern/
      /gsd-gen-3/
        /studio/
          gsd-s10-white-side.jpg
          gsd-s10-white-front.jpg
          gsd-s10-white-rear.jpg
          gsd-s10-white-detail-motor.jpg
          gsd-s10-white-detail-display.jpg
          gsd-s10-folded.jpg
        /lifestyle/
          gsd-family-park.jpg
          gsd-commute-urban.jpg
        /raw/
          (original unprocessed downloads)
        manifest.json
    /riese-muller/
      /packster2-70/
        /studio/
        /lifestyle/
        /raw/
        manifest.json
    ...
  catalog-with-images.xlsx   (updated spreadsheet with actual image paths)
  scrape-report.json         (what worked, what failed, what needs manual review)
```

### manifest.json per model

```json
{
  "brand": "Tern",
  "model": "GSD Gen 3",
  "slug": "gsd-gen-3",
  "scraped_at": "2026-04-08T...",
  "source_urls": ["https://store.ternbicycles.com/products/gsd-s10-gen-3"],
  "images": [
    {
      "filename": "gsd-s10-white-side.jpg",
      "original_url": "https://cdn.shopify.com/s/files/1/...",
      "type": "studio",
      "width": 2048,
      "height": 2048,
      "dominant_color": "#ffffff",
      "has_shadow": true,
      "background": "white",
      "variant": "S10",
      "color": "White",
      "angle": "side",
      "processed": true
    }
  ],
  "studio_count": 12,
  "lifestyle_count": 5,
  "total": 17
}
```

## Phase 1: Scrape all images

### Step 1a: Shopify brands (24 brands, ~60 products)

For each product in the spreadsheet where `Shopify JSON Available = Yes`:

```typescript
// Hit the per-product JSON endpoint
const res = await fetch(`https://${domain}/products/${handle}.json`);
const { product } = await res.json();

// product.images is an array with:
// - src (full CDN URL)
// - width, height
// - alt (sometimes descriptive)
// - position (ordering)

for (const img of product.images) {
  // Download max resolution: append no width param or use ?width=2048
  const url = img.src.replace(/\?.*$/, ''); // strip any size params
  await downloadImage(url, outputPath);
}
```

**Key Shopify detail:** Append `?width=2048` to get the largest available resolution without the original upload. Some Shopify stores block the raw original but serve up to 4472px via the CDN resize param.

Products also have `product.body_html` — parse this for any additional images embedded in the description (common for lifestyle shots and comparison charts).

### Step 1b: Firecrawl for non-Shopify brands (~15 brands, ~40 products)

```typescript
import Firecrawl from '@mendable/firecrawl-js';

const app = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

// Option A: Scrape with extract schema
const result = await app.scrapeUrl(productPageUrl, {
  formats: ['markdown', 'html'],
  actions: [
    { type: 'wait', milliseconds: 3000 }, // wait for JS galleries to load
    { type: 'scroll', direction: 'down', amount: 3 }, // trigger lazy-loaded images
  ]
});

// Parse HTML for all image URLs
// Look for: <img src="...">, <source srcset="...">, data-src, data-zoom-image
// Filter by CDN domain patterns from Scraper Config sheet
```

**For R&M, Urban Arrow, Trek, Specialized, Cannondale** — these use JS-rendered galleries. Firecrawl's headless browser handles this. The `actions` array lets us scroll to trigger lazy loading.

**Firecrawl credit budget:**
- ~40 non-Shopify product pages × 1 credit = 40 credits
- Free tier gives 500 credits — plenty of headroom
- Use `map` endpoint first to discover all product URLs per domain (1 credit per domain)

### Step 1c: Direct image discovery via sitemaps

Before scraping pages, check for image sitemaps:
- `{domain}/sitemap.xml` → look for `<image:image>` tags
- `{domain}/sitemap_images_1.xml` (Shopify pattern)
- `{domain}/robots.txt` → find sitemap URLs

Many brands expose image URLs in sitemaps that aren't visible on product pages.

## Phase 2: Classify images (studio vs lifestyle)

After downloading, auto-classify each image:

```typescript
import sharp from 'sharp';

async function classifyImage(filepath: string) {
  const { dominant } = await sharp(filepath).stats();
  const metadata = await sharp(filepath).metadata();

  // Heuristics for studio vs lifestyle:
  const isWhiteBg = dominant.r > 240 && dominant.g > 240 && dominant.b > 240;
  const isGrayBg = Math.abs(dominant.r - dominant.g) < 10
                && Math.abs(dominant.g - dominant.b) < 10
                && dominant.r > 200;
  const isStudio = isWhiteBg || isGrayBg;

  // Additional signals from filename/alt text:
  // - "lifestyle", "action", "family", "urban", "outdoor" → lifestyle
  // - "side", "front", "rear", "detail", "angle", "cutout" → studio
  // - Image aspect ratio: studio tends to be 1:1, lifestyle tends to be 16:9 or 3:2

  return {
    type: isStudio ? 'studio' : 'lifestyle',
    background: isWhiteBg ? 'white' : isGrayBg ? 'gray' : 'complex',
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
  };
}
```

For borderline cases, flag for manual review in the scrape report.

## Phase 3: Normalize images

### Studio images

Target output: **2048×2048 px, white background, centered product, WebP + JPEG**

```typescript
async function normalizeStudio(input: string, output: string) {
  const img = sharp(input);
  const meta = await img.metadata();

  // 1. Trim transparent/white edges to find the product bounds
  const trimmed = await img.trim({ threshold: 20 }).toBuffer({ resolveWithObject: true });

  // 2. Resize to fit within 1800x1800 (leaving padding room)
  const resized = await sharp(trimmed.data)
    .resize(1800, 1800, { fit: 'inside', withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });

  // 3. Place on 2048x2048 white canvas, centered
  await sharp({
    create: {
      width: 2048,
      height: 2048,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    }
  })
    .composite([{
      input: resized.data,
      gravity: 'centre',
    }])
    .jpeg({ quality: 92, progressive: true })
    .toFile(output.replace(/\.\w+$/, '.jpg'));

  // Also output WebP for modern browsers
  await sharp(/* same pipeline */)
    .webp({ quality: 85 })
    .toFile(output.replace(/\.\w+$/, '.webp'));
}
```

### Lifestyle images

Target output: **2048px on longest edge, original aspect ratio, WebP + JPEG**

```typescript
async function normalizeLifestyle(input: string, output: string) {
  await sharp(input)
    .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88, progressive: true })
    .toFile(output.replace(/\.\w+$/, '.jpg'));

  await sharp(input)
    .webp({ quality: 82 })
    .toFile(output.replace(/\.\w+$/, '.webp'));
}
```

### Thumbnails

Generate 3 sizes for each image:
- **Large**: 2048px (detail view)
- **Medium**: 800px (product card)
- **Thumb**: 400px (grid/search results)

## Phase 4: Quality gate

Flag images for manual review if:
- Resolution below 800px on either axis (too small for product detail)
- Dominant color detection is ambiguous (not clearly white/gray bg)
- File size under 20KB (likely a placeholder or icon)
- File size over 15MB (likely uncompressed, needs attention)
- Image is exact duplicate of another (perceptual hash comparison)
- Alt text or filename contains "placeholder", "coming-soon", "temp"

## Phase 5: Generate reports

### scrape-report.json

```json
{
  "run_date": "2026-04-08",
  "summary": {
    "brands_scraped": 40,
    "products_scraped": 103,
    "total_images_downloaded": 1247,
    "studio_images": 834,
    "lifestyle_images": 413,
    "failed_downloads": 12,
    "flagged_for_review": 28,
    "total_disk_usage_mb": 4200
  },
  "by_brand": {
    "Tern": {
      "products": 8,
      "images": 142,
      "studio": 96,
      "lifestyle": 46,
      "failed": 0
    }
  },
  "failures": [
    {
      "brand": "Ferla",
      "url": "https://...",
      "error": "403 Forbidden",
      "suggestion": "Try with Firecrawl premium proxy"
    }
  ],
  "review_queue": [
    {
      "filepath": "/images/benno/boost/raw/img_0234.jpg",
      "reason": "ambiguous_classification",
      "confidence": 0.4
    }
  ]
}
```

### Updated spreadsheet

Write back to the catalog spreadsheet:
- Actual studio image count per product
- Actual lifestyle image count per product
- Image directory path
- Quality score (0-100 based on resolution, count, variety)
- Missing image flag (products with < 3 images)

## CLI commands

```bash
# Full pipeline
npx carryish-scrape --all

# Single brand
npx carryish-scrape --brand "Tern"

# Just Shopify brands (no Firecrawl credits needed)
npx carryish-scrape --shopify-only

# Just normalize already-downloaded images
npx carryish-scrape --normalize-only

# Generate report from existing downloads
npx carryish-scrape --report

# Re-scrape failed items
npx carryish-scrape --retry-failed
```

## Environment variables

```env
FIRECRAWL_API_KEY=fc-...
OUTPUT_DIR=./output
CATALOG_PATH=./carryish_cargo_bike_catalog.xlsx
MAX_CONCURRENT=5
IMAGE_TARGET_SIZE=2048
JPEG_QUALITY=92
WEBP_QUALITY=85
```

## Rate limiting

- Shopify CDN: 2 requests/sec per domain (they rate-limit aggressively)
- Firecrawl: handled by their API (Standard plan = 50 req/min)
- Direct downloads: 1 request/sec per domain, randomized 1-3s delay
- Respect robots.txt (check via Firecrawl's built-in handling)

## Expected output

Based on the research:
- **~100 products × ~12 images average = ~1,200 images**
- Studio: ~800 images
- Lifestyle: ~400 images
- Disk: ~4-6 GB raw, ~2-3 GB normalized
- Firecrawl credits needed: ~50-80 (well within free tier)
- Runtime: ~30-45 minutes for full scrape + normalize

## What this doesn't do (yet)

- Shadow generation (Phase 2 — Photoroom API when ready)
- Spec extraction from product pages (separate pipeline)
- Upload to Payload CMS (separate integration)
- Ongoing monitoring for new/changed products (cron job, Phase 2)
- Background removal for non-white backgrounds (Photoroom or rembg)

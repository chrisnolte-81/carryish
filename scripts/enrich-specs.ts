/**
 * Extract detailed product specs from manufacturer pages.
 * Uses Firecrawl to scrape markdown, then Claude API to extract structured specs.
 *
 * Usage:
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/enrich-specs.ts
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/enrich-specs.ts --dry-run
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/enrich-specs.ts --product=tern-gsd-gen-3
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import Firecrawl from '@mendable/firecrawl-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../data/specs')
const BASE_URL = process.env.PAYLOAD_URL || 'http://localhost:3000'
const EMAIL = process.env.PAYLOAD_EMAIL || 'demo-author@example.com'
const PASSWORD = process.env.PAYLOAD_PASSWORD || 'password'
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY || ''

const args = process.argv.slice(2)
const FLAG_DRY_RUN = args.includes('--dry-run')
const FLAG_PRODUCT = args.find((a) => a.startsWith('--product='))?.split('=')[1]
const FLAG_FORCE = args.includes('--force')

// ─── URL overrides for products with bad affiliate URLs ───
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
}

const EXTRACTION_PROMPT = `Extract structured specifications from this product page content. Return a JSON object with ONLY the fields you can confidently extract from the text. If a value isn't mentioned, omit that field entirely — do NOT guess.

Expected JSON structure:
{
  "motor": {
    "brand": "e.g. Bosch, Shimano, Bafang",
    "model": "e.g. Cargo Line, EP8",
    "type": "mid-drive | hub-rear | hub-front | pedal-by-wire",
    "watts_nominal": 250,
    "watts_peak": 750,
    "torque_nm": 85,
    "pedal_assist_levels": 4
  },
  "battery": {
    "brand": "e.g. Bosch, Samsung",
    "wh": 545,
    "voltage": 36,
    "removable": true,
    "dual_option": true,
    "dual_wh": 1090,
    "charge_time_hours": 4.5
  },
  "speed_class": "class-1 | class-2 | class-3",
  "throttle": "none | thumb | twist | pedal-activated",
  "top_speed_mph": 20,
  "range_stated_miles": 50,
  "drivetrain": {
    "type": "chain | belt | shaft",
    "brand": "e.g. Shimano, Enviolo, SRAM",
    "gears": 10,
    "gear_type": "derailleur | internal-hub | cvp | single-speed"
  },
  "brakes": {
    "type": "hydraulic-disc | mechanical-disc | rim",
    "brand": "e.g. Shimano, Magura, Tektro",
    "abs": false
  },
  "frame": {
    "material": "e.g. 6061 aluminum, steel, chromoly",
    "suspension_front": "e.g. none, RST, RockShox",
    "suspension_rear": "e.g. none, spring"
  },
  "wheels": {
    "front_size": "e.g. 20in, 24in, 26in",
    "rear_size": "e.g. 20in, 24in",
    "tire_brand": "e.g. Schwalbe, Kenda",
    "tire_width": 2.4,
    "puncture_protection": true
  },
  "dimensions": {
    "weight_lbs": 75,
    "max_capacity_lbs": 463,
    "cargo_capacity_lbs": 200,
    "length_inches": 73,
    "wheelbase_inches": 50,
    "standover_inches": 24,
    "rider_height_min": "4'11\"",
    "rider_height_max": "6'5\"",
    "foldable": true
  },
  "features": {
    "lights": true,
    "fenders": true,
    "kickstand": "e.g. dual-leg, center, none",
    "display": "e.g. Bosch Kiox 300, LCD",
    "gps": false,
    "lock": false
  },
  "passenger_capacity": 2,
  "price_usd": 5799,
  "price_usd_max": 9499,
  "warranty_years": 5
}

Convert all weights to lbs and distances to miles/inches if given in metric.
Return ONLY valid JSON. No markdown, no explanation.`

function log(msg: string) { console.log(`[enrich-specs] ${msg}`) }
function warn(msg: string) { console.warn(`[enrich-specs] ⚠ ${msg}`) }

async function login(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status}`)
  return (await res.json()).token
}

/**
 * Extract spec-relevant sections from page markdown.
 * Product pages often have 50K+ of cookie banners, nav, footer — we only want specs.
 */
function extractSpecSections(markdown: string): string {
  const lines = markdown.split('\n')
  const specKeywords = /spec|motor|battery|weight|torque|watt|range|class|speed|brakes?|drivetrain|gears?|wheel|tire|frame|capacity|dimension|height|foldable|display|suspension|charge|voltage|amp/i
  const boilerKeywords = /cookie|privacy|gdpr|analytics|tracking|consent|wishlist|newsletter|subscribe|footer|copyright|terms of service/i

  // Find lines that look like spec data and their surrounding context
  const specLines: number[] = []
  for (let i = 0; i < lines.length; i++) {
    if (specKeywords.test(lines[i]) && !boilerKeywords.test(lines[i])) {
      specLines.push(i)
    }
  }

  if (specLines.length === 0) {
    // Fallback: use the last 12K chars (specs are usually at the bottom)
    return markdown.slice(-12000)
  }

  // Build content from spec-rich regions with context
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
  // Cap at ~15K chars for Claude
  return result.length > 15000 ? result.slice(0, 15000) : result
}

async function main() {
  log('=== Product Spec Extraction ===')
  log(`Mode: ${FLAG_DRY_RUN ? 'DRY RUN' : 'SCRAPE + EXTRACT'}`)

  if (!FIRECRAWL_KEY) throw new Error('FIRECRAWL_API_KEY not set')
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

  const firecrawl = new Firecrawl({ apiKey: FIRECRAWL_KEY })
  const anthropic = new Anthropic()

  const token = await login()
  log('Logged in')

  // Fetch all products
  const res = await fetch(
    `${BASE_URL}/api/products?limit=200&depth=1&where[_status][equals]=published`,
    { headers: { Authorization: `JWT ${token}` } },
  )
  const products = (await res.json()).docs as any[]
  log(`Found ${products.length} published products`)

  let extracted = 0
  let skipped = 0
  let failed = 0
  const coverage: Record<string, number> = {}

  for (const product of products) {
    const slug = product.slug
    if (FLAG_PRODUCT && slug !== FLAG_PRODUCT) continue

    // Skip if already extracted (unless --force)
    const outputPath = path.join(DATA_DIR, `${slug}.json`)
    if (fs.existsSync(outputPath) && !FLAG_FORCE) {
      skipped++
      continue
    }

    const brand = typeof product.brand === 'object' ? product.brand?.name : ''
    const label = `${brand} ${product.name}`
    log(`\n── ${label} ──`)

    // Get the best URL for this product
    const url = URL_OVERRIDES[slug] || product.affiliateUrl
    if (!url) {
      warn('No URL available')
      failed++
      continue
    }

    if (FLAG_DRY_RUN) {
      log(`  Would extract from: ${url}`)
      continue
    }

    try {
      // Step 1: Scrape page with Firecrawl
      log(`  Scraping: ${url}`)
      const scrapeResult = await firecrawl.scrape(url, {
        formats: ['markdown'],
        waitFor: 3000,
        timeout: 30000,
      })

      const markdown = scrapeResult.markdown || ''
      if (!markdown || markdown.length < 100) {
        warn(`  Page content too short (${markdown.length} chars)`)
        failed++
        continue
      }
      log(`  Got ${markdown.length} chars of content`)

      // Step 2: Extract spec-relevant sections from the markdown
      // Many product pages have long cookie/boilerplate at the top — find spec content
      const specContent = extractSpecSections(markdown)

      // Call Claude with rate limit retry
      let text = ''
      let retries = 0
      while (retries < 3) {
        try {
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000,
            messages: [{
              role: 'user',
              content: `Product: ${label}\nURL: ${url}\n\nPAGE CONTENT:\n${specContent}\n\n${EXTRACTION_PROMPT}`,
            }],
          })
          text = response.content
            .filter((c): c is Anthropic.TextBlock => c.type === 'text')
            .map((c) => c.text)
            .join('')
          break
        } catch (apiErr: any) {
          if (apiErr?.error?.type === 'rate_limit_error' && retries < 2) {
            const wait = (retries + 1) * 30
            log(`  Rate limited, waiting ${wait}s...`)
            await new Promise((r) => setTimeout(r, wait * 1000))
            retries++
          } else {
            throw apiErr
          }
        }
      }

      let specs: any
      try {
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
        specs = JSON.parse(jsonMatch ? jsonMatch[1] : text)
      } catch {
        warn(`  Failed to parse Claude response`)
        fs.writeFileSync(outputPath + '.raw', text)
        failed++
        continue
      }

      fs.writeFileSync(outputPath, JSON.stringify(specs, null, 2))
      log(`  Extracted ${Object.keys(specs).length} top-level fields`)
      extracted++

      // Track coverage
      const fields = countFields(specs)
      for (const [field, has] of Object.entries(fields)) {
        if (!coverage[field]) coverage[field] = 0
        if (has) coverage[field]++
      }
    } catch (err: any) {
      warn(`  Error: ${err.message || err}`)
      failed++
    }

    // Rate limit (Firecrawl + Claude)
    await new Promise((r) => setTimeout(r, 1500))
  }

  // Print report
  console.log('\n' + '═'.repeat(60))
  console.log('  SPEC EXTRACTION REPORT')
  console.log('═'.repeat(60))
  console.log(`  Total products:  ${products.length}`)
  console.log(`  Extracted:       ${extracted}`)
  console.log(`  Skipped (cached):${skipped}`)
  console.log(`  Failed:          ${failed}`)
  console.log('═'.repeat(60))

  if (Object.keys(coverage).length > 0) {
    console.log('\n  Field coverage:')
    for (const [field, count] of Object.entries(coverage).sort((a, b) => b[1] - a[1])) {
      const pct = Math.round((count / extracted) * 100)
      console.log(`    ${field}: ${count}/${extracted} (${pct}%)`)
    }
  }
}

function countFields(obj: any, prefix = ''): Record<string, boolean> {
  const result: Record<string, boolean> = {}
  for (const [key, value] of Object.entries(obj)) {
    const fieldName = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, countFields(value, fieldName))
    } else {
      result[fieldName] = value !== null && value !== undefined && value !== ''
    }
  }
  return result
}

main().catch((err) => {
  console.error('[enrich-specs] Fatal:', err)
  process.exit(1)
})

/**
 * Extract detailed product specs from manufacturer pages using Firecrawl extract.
 *
 * Usage:
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/enrich-specs.ts
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/enrich-specs.ts --dry-run
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/enrich-specs.ts --product=tern-gsd-gen-3
 */

import 'dotenv/config'
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

// Firecrawl extract schema for bike specs
const EXTRACT_SCHEMA = {
  type: 'object' as const,
  properties: {
    motor: {
      type: 'object' as const,
      properties: {
        brand: { type: 'string' as const },
        model: { type: 'string' as const },
        type: { type: 'string' as const, enum: ['mid-drive', 'hub-rear', 'hub-front', 'pedal-by-wire'] },
        watts_nominal: { type: 'number' as const },
        watts_peak: { type: 'number' as const },
        torque_nm: { type: 'number' as const },
        pedal_assist_levels: { type: 'number' as const },
      },
    },
    battery: {
      type: 'object' as const,
      properties: {
        brand: { type: 'string' as const },
        wh: { type: 'number' as const },
        voltage: { type: 'number' as const },
        removable: { type: 'boolean' as const },
        dual_option: { type: 'boolean' as const },
        dual_wh: { type: 'number' as const },
        charge_time_hours: { type: 'number' as const },
      },
    },
    speed_class: { type: 'string' as const, enum: ['class-1', 'class-2', 'class-3'] },
    throttle: { type: 'string' as const, enum: ['none', 'thumb', 'twist', 'pedal-activated'] },
    top_speed_mph: { type: 'number' as const },
    range_stated_miles: { type: 'number' as const },
    drivetrain: {
      type: 'object' as const,
      properties: {
        type: { type: 'string' as const, enum: ['chain', 'belt', 'shaft'] },
        brand: { type: 'string' as const },
        gears: { type: 'number' as const },
        gear_type: { type: 'string' as const, enum: ['derailleur', 'internal-hub', 'cvp', 'single-speed'] },
      },
    },
    brakes: {
      type: 'object' as const,
      properties: {
        type: { type: 'string' as const, enum: ['hydraulic-disc', 'mechanical-disc', 'rim'] },
        brand: { type: 'string' as const },
        abs: { type: 'boolean' as const },
      },
    },
    frame: {
      type: 'object' as const,
      properties: {
        material: { type: 'string' as const },
        suspension_front: { type: 'string' as const },
        suspension_rear: { type: 'string' as const },
      },
    },
    wheels: {
      type: 'object' as const,
      properties: {
        front_size: { type: 'string' as const },
        rear_size: { type: 'string' as const },
        tire_brand: { type: 'string' as const },
        tire_width: { type: 'number' as const },
        puncture_protection: { type: 'boolean' as const },
      },
    },
    dimensions: {
      type: 'object' as const,
      properties: {
        weight_lbs: { type: 'number' as const },
        max_capacity_lbs: { type: 'number' as const },
        cargo_capacity_lbs: { type: 'number' as const },
        length_inches: { type: 'number' as const },
        wheelbase_inches: { type: 'number' as const },
        standover_inches: { type: 'number' as const },
        rider_height_min: { type: 'string' as const },
        rider_height_max: { type: 'string' as const },
        foldable: { type: 'boolean' as const },
      },
    },
    features: {
      type: 'object' as const,
      properties: {
        lights: { type: 'boolean' as const },
        fenders: { type: 'boolean' as const },
        kickstand: { type: 'string' as const },
        display: { type: 'string' as const },
        gps: { type: 'boolean' as const },
        lock: { type: 'boolean' as const },
      },
    },
    passenger_capacity: { type: 'number' as const },
    price_usd: { type: 'number' as const },
    price_usd_max: { type: 'number' as const },
    warranty_years: { type: 'number' as const },
  },
}

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

async function main() {
  log('=== Product Spec Extraction ===')
  log(`Mode: ${FLAG_DRY_RUN ? 'DRY RUN' : 'EXTRACT + SAVE'}`)

  if (!FIRECRAWL_KEY) throw new Error('FIRECRAWL_API_KEY not set')
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

  const firecrawl = new Firecrawl({ apiKey: FIRECRAWL_KEY })

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

    // Skip if already extracted
    const outputPath = path.join(DATA_DIR, `${slug}.json`)
    if (fs.existsSync(outputPath)) {
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
      log(`  Extracting from: ${url}`)
      const result = await firecrawl.scrapeUrl(url, {
        formats: ['extract'],
        extract: {
          schema: EXTRACT_SCHEMA,
        },
      })

      if (result.success && result.extract) {
        fs.writeFileSync(outputPath, JSON.stringify(result.extract, null, 2))
        log(`  Saved to ${outputPath}`)
        extracted++

        // Track coverage
        const fields = countFields(result.extract)
        for (const [field, has] of Object.entries(fields)) {
          if (!coverage[field]) coverage[field] = 0
          if (has) coverage[field]++
        }
      } else {
        warn(`  Extract returned no data`)
        failed++
      }
    } catch (err: any) {
      warn(`  Firecrawl error: ${err.message || err}`)
      failed++
    }

    // Rate limit
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

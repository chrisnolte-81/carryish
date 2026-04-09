/**
 * Merge all enrichment data into Payload CMS.
 * Reads from data/specs/, data/content/, and data/comparisons.json,
 * then patches each product via REST API.
 *
 * Usage:
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/enrich-import.ts
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/enrich-import.ts --dry-run
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/enrich-import.ts --product=tern-gsd-gen-3
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/enrich-import.ts --content-only
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/enrich-import.ts --specs-only
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SPEC_DIR = path.join(__dirname, '../data/specs')
const CONTENT_DIR = path.join(__dirname, '../data/content')
const DATA_DIR = path.join(__dirname, '../data')
const BASE_URL = process.env.PAYLOAD_URL || 'http://localhost:3000'
const EMAIL = process.env.PAYLOAD_EMAIL || 'demo-author@example.com'
const PASSWORD = process.env.PAYLOAD_PASSWORD || 'password'

const args = process.argv.slice(2)
const FLAG_DRY_RUN = args.includes('--dry-run')
const FLAG_PRODUCT = args.find((a) => a.startsWith('--product='))?.split('=')[1]
const FLAG_CONTENT_ONLY = args.includes('--content-only')
const FLAG_SPECS_ONLY = args.includes('--specs-only')

function log(msg: string) { console.log(`[enrich-import] ${msg}`) }
function warn(msg: string) { console.warn(`[enrich-import] ⚠ ${msg}`) }

async function login(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status}`)
  return (await res.json()).token
}

async function patchProduct(id: number, updates: Record<string, unknown>, token: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    warn(`Patch failed for product ${id}: ${res.status}`)
    return false
  }
  return true
}

function mapSpecsToPayload(specs: any): Record<string, unknown> {
  const updates: Record<string, unknown> = {}

  // Motor
  if (specs.motor) {
    if (specs.motor.brand) updates.motorBrand = specs.motor.brand
    if (specs.motor.type) updates.motorPosition = specs.motor.type
    if (specs.motor.watts_nominal) updates.motorNominalWatts = specs.motor.watts_nominal
    if (specs.motor.watts_peak) updates.motorPeakWatts = specs.motor.watts_peak
    if (specs.motor.torque_nm) updates.motorTorqueNm = specs.motor.torque_nm
    if (specs.motor.pedal_assist_levels) updates.pedalAssistLevels = specs.motor.pedal_assist_levels
  }

  // Battery
  if (specs.battery) {
    if (specs.battery.brand) updates.batteryBrand = specs.battery.brand
    if (specs.battery.wh) updates.batteryWh = specs.battery.wh
    if (specs.battery.voltage) updates.batteryVolts = specs.battery.voltage
    if (specs.battery.removable !== undefined) updates.batteryRemovable = specs.battery.removable
    if (specs.battery.dual_option !== undefined) updates.dualBatteryCapable = specs.battery.dual_option
    if (specs.battery.dual_wh) updates.dualBatteryWh = specs.battery.dual_wh
    if (specs.battery.charge_time_hours) updates.chargeTimeHours = specs.battery.charge_time_hours
  }

  if (specs.speed_class) updates.bikeClass = specs.speed_class
  if (specs.throttle) updates.throttle = specs.throttle
  if (specs.top_speed_mph) updates.topSpeedMph = specs.top_speed_mph
  if (specs.range_stated_miles) updates.statedRangeMi = specs.range_stated_miles

  // Drivetrain
  if (specs.drivetrain) {
    if (specs.drivetrain.type) updates.drivetrainType = specs.drivetrain.type
    if (specs.drivetrain.brand) updates.drivetrainBrand = specs.drivetrain.brand
    if (specs.drivetrain.gears) updates.numberOfGears = specs.drivetrain.gears
    if (specs.drivetrain.gear_type) updates.gearType = specs.drivetrain.gear_type
  }

  // Brakes
  if (specs.brakes) {
    if (specs.brakes.type) updates.brakeType = specs.brakes.type
    if (specs.brakes.brand) updates.brakeBrand = specs.brakes.brand
    if (specs.brakes.abs !== undefined) updates.absAvailable = specs.brakes.abs
  }

  // Frame
  if (specs.frame) {
    if (specs.frame.suspension_front && specs.frame.suspension_front !== 'none') {
      updates.suspensionType = specs.frame.suspension_rear ? 'full' : 'front'
    }
  }

  // Wheels
  if (specs.wheels) {
    if (specs.wheels.front_size) updates.frontWheelSize = specs.wheels.front_size
    if (specs.wheels.rear_size) updates.rearWheelSize = specs.wheels.rear_size
    if (specs.wheels.tire_brand) updates.tireBrand = specs.wheels.tire_brand
    if (specs.wheels.tire_width) updates.tireWidthInches = specs.wheels.tire_width
    if (specs.wheels.puncture_protection !== undefined) updates.punctureProtection = specs.wheels.puncture_protection
  }

  // Dimensions
  if (specs.dimensions) {
    if (specs.dimensions.weight_lbs) updates.weightLbs = specs.dimensions.weight_lbs
    if (specs.dimensions.max_capacity_lbs) updates.maxSystemWeightLbs = specs.dimensions.max_capacity_lbs
    if (specs.dimensions.cargo_capacity_lbs) updates.cargoCapacityLbs = specs.dimensions.cargo_capacity_lbs
    if (specs.dimensions.length_inches) updates.lengthInches = specs.dimensions.length_inches
    if (specs.dimensions.wheelbase_inches) updates.wheelbaseInches = specs.dimensions.wheelbase_inches
    if (specs.dimensions.standover_inches) updates.standoverHeightInches = specs.dimensions.standover_inches
    if (specs.dimensions.rider_height_min) updates.riderHeightMin = specs.dimensions.rider_height_min
    if (specs.dimensions.rider_height_max) updates.riderHeightMax = specs.dimensions.rider_height_max
    if (specs.dimensions.foldable !== undefined) updates.foldable = specs.dimensions.foldable
  }

  // Features
  if (specs.features) {
    if (specs.features.lights !== undefined) updates.integratedLights = specs.features.lights
    if (specs.features.fenders !== undefined) updates.fenders = specs.features.fenders
    if (specs.features.display) updates.display = specs.features.display
    if (specs.features.gps !== undefined) updates.gpsTracking = specs.features.gps
  }

  if (specs.passenger_capacity) updates.maxChildPassengers = specs.passenger_capacity
  if (specs.price_usd) updates.price = specs.price_usd
  if (specs.price_usd_max) updates.msrpTo = specs.price_usd_max
  if (specs.warranty_years) updates.warrantyYears = specs.warranty_years

  return updates
}

function mapContentToPayload(content: any): Record<string, unknown> {
  const updates: Record<string, unknown> = {}

  if (content.tagline) updates.tagline = content.tagline
  if (content.one_liner) updates.oneLiner = content.one_liner
  if (content.verdict) updates.verdict = content.verdict
  if (content.comparison_context) updates.comparisonContext = content.comparison_context
  if (content.meta_title) updates.metaTitle = content.meta_title
  if (content.meta_description) updates.metaDescription = content.meta_description

  // Arrays
  if (content.pros?.length) updates.pros = content.pros.map((p: string) => ({ text: p }))
  if (content.cons?.length) updates.cons = content.cons.map((c: string) => ({ text: c }))
  if (content.not_for?.length) updates.notFor = content.not_for.map((n: string) => ({ text: n }))
  if (content.best_for?.length) updates.bestFor = content.best_for.map((b: string) => ({ tag: b }))
  if (content.faq?.length) updates.faq = content.faq.map((f: any) => ({
    question: f.question,
    answer: f.answer,
  }))

  return updates
}

async function main() {
  log('=== Enrichment Import ===')
  log(`Mode: ${FLAG_DRY_RUN ? 'DRY RUN' : 'IMPORT TO CMS'}`)
  if (FLAG_CONTENT_ONLY) log('Importing content only')
  if (FLAG_SPECS_ONLY) log('Importing specs only')

  const token = await login()
  log('Logged in')

  // Fetch all products to get IDs and slugs
  const res = await fetch(
    `${BASE_URL}/api/products?limit=200&depth=0&where[_status][equals]=published&select[slug]=true&select[name]=true`,
    { headers: { Authorization: `JWT ${token}` } },
  )
  const products = (await res.json()).docs as any[]
  const slugToId = new Map<string, number>()
  for (const p of products) slugToId.set(p.slug, p.id)
  log(`Found ${products.length} published products`)

  // Load comparison data
  let comparisons: Record<string, any> = {}
  const compPath = path.join(DATA_DIR, 'comparisons.json')
  if (fs.existsSync(compPath) && !FLAG_SPECS_ONLY) {
    comparisons = JSON.parse(fs.readFileSync(compPath, 'utf-8'))
    log(`Loaded comparisons for ${Object.keys(comparisons).length} products`)
  }

  let imported = 0
  let skipped = 0
  let failed = 0

  for (const product of products) {
    const slug = product.slug
    if (FLAG_PRODUCT && slug !== FLAG_PRODUCT) continue

    const updates: Record<string, unknown> = {}
    let hasData = false

    // 1. Specs from Firecrawl
    if (!FLAG_CONTENT_ONLY) {
      const specPath = path.join(SPEC_DIR, `${slug}.json`)
      if (fs.existsSync(specPath)) {
        const specs = JSON.parse(fs.readFileSync(specPath, 'utf-8'))
        Object.assign(updates, mapSpecsToPayload(specs))
        hasData = true
      }
    }

    // 2. Editorial content from Claude
    if (!FLAG_SPECS_ONLY) {
      const contentPath = path.join(CONTENT_DIR, `${slug}.json`)
      if (fs.existsSync(contentPath)) {
        const content = JSON.parse(fs.readFileSync(contentPath, 'utf-8'))
        Object.assign(updates, mapContentToPayload(content))
        hasData = true
      }
    }

    // 3. Comparisons
    if (!FLAG_SPECS_ONLY && comparisons[slug]) {
      const comp = comparisons[slug]
      if (comp.direct_competitors?.length) {
        const ids = comp.direct_competitors
          .map((c: any) => slugToId.get(c.slug))
          .filter(Boolean)
        if (ids.length) updates.directCompetitors = ids
      }
      if (comp.cheaper_alternative?.slug) {
        const id = slugToId.get(comp.cheaper_alternative.slug)
        if (id) updates.cheaperAlternative = id
      }
      if (comp.premium_alternative?.slug) {
        const id = slugToId.get(comp.premium_alternative.slug)
        if (id) updates.premiumAlternative = id
      }
    }

    if (!hasData) {
      skipped++
      continue
    }

    const fieldCount = Object.keys(updates).length
    log(`\n── ${product.name} ── (${fieldCount} fields)`)

    if (FLAG_DRY_RUN) {
      log(`  Would patch: ${Object.keys(updates).join(', ')}`)
      imported++
      continue
    }

    // Patch product — keep published status
    updates._status = 'published'
    const ok = await patchProduct(product.id, updates, token)
    if (ok) {
      log(`  Patched ${fieldCount} fields`)
      imported++
    } else {
      failed++
    }

    // Small delay
    await new Promise((r) => setTimeout(r, 200))
  }

  console.log('\n' + '═'.repeat(60))
  console.log('  IMPORT REPORT')
  console.log('═'.repeat(60))
  console.log(`  Total products:   ${products.length}`)
  console.log(`  Imported/updated: ${imported}`)
  console.log(`  Skipped (no data):${skipped}`)
  console.log(`  Failed:           ${failed}`)
  console.log('═'.repeat(60))
}

main().catch((err) => {
  console.error('[enrich-import] Fatal:', err)
  process.exit(1)
})

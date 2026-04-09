/**
 * Generate competitor comparison matrix for all products using Claude API.
 * Maps each product to direct competitors, cheaper/premium alternatives.
 *
 * Usage:
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/enrich-comparisons.ts
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/enrich-comparisons.ts --dry-run
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../data')
const BASE_URL = process.env.PAYLOAD_URL || 'http://localhost:3000'
const EMAIL = process.env.PAYLOAD_EMAIL || 'demo-author@example.com'
const PASSWORD = process.env.PAYLOAD_PASSWORD || 'password'

const FLAG_DRY_RUN = process.argv.includes('--dry-run')

function log(msg: string) { console.log(`[enrich-comparisons] ${msg}`) }
function warn(msg: string) { console.warn(`[enrich-comparisons] ⚠ ${msg}`) }

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
  log('=== Comparison Matrix Generation ===')
  log(`Mode: ${FLAG_DRY_RUN ? 'DRY RUN' : 'GENERATE + SAVE'}`)

  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  const anthropic = new Anthropic()
  const token = await login()
  log('Logged in')

  // Fetch all products
  const res = await fetch(
    `${BASE_URL}/api/products?limit=200&depth=1&where[_status][equals]=published&select[name]=true&select[slug]=true&select[brand]=true&select[price]=true&select[category]=true&select[cargoLayout]=true&select[motorBrand]=true&select[motorPosition]=true&select[batteryWh]=true&select[weightLbs]=true&select[maxChildPassengers]=true&select[bikeClass]=true`,
    { headers: { Authorization: `JWT ${token}` } },
  )
  const products = (await res.json()).docs as any[]
  log(`Found ${products.length} published products`)

  // Build compact catalog for the prompt
  const catalog = products.map((p) => ({
    slug: p.slug,
    name: p.name,
    brand: typeof p.brand === 'object' ? p.brand?.name : p.brand,
    price: p.price || 0,
    type: p.cargoLayout || 'unknown',
    motor: p.motorBrand || (p.motorPosition ? 'electric' : 'non-electric'),
    battery_wh: p.batteryWh || 0,
    weight: p.weightLbs || 0,
    kids: p.maxChildPassengers || 0,
    class: p.bikeClass || 'unknown',
  }))

  if (FLAG_DRY_RUN) {
    log(`Would send catalog of ${catalog.length} products to Claude API`)
    log('Sample product:')
    log(JSON.stringify(catalog[0], null, 2))
    return
  }

  const prompt = `You have the complete Carryish cargo bike catalog below. For EVERY product, identify:

1. "direct_competitors" — 2-3 products from this catalog that are in the same type (longtail vs longtail, front-box vs front-box) AND within 40% price range. Include the slug and a one-sentence "why" explaining the comparison.

2. "cheaper_alternative" — the best budget option in the same type. Include slug and "why".

3. "premium_alternative" — the step-up option in the same type. Include slug and "why".

Rules:
- Only reference slugs that exist in this catalog
- If a product is the cheapest in its type, cheaper_alternative can be null
- If a product is the most expensive in its type, premium_alternative can be null
- Cross-type comparisons only for cheaper/premium alternatives
- For non-electric bikes, compare to other non-electric bikes first

Return a JSON object keyed by product slug. Example:
{
  "tern-gsd-gen-3": {
    "direct_competitors": [
      { "slug": "yuba-spicy-curry-v4", "why": "Same Bosch Cargo Line motor, similar capacity, $200 more" }
    ],
    "cheaper_alternative": { "slug": "lectric-xpedition-20", "why": "Does 80% for 1/4 the price" },
    "premium_alternative": { "slug": "riese-and-muller-multitinker2", "why": "Full R&M build quality" }
  }
}

CATALOG:
${JSON.stringify(catalog, null, 2)}

Return ONLY valid JSON. No markdown, no explanation.`

  // Split catalog into batches to avoid output truncation
  const BATCH_SIZE = 10
  const comparisons: Record<string, any> = {}

  for (let i = 0; i < catalog.length; i += BATCH_SIZE) {
    const batch = catalog.slice(i, i + BATCH_SIZE)
    const batchSlugs = batch.map((p) => p.slug).join(', ')
    log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(catalog.length / BATCH_SIZE)}: ${batch.length} products`)

    const batchPrompt = `${prompt}\n\nIMPORTANT: Only generate comparisons for these specific slugs: ${batchSlugs}\nYou may reference any slug from the full catalog in competitor fields.`

    // Retry with exponential backoff for rate limits
    let retries = 0
    while (retries < 3) {
      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
          messages: [{ role: 'user', content: batchPrompt }],
        })

        const text = response.content
          .filter((c): c is Anthropic.TextBlock => c.type === 'text')
          .map((c) => c.text)
          .join('')

        try {
          const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
          const batchResult = JSON.parse(jsonMatch ? jsonMatch[1] : text)
          Object.assign(comparisons, batchResult)
          log(`  Got comparisons for ${Object.keys(batchResult).length} products`)
        } catch {
          warn(`  Failed to parse batch response, saving raw`)
          fs.writeFileSync(path.join(DATA_DIR, `comparisons-batch-${i}.raw.txt`), text)
        }
        break // success
      } catch (err: any) {
        if (err?.error?.type === 'rate_limit_error' && retries < 2) {
          const wait = (retries + 1) * 30
          log(`  Rate limited, waiting ${wait}s before retry...`)
          await new Promise((r) => setTimeout(r, wait * 1000))
          retries++
        } else {
          throw err
        }
      }
    }

    // Save partial progress after each batch
    if (Object.keys(comparisons).length > 0) {
      fs.writeFileSync(path.join(DATA_DIR, 'comparisons.json'), JSON.stringify(comparisons, null, 2))
    }

    await new Promise((r) => setTimeout(r, 2000))
  }

  // Validate: ensure all referenced slugs exist
  const slugSet = new Set(catalog.map((p) => p.slug))
  let warnings = 0
  for (const [slug, data] of Object.entries(comparisons) as any) {
    if (!slugSet.has(slug)) {
      log(`⚠ Unknown product slug in output: ${slug}`)
      warnings++
      continue
    }
    for (const comp of data.direct_competitors || []) {
      if (!slugSet.has(comp.slug)) {
        log(`⚠ Unknown competitor slug: ${comp.slug} (referenced by ${slug})`)
        warnings++
      }
    }
    if (data.cheaper_alternative?.slug && !slugSet.has(data.cheaper_alternative.slug)) {
      log(`⚠ Unknown cheaper alt slug: ${data.cheaper_alternative.slug}`)
      warnings++
    }
    if (data.premium_alternative?.slug && !slugSet.has(data.premium_alternative.slug)) {
      log(`⚠ Unknown premium alt slug: ${data.premium_alternative.slug}`)
      warnings++
    }
  }

  fs.writeFileSync(path.join(DATA_DIR, 'comparisons.json'), JSON.stringify(comparisons, null, 2))

  console.log('\n' + '═'.repeat(60))
  console.log('  COMPARISON MATRIX REPORT')
  console.log('═'.repeat(60))
  console.log(`  Products in catalog:  ${catalog.length}`)
  console.log(`  Products with comps:  ${Object.keys(comparisons).length}`)
  console.log(`  Validation warnings:  ${warnings}`)
  console.log(`  Saved to: data/comparisons.json`)
  console.log('═'.repeat(60))
}

main().catch((err) => {
  console.error('[enrich-comparisons] Fatal:', err)
  process.exit(1)
})

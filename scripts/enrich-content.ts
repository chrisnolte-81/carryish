/**
 * Generate editorial content for all products using Claude API.
 * Reads spec data from data/specs/ and generates tagline, take, pros/cons, FAQ, etc.
 *
 * Usage:
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/enrich-content.ts
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/enrich-content.ts --dry-run
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/enrich-content.ts --product=tern-gsd-gen-3
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SPEC_DIR = path.join(__dirname, '../data/specs')
const CONTENT_DIR = path.join(__dirname, '../data/content')
const BASE_URL = process.env.PAYLOAD_URL || 'http://localhost:3000'
const EMAIL = process.env.PAYLOAD_EMAIL || 'demo-author@example.com'
const PASSWORD = process.env.PAYLOAD_PASSWORD || 'password'

const args = process.argv.slice(2)
const FLAG_DRY_RUN = args.includes('--dry-run')
const FLAG_PRODUCT = args.find((a) => a.startsWith('--product='))?.split('=')[1]
const FLAG_FORCE = args.includes('--force')

function log(msg: string) { console.log(`[enrich-content] ${msg}`) }
function warn(msg: string) { console.warn(`[enrich-content] ⚠ ${msg}`) }

const SYSTEM_PROMPT = `You are the editorial voice of Carryish, an independent cargo bike discovery platform. Your tone is warm, knowledgeable, and honest — like a friend who happens to know everything about cargo bikes.

Voice rules:
- Write like you're texting a smart friend, not writing marketing copy
- Have opinions. Name biases. Be specific with numbers and names.
- Never hedge with "it depends" unless it truly depends
- Compare products by name: "If the Lectric XPedition is a Honda Civic, the GSD is a Subaru Outback"
- Acknowledge who a bike is NOT for — that builds trust
- Reference real-world scenarios: school runs, grocery trips, car replacement
- Contractions always. "It's" not "it is."
- Vary sentence length. Short sentences hit. Mix it up.
- Prices in USD, weights in lbs, distances in miles

KILL LIST — never use these words:
game-changer, revolutionize, seamless, cutting-edge, innovative, leverage, utilize, elevate, robust, holistic, synergy, best-in-class, unparalleled, empower, reimagine, curated, delve, landscape, navigate (metaphorical), ecosystem (non-nature), journey, solution, boasts, moreover, furthermore, comprehensive, nuanced, paradigm, facilitate, showcase, pivotal, garner, foster, underscore, realm, intricate, embark

BANNED phrases: "Whether you're looking for", "In today's fast-paced world", "Look no further", "Takes it to the next level", "A wide range of", "It's worth noting", "At the end of the day", "When it comes to", "Perfect for" (be more specific), "Let's dive in"

BANNED structures: "Not only X, but also Y", starting 3+ sentences the same way, rule of three abstract nouns, "It's not X — it's Y" negation-reframe, opening with rhetorical questions, present participle padding, bolded keyword + colon + restatement

Respond ONLY with valid JSON. No markdown code blocks, no explanation.`

const CONTENT_PROMPT = `Generate editorial content for this cargo bike. Return a JSON object with these exact keys:

1. "tagline" — punchy one-liner, max 80 chars. Examples: "The do-everything longtail that folds to fit in a closet", "Dutch family hauling at half the European price"

2. "one_liner" — for cards/search, max 140 chars. Include brand, key selling point, and starting price.

3. "carryish_take" — 200-350 words, the editorial heart. Structure:
   - Paragraph 1: What this bike is and who it's for (the pitch)
   - Paragraph 2: What makes it stand out AND what the tradeoffs are
   - Paragraph 3: The bottom line — is it worth the money?

4. "pros" — array of 4-6 specific strings. Not "Good battery life" but "545Wh Bosch battery delivers 35-45 real-world miles"

5. "cons" — array of 3-5 honest, specific strings. Not "A bit heavy" but "At 75 lbs, you'll need help getting it up stairs"

6. "best_for" — array of 3-5 specific user profiles. Not "commuters" but "Families with 1-2 kids under 8 who want to ditch the second car"

7. "not_for" — array of 2-4 profiles. Name alternatives: "Budget buyers — the Lectric XPedition does 80% of this for $1,399"

8. "faq" — array of 3-5 objects with "question" and "answer" keys. Answer in 2-3 sentences max.

9. "verdict" — one sentence bottom line.

10. "comparison_context" — 1-2 sentences directly naming 2-3 closest competitors and why someone would pick this over them.

11. "meta_title" — SEO title, max 60 chars. Format: "{Model} Review: {Key Point} | Carryish"

12. "meta_description" — SEO description, max 155 chars.

Here's the product data:

BRAND: {brand}
MODEL: {model}
TYPE: {type} ({layout})
PRICE: ${price_from}{price_range}
MOTOR: {motor_info}
BATTERY: {battery_info}
WEIGHT: {weight_info}
CAPACITY: {capacity_info}
KEY FEATURES: {features}
TESTING STATUS: {testing_status}
EXISTING TAGS: {best_for_tags}

{spec_data}

Generate the JSON now.`

async function login(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status}`)
  return (await res.json()).token
}

function buildPrompt(product: any, specData: any): string {
  const brand = typeof product.brand === 'object' ? product.brand?.name : product.brand || 'Unknown'
  const model = product.name
  const layout = product.cargoLayout || 'unknown'
  const price = product.price || 0
  const motorInfo = [
    product.motorBrand,
    product.motorTorqueNm && `${product.motorTorqueNm}Nm`,
    product.motorPosition,
    product.motorNominalWatts && `${product.motorNominalWatts}W`,
  ].filter(Boolean).join(', ') || 'Non-electric'

  const batteryInfo = [
    product.batteryWh && `${product.batteryWh}Wh`,
    product.batteryBrand,
    product.batteryRemovable && 'removable',
    product.dualBatteryCapable && `dual battery (${product.dualBatteryWh || '?'}Wh)`,
  ].filter(Boolean).join(', ') || 'No battery'

  const weightInfo = product.weightLbs ? `${product.weightLbs} lbs` : 'Unknown'
  const capacityInfo = [
    product.maxSystemWeightLbs && `${product.maxSystemWeightLbs} lbs total`,
    product.cargoCapacityLbs && `${product.cargoCapacityLbs} lbs cargo`,
    product.maxChildPassengers && `${product.maxChildPassengers} kids`,
  ].filter(Boolean).join(', ') || 'Unknown'

  const features = [
    product.foldable && 'Foldable',
    product.fitsInElevator && 'Fits in elevator',
    product.gpsTracking && 'GPS tracking',
    product.integratedLights && 'Integrated lights',
    product.absAvailable && 'ABS brakes',
    product.throttle && product.throttle !== 'none' && `Throttle (${product.throttle})`,
    product.bikeClass && `${product.bikeClass.replace('-', ' ').replace('class', 'Class')}`,
  ].filter(Boolean).join(', ') || 'Standard'

  const bestForTags = product.bestFor?.map((b: any) => b.tag).join(', ') || ''

  let prompt = CONTENT_PROMPT
    .replace('{brand}', brand)
    .replace('{model}', model)
    .replace('{type}', product.category === 'cargo-bike' ? 'Cargo Bike' : product.category || 'Cargo Bike')
    .replace('{layout}', layout)
    .replace('{price_from}', price.toLocaleString())
    .replace('{price_range}', '')
    .replace('{motor_info}', motorInfo)
    .replace('{battery_info}', batteryInfo)
    .replace('{weight_info}', weightInfo)
    .replace('{capacity_info}', capacityInfo)
    .replace('{features}', features)
    .replace('{testing_status}', product.testingStatus || 'specs-only')
    .replace('{best_for_tags}', bestForTags)

  if (specData) {
    prompt = prompt.replace('{spec_data}', `\nDETAILED SPECS (from manufacturer page):\n${JSON.stringify(specData, null, 2)}`)
  } else {
    prompt = prompt.replace('{spec_data}', '\n(No detailed spec data available — generate content based on the info above)')
  }

  return prompt
}

async function main() {
  log('=== Editorial Content Generation ===')
  log(`Mode: ${FLAG_DRY_RUN ? 'DRY RUN' : 'GENERATE + SAVE'}`)

  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')
  if (!fs.existsSync(CONTENT_DIR)) fs.mkdirSync(CONTENT_DIR, { recursive: true })

  const anthropic = new Anthropic()
  const token = await login()
  log('Logged in')

  // Fetch all products with full depth
  const res = await fetch(
    `${BASE_URL}/api/products?limit=200&depth=1&where[_status][equals]=published`,
    { headers: { Authorization: `JWT ${token}` } },
  )
  const products = (await res.json()).docs as any[]
  log(`Found ${products.length} published products`)

  let generated = 0
  let skipped = 0
  let failed = 0

  for (const product of products) {
    const slug = product.slug
    if (FLAG_PRODUCT && slug !== FLAG_PRODUCT) continue

    // Skip if already generated (unless --force)
    const outputPath = path.join(CONTENT_DIR, `${slug}.json`)
    if (fs.existsSync(outputPath) && !FLAG_FORCE) {
      skipped++
      continue
    }

    const brand = typeof product.brand === 'object' ? product.brand?.name : ''
    const label = `${brand} ${product.name}`
    log(`\n── ${label} ──`)

    // Load spec data if available
    const specPath = path.join(SPEC_DIR, `${slug}.json`)
    let specData = null
    if (fs.existsSync(specPath)) {
      specData = JSON.parse(fs.readFileSync(specPath, 'utf-8'))
      log(`  Loaded spec data`)
    }

    if (FLAG_DRY_RUN) {
      log(`  Would generate content (spec data: ${specData ? 'yes' : 'no'})`)
      continue
    }

    try {
      const prompt = buildPrompt(product, specData)

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = response.content
        .filter((c): c is Anthropic.TextBlock => c.type === 'text')
        .map((c) => c.text)
        .join('')

      // Parse JSON from response
      let content: any
      try {
        // Try to extract JSON if wrapped in markdown code blocks
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
        content = JSON.parse(jsonMatch ? jsonMatch[1] : text)
      } catch {
        warn(`  Failed to parse JSON response`)
        // Save raw response for debugging
        fs.writeFileSync(outputPath + '.raw', text)
        failed++
        continue
      }

      fs.writeFileSync(outputPath, JSON.stringify(content, null, 2))
      log(`  Generated: tagline="${content.tagline}"`)
      log(`  Verdict: "${content.verdict}"`)
      generated++
    } catch (err: any) {
      warn(`  Claude API error: ${err.message || err}`)
      failed++
    }

    // Small delay between API calls
    await new Promise((r) => setTimeout(r, 500))
  }

  // Report
  console.log('\n' + '═'.repeat(60))
  console.log('  EDITORIAL CONTENT REPORT')
  console.log('═'.repeat(60))
  console.log(`  Total products:   ${products.length}`)
  console.log(`  Generated:        ${generated}`)
  console.log(`  Skipped (cached): ${skipped}`)
  console.log(`  Failed:           ${failed}`)
  console.log('═'.repeat(60))

  // Quick quality check
  if (generated > 0) {
    const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'))
    let thin = 0
    for (const file of files) {
      const content = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8'))
      if ((content.pros?.length || 0) < 3 || (content.cons?.length || 0) < 2) thin++
    }
    if (thin > 0) {
      console.log(`\n  ⚠ ${thin} products have thin content (< 3 pros or < 2 cons)`)
    }
  }
}

main().catch((err) => {
  console.error('[enrich-content] Fatal:', err)
  process.exit(1)
})

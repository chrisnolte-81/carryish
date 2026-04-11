/**
 * Fill missing editorial content for Tern products
 * ─────────────────────────────────────────────────
 * For each Tern product missing editorial content, generate:
 *   - carryishTake (3-4 sentences, lead with personality, reference price,
 *     name a specific competitor — SHORT, never 3 paragraphs)
 *   - pros (6 specific items with numbers/components)
 *   - cons (4 honest limitations)
 *   - bestFor (5 use-case-first profiles)
 *   - notFor (4 items that name a cheaper/better alternative)
 *   - faq (5 Q&A)
 *   - verdict (one-sentence bottom line)
 *
 * Uses Claude Opus 4.6 with Zod structured outputs. Writes through the
 * local Payload API with overrideAccess and disableRevalidate so the
 * existing carryishTake field takes Lexical richtext format.
 *
 * NEVER fabricates reviews — no reviewSources, pressQuotes, or quotes
 * from publications.
 *
 * Usage:
 *   pnpm tsx scripts/fill-tern-content.ts --dry-run
 *   pnpm tsx scripts/fill-tern-content.ts --product=tern-gsd-r14
 *   pnpm tsx scripts/fill-tern-content.ts
 */
import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

// ──────── CLI flags ────────
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const PRODUCT_FILTER = args.find((a) => a.startsWith('--product='))?.split('=')[1]

// ──────── What to generate per product ────────
// Gen A = full editorial rewrite (carryishTake was too long, no pros/cons/etc.)
// Gen B = take-only (already has pros/cons/bestFor/notFor/faq/verdict)
type GenMode = 'full' | 'take-only'

const TARGETS: Array<{ slug: string; mode: GenMode }> = [
  { slug: 'tern-gsd-r14', mode: 'full' },
  { slug: 'tern-gsd-p00', mode: 'full' },
  { slug: 'tern-nbd-p8i', mode: 'take-only' },
  { slug: 'tern-orox', mode: 'take-only' },
  { slug: 'tern-quick-haul-long-d9', mode: 'take-only' },
  { slug: 'tern-quick-haul-p9-sport', mode: 'take-only' },
  { slug: 'tern-short-haul-d8', mode: 'take-only' },
]

// ──────── Zod schema ────────
const EditorialSchema = z.object({
  carryishTake: z
    .string()
    .describe(
      '3-4 sentences MAX. One paragraph. Lead with personality. Name the actual price in dollars. Reference one specific competitor by name. NOT 3 paragraphs. NOT marketing-speak. Think warm texting-a-friend voice.',
    ),
  verdict: z
    .string()
    .describe('One-sentence bottom line. Specific, honest, unhedged.'),
  pros: z
    .array(z.string())
    .length(6)
    .describe(
      'Exactly 6 specific pros with real numbers, component names, or comparisons. Not "great battery" but "Bosch 545Wh battery delivers 35-45 real miles with one kid on the rack".',
    ),
  cons: z
    .array(z.string())
    .length(4)
    .describe(
      'Exactly 4 honest limitations. Specific, not hedged. Not "a bit heavy" but "At 73 lbs, plan on parking it where you ride it — stairs are no fun".',
    ),
  bestFor: z
    .array(z.string())
    .length(5)
    .describe(
      'Exactly 5 use-case-first profiles. Not "Families" but "Urban families with 1-2 kids under 8 who want to ditch a second car". Be specific about life situation.',
    ),
  notFor: z
    .array(z.string())
    .length(4)
    .describe(
      'Exactly 4 "not for" profiles that each NAME a specific cheaper/better alternative. Format: "Budget buyers — the RadWagon 5 covers 80% of this for $2,499". Always name a real alternative.',
    ),
  faq: z
    .array(
      z.object({
        question: z.string().describe('One specific buyer question'),
        answer: z
          .string()
          .describe('Direct answer in 2-3 sentences. No hedging.'),
      }),
    )
    .length(5)
    .describe('Exactly 5 common buyer questions with direct answers.'),
})

type EditorialOutput = z.infer<typeof EditorialSchema>

// ──────── System prompt (STYLE_GUIDE.md voice rules) ────────
const SYSTEM_PROMPT = `You are the editorial voice of Carryish, an independent cargo bike review site. You write like a knowledgeable friend who happens to own 30 cargo bikes and answers questions at a dinner party — warm, specific, opinionated, never marketing.

## Voice rules

- Have opinions. Name biases. Be specific with numbers, components, prices.
- Write like you're texting a smart friend. Contractions always. "It's" not "it is".
- Short sentences hit. Vary rhythm. Mix it up.
- Name specific competitors by model — "If the RadWagon 5 is a Honda Civic, the GSD S10 is a BMW 3-series."
- Acknowledge who this bike is NOT for. That builds trust.
- Real-world scenarios: school runs, Costco runs, hills with groceries, winter commutes, elevator storage.
- Prices in USD, weights in lbs, distances in miles.

## The Carryish Take rule (CRITICAL)

The carryishTake field is 3-4 SENTENCES MAX, one paragraph. It is NOT three paragraphs. It is NOT an essay. It leads with personality, names the price, names one competitor, and lands a single clear verdict. Example of the right length and voice:

> "Fits in an elevator. Hauls two kids and a Costco run. The Bosch Cargo Line motor has 85Nm of torque, so hills with a full load aren't a problem. At $7,999 it's not cheap, but families who ride daily will use it like a second car."

That's it. Four sentences. If you write more than 4 sentences for carryishTake, you've failed. Keep it tight.

## KILL LIST — never use these words

game-changer, revolutionize, seamless, cutting-edge, innovative, leverage, utilize, elevate, robust, holistic, synergy, best-in-class, unparalleled, empower, reimagine, curated, delve, landscape, navigate (metaphorical), ecosystem (non-nature), journey, solution, boasts, moreover, furthermore, comprehensive, nuanced, paradigm, facilitate, showcase, pivotal, garner, foster, underscore, realm, intricate, embark, unleash, transform, enhance, optimize, streamline, empower, amplify, accelerate, revolutionary, crafted

## BANNED PHRASES

- "Whether you're looking for X or Y"
- "In today's fast-paced world"
- "Look no further"
- "Takes it to the next level"
- "A wide range of"
- "It's worth noting"
- "At the end of the day"
- "When it comes to"
- "Perfect for" (be more specific)
- "Let's dive in"

## BANNED STRUCTURES

- "Not only X, but also Y"
- Starting 3+ sentences the same way
- Rule of three abstract nouns ("innovation, quality, craftsmanship")
- "It's not X — it's Y" negation-reframe
- Opening with rhetorical questions
- Present-participle padding ("offering an experience that...")
- Bolded keyword + colon + restatement
- Em dashes: one per paragraph max, ever

## NEVER fabricate

- Do NOT invent quotes from publications ("Electrek said X", "BikeRumor reviewed Y")
- Do NOT reference review scores from other sites
- Do NOT claim we "tested" a bike unless we did
- If you don't know something, don't make it up

Output using the structured format. Every field is required. Follow the exact counts (6 pros, 4 cons, 5 bestFor, 4 notFor, 5 faq).`

// ──────── Helpers ────────
function specsBlurb(p: any): string {
  const motor = [
    p.motorBrand,
    p.motorTorqueNm && `${p.motorTorqueNm}Nm`,
    p.motorPosition,
    p.motorPeakWatts && `${p.motorPeakWatts}W peak`,
  ]
    .filter(Boolean)
    .join(', ') || 'non-electric'

  const battery = [
    p.batteryBrand,
    p.batteryWh && `${p.batteryWh}Wh`,
    p.dualBatteryCapable && `dual battery (${p.dualBatteryWh || '?'}Wh total)`,
    p.estimatedRealRangeMi && `~${p.estimatedRealRangeMi} real miles`,
  ]
    .filter(Boolean)
    .join(', ') || 'no battery'

  const drivetrain = [
    p.drivetrainBrand,
    p.numberOfGears && `${p.numberOfGears}-speed`,
    p.gearType,
    p.drivetrainType,
  ]
    .filter(Boolean)
    .join(' ')

  const capacity = [
    p.weightLbs && `${p.weightLbs} lbs bike`,
    p.maxSystemWeightLbs && `${p.maxSystemWeightLbs} lbs max GVW`,
    p.cargoCapacityLbs && `${p.cargoCapacityLbs} lbs cargo`,
    p.maxChildPassengers && `${p.maxChildPassengers} kids`,
  ]
    .filter(Boolean)
    .join(', ')

  const features = [
    p.foldable && 'foldable',
    p.fitsInElevator && 'fits in elevator',
    p.integratedLights && 'integrated lights',
    p.absAvailable && 'ABS brakes',
    p.bikeClass && `Class ${String(p.bikeClass).replace('class-', '')}`,
  ]
    .filter(Boolean)
    .join(', ')

  return [
    `Name: ${p.name}`,
    p.subtitle && `Subtitle: ${p.subtitle}`,
    p.modelFamily && `Model family: ${p.modelFamily}`,
    p.generation && `Generation: ${p.generation}`,
    p.price && `Price: $${p.price}`,
    p.cargoLayout && `Layout: ${p.cargoLayout}`,
    `Motor: ${motor}`,
    `Battery: ${battery}`,
    drivetrain && `Drivetrain: ${drivetrain}`,
    capacity && `Capacity: ${capacity}`,
    features && `Features: ${features}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function existingContextBlurb(p: any): string {
  const pros = Array.isArray(p.pros)
    ? p.pros.map((x: any) => `- ${x.text}`).join('\n')
    : ''
  const cons = Array.isArray(p.cons)
    ? p.cons.map((x: any) => `- ${x.text}`).join('\n')
    : ''
  const bestFor = Array.isArray(p.bestFor)
    ? p.bestFor.map((x: any) => `- ${x.tag}`).join('\n')
    : ''
  const notFor = Array.isArray(p.notFor)
    ? p.notFor.map((x: any) => `- ${x.text}`).join('\n')
    : ''
  const verdict = typeof p.verdict === 'string' ? p.verdict : ''

  const parts: string[] = []
  if (pros) parts.push(`Existing pros:\n${pros}`)
  if (cons) parts.push(`Existing cons:\n${cons}`)
  if (bestFor) parts.push(`Existing bestFor:\n${bestFor}`)
  if (notFor) parts.push(`Existing notFor:\n${notFor}`)
  if (verdict) parts.push(`Existing verdict: ${verdict}`)
  return parts.join('\n\n')
}

function buildUserPrompt(p: any, mode: GenMode): string {
  const specs = specsBlurb(p)
  const existing = existingContextBlurb(p)

  const focus =
    mode === 'take-only'
      ? `This product already has pros/cons/bestFor/notFor/faq/verdict. Match that editorial voice and be consistent with the tradeoffs they describe. Your main job is to write a great carryishTake. But generate all the fields — we'll use them for quality comparison.`
      : `This product has no editorial yet. Write everything fresh — carryishTake, pros, cons, bestFor, notFor, faq, verdict.`

  return `Generate editorial content for this Tern cargo bike.

${focus}

## Product data

${specs}

${existing ? `## Existing content (match this voice)\n\n${existing}` : ''}

Remember:
- carryishTake = 3-4 SENTENCES MAX, one paragraph, reference the $${p.price} price, name one competitor
- Exactly 6 pros, 4 cons, 5 bestFor, 4 notFor, 5 faq
- notFor items must each NAME a specific cheaper or better alternative
- No kill-list words, no banned phrases, no banned structures
- Never fabricate reviews or quotes`
}

function textToLexical(text: string): any {
  // Split on double-newlines to detect paragraphs, but we expect 1 paragraph
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0)
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: paragraphs.map((p) => ({
        type: 'paragraph',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: [
          {
            type: 'text',
            version: 1,
            text: p.trim(),
            format: 0,
            mode: 'normal',
            detail: 0,
            style: '',
          },
        ],
      })),
    },
  }
}

// Lightweight kill-list check to catch voice violations
const KILL_LIST = [
  'game-changer',
  'seamless',
  'innovative',
  'leverage',
  'utilize',
  'elevate',
  'robust',
  'journey',
  'solution',
  'boasts',
  'delve',
  'landscape',
  'navigate',
  'curated',
  'showcase',
  'foster',
  'realm',
  'embark',
  'unleash',
  'transform',
  'enhance',
  'optimize',
  'streamline',
  'empower',
  'amplify',
  'revolutionary',
  'crafted',
  'cutting-edge',
  'holistic',
  'synergy',
  'reimagine',
  'paradigm',
]

function checkForKillList(text: string): string[] {
  const found: string[] = []
  const lower = text.toLowerCase()
  for (const word of KILL_LIST) {
    if (lower.includes(word)) found.push(word)
  }
  return found
}

function sentenceCount(text: string): number {
  // Crude: count sentence terminators
  return (text.match(/[.!?](\s|$)/g) || []).length
}

// ──────── Main ────────
async function main() {
  console.log('\n→ Tern editorial content fill')
  console.log(`  mode: ${DRY_RUN ? 'DRY RUN' : 'WRITE'}`)
  if (PRODUCT_FILTER) console.log(`  filter: ${PRODUCT_FILTER}`)
  console.log()

  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  const payload = await getPayload({ config: configPromise })
  const client = new Anthropic()

  const targets = PRODUCT_FILTER
    ? TARGETS.filter((t) => t.slug === PRODUCT_FILTER)
    : TARGETS

  if (targets.length === 0) {
    console.log(`  ⚠ no targets match filter ${PRODUCT_FILTER}`)
    process.exit(0)
  }

  let generated = 0
  let written = 0
  let failed = 0

  for (const target of targets) {
    console.log(`\n── ${target.slug} (${target.mode}) ──`)

    // Fetch product
    const res = await payload.find({
      collection: 'products',
      where: { slug: { equals: target.slug } },
      limit: 1,
      depth: 1,
      overrideAccess: true,
      draft: false,
    })
    const product = res.docs[0] as any
    if (!product) {
      console.log(`  ✗ product not found`)
      failed++
      continue
    }
    console.log(`  id=${product.id} price=$${product.price} family=${product.modelFamily}`)

    // Generate
    let output: EditorialOutput
    try {
      const response = await client.messages.parse({
        model: 'claude-opus-4-6',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserPrompt(product, target.mode) }],
        output_config: { format: zodOutputFormat(EditorialSchema) },
      })
      if (!response.parsed_output) {
        throw new Error('No parsed output — stop_reason: ' + response.stop_reason)
      }
      output = response.parsed_output
      generated++
    } catch (err: any) {
      console.log(`  ✗ Claude error: ${err.message || err}`)
      failed++
      continue
    }

    // Quality checks
    const takeKillHits = checkForKillList(output.carryishTake)
    const takeSents = sentenceCount(output.carryishTake)
    console.log(`  take: ${output.carryishTake.length} chars, ${takeSents} sentences`)
    if (takeSents > 5) console.log(`    ⚠ too many sentences (${takeSents})`)
    if (takeKillHits.length > 0) console.log(`    ⚠ kill-list hits: ${takeKillHits.join(', ')}`)

    // Preview
    console.log(`\n  carryishTake: "${output.carryishTake}"`)
    console.log(`  verdict: "${output.verdict}"`)
    console.log(`  pros[0]: "${output.pros[0]}"`)
    console.log(`  cons[0]: "${output.cons[0]}"`)
    console.log(`  bestFor[0]: "${output.bestFor[0]}"`)
    console.log(`  notFor[0]: "${output.notFor[0]}"`)

    if (DRY_RUN) {
      console.log(`  [dry run — not writing]`)
      continue
    }

    // Build update payload
    const updateData: Record<string, unknown> = {
      carryishTake: textToLexical(output.carryishTake),
    }
    if (target.mode === 'full') {
      updateData.verdict = output.verdict
      updateData.pros = output.pros.map((text) => ({ text }))
      updateData.cons = output.cons.map((text) => ({ text }))
      updateData.bestFor = output.bestFor.map((tag) => ({ tag }))
      updateData.notFor = output.notFor.map((text) => ({ text }))
      updateData.faq = output.faq.map((q) => ({ question: q.question, answer: q.answer }))
    }

    try {
      await payload.update({
        collection: 'products',
        id: product.id,
        data: updateData as any,
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      console.log(`  ✓ written (${Object.keys(updateData).join(', ')})`)
      written++
    } catch (err: any) {
      console.log(`  ✗ write failed: ${err.message || err}`)
      failed++
    }

    // Small pacing delay
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log('\n' + '═'.repeat(60))
  console.log(`  TERN CONTENT FILL REPORT`)
  console.log('═'.repeat(60))
  console.log(`  Targets:   ${targets.length}`)
  console.log(`  Generated: ${generated}`)
  console.log(`  Written:   ${written}`)
  console.log(`  Failed:    ${failed}`)
  console.log('═'.repeat(60) + '\n')

  process.exit(0)
}

main().catch((err) => {
  console.error('fatal', err)
  process.exit(1)
})

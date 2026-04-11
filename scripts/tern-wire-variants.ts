/**
 * Tern wire variants + modelFamily
 * ────────────────────────────────
 * Groups Tern products into variant families and writes the relationship
 * on each product. Also sets modelFamily + generation + subtitle where
 * those are still empty.
 *
 * Idempotent: re-running just re-writes the same relationships.
 *
 * Usage:
 *   PAYLOAD_URL=https://carryish.ai \
 *   PAYLOAD_EMAIL=... PAYLOAD_PASSWORD=... \
 *   pnpm tsx scripts/tern-wire-variants.ts
 */
import 'dotenv/config'

const BASE_URL = process.env.PAYLOAD_URL || 'https://carryish.ai'
const EMAIL = process.env.PAYLOAD_EMAIL || 'demo-author@example.com'
const PASSWORD = process.env.PAYLOAD_PASSWORD || 'password'

type TernProduct = {
  id: number
  slug: string
  modelFamily: string
  generation?: string
  subtitle?: string
}

// Source of truth — mapping from scripts/brand-scrape-tern.log + tern-lifestyle-repair.ts
const TERN_PRODUCTS: TernProduct[] = [
  { id: 1,   slug: 'tern-gsd-s10',              modelFamily: 'GSD',        generation: 'Gen 3', subtitle: 'The do-everything longtail that folds to fit in a closet' },
  { id: 115, slug: 'tern-gsd-r14',              modelFamily: 'GSD',        generation: 'Gen 3', subtitle: 'Rohloff-hub GSD for riders who want zero-maintenance shifting' },
  { id: 116, slug: 'tern-gsd-p00',              modelFamily: 'GSD',        generation: 'Gen 3', subtitle: 'Pinion gearbox flagship — the quietest, most durable GSD' },
  { id: 2,   slug: 'tern-hsd-p5i',              modelFamily: 'HSD',        generation: 'Gen 2', subtitle: 'Compact utility bike that fits two kids and one small apartment' },
  { id: 89,  slug: 'tern-quick-haul-p9-sport',  modelFamily: 'Quick Haul', generation: 'P9',    subtitle: 'Entry-level cargo that finally feels premium under load' },
  { id: 90,  slug: 'tern-quick-haul-long-d9',   modelFamily: 'Quick Haul', generation: 'D9',    subtitle: 'Stretched Quick Haul for two-kid families on a budget' },
  { id: 93,  slug: 'tern-nbd-p8i',              modelFamily: 'NBD',        generation: 'P8i',   subtitle: 'Step-through utility e-bike for everyday errands and short school runs' },
  { id: 91,  slug: 'tern-orox',                 modelFamily: 'Orox',       generation: '2026',  subtitle: 'All-road cargo bike built to leave the pavement behind' },
  { id: 92,  slug: 'tern-short-haul-d8',        modelFamily: 'Short Haul', generation: 'D8',    subtitle: 'The non-electric compact cargo that keeps things simple' },
]

async function login(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`login failed: ${res.status}`)
  const { token } = await res.json()
  return token
}

async function patchProduct(
  productId: number,
  body: Record<string, unknown>,
  token: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/products/${productId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`PATCH /products/${productId} failed: ${res.status} ${txt.slice(0, 200)}`)
  }
}

async function main(): Promise<void> {
  console.log(`\n→ Tern variant wiring against ${BASE_URL}`)
  const token = await login()
  console.log('  ✓ authenticated')

  // Group by modelFamily
  const byFamily = new Map<string, TernProduct[]>()
  for (const p of TERN_PRODUCTS) {
    const arr = byFamily.get(p.modelFamily) || []
    arr.push(p)
    byFamily.set(p.modelFamily, arr)
  }

  for (const [family, products] of byFamily) {
    console.log(`\n  Family: ${family} (${products.length} product${products.length === 1 ? '' : 's'})`)
    for (const product of products) {
      const siblings = products.filter((p) => p.id !== product.id).map((p) => p.id)
      const body: Record<string, unknown> = {
        modelFamily: product.modelFamily,
        generation: product.generation ?? null,
        subtitle: product.subtitle ?? null,
        variants: siblings,
        currentlyAvailable: true,
      }
      try {
        await patchProduct(product.id, body, token)
        console.log(
          `    ✓ ${product.slug.padEnd(30)} variants=[${siblings.join(',') || '—'}]`,
        )
      } catch (err) {
        console.error(`    ✗ ${product.slug}: ${err instanceof Error ? err.message : err}`)
      }
      await new Promise((r) => setTimeout(r, 300))
    }
  }

  console.log('\n✓ done\n')
}

main().catch((err) => {
  console.error('fatal', err)
  process.exit(1)
})

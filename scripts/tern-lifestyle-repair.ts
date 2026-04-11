/**
 * Tern lifestyle repair
 * ─────────────────────
 * The initial Tern brand scrape uploaded hero + lifestyle media and PATCHed
 * each product, but the deployed Payload schema did not yet include the
 * `lifestyleImages` field, so the field was silently dropped on write.
 *
 * This one-shot script re-PATCHes each Tern product with just the
 * lifestyleImages array, pointing at the media ids that were actually
 * uploaded during the scrape (from scripts/brand-scrape-tern.log).
 */
import 'dotenv/config'

const BASE_URL = process.env.PAYLOAD_URL || 'https://carryish.ai'
const EMAIL = process.env.PAYLOAD_EMAIL || 'demo-author@example.com'
const PASSWORD = process.env.PAYLOAD_PASSWORD || 'password'

// Mapping taken from scripts/brand-scrape-tern.log (the 2026-04-11 04:34 run)
const REPAIR_PLAN: Array<{ productId: number; slug: string; lifestyle: number[] }> = [
  { productId: 1, slug: 'tern-gsd-s10', lifestyle: [353, 354, 355] },
  { productId: 115, slug: 'tern-gsd-r14', lifestyle: [357, 358, 359] },
  { productId: 116, slug: 'tern-gsd-p00', lifestyle: [361, 362, 363] },
  { productId: 2, slug: 'tern-hsd-p5i', lifestyle: [365, 366, 367] },
  { productId: 89, slug: 'tern-quick-haul-p9-sport', lifestyle: [369, 370, 371] },
  { productId: 90, slug: 'tern-quick-haul-long-d9', lifestyle: [373, 374, 375] },
  { productId: 93, slug: 'tern-nbd-p8i', lifestyle: [377, 378, 379] },
  { productId: 91, slug: 'tern-orox', lifestyle: [381, 382, 383] },
  { productId: 92, slug: 'tern-short-haul-d8', lifestyle: [385, 386, 387] },
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

async function mediaExists(id: number): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/media/${id}?depth=0`)
  return res.ok
}

async function repair(productId: number, slug: string, mediaIds: number[], token: string) {
  // Confirm every media id exists before PATCHing
  const missing: number[] = []
  for (const id of mediaIds) {
    if (!(await mediaExists(id))) missing.push(id)
  }
  if (missing.length > 0) {
    console.warn(`  ⚠ ${slug}: missing media ids ${missing.join(', ')} — skipping`)
    return
  }

  const body = {
    gallery: {
      lifestyleImages: mediaIds.map((id) => ({ image: id, context: 'lifestyle' })),
    },
  }

  const res = await fetch(`${BASE_URL}/api/products/${productId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.warn(`  ✗ ${slug}: PATCH failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
    return
  }

  // Re-fetch to confirm
  const got = await fetch(`${BASE_URL}/api/products/${productId}?depth=0`).then((r) => r.json())
  const saved = Array.isArray(got?.gallery?.lifestyleImages)
    ? got.gallery.lifestyleImages.length
    : 0
  console.log(`  ✓ ${slug}: saved ${saved} lifestyle image(s)`)
}

async function main() {
  console.log(`[tern-repair] base=${BASE_URL}`)
  const token = await login()
  console.log('[tern-repair] logged in')
  console.log()

  for (const row of REPAIR_PLAN) {
    await repair(row.productId, row.slug, row.lifestyle, token)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

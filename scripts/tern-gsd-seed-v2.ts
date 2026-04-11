/**
 * Tern GSD seed v2
 * ────────────────
 * Updates Tern GSD S10 / R14 / P00 with the redesign-spec fields:
 *   - generation, modelFamily, subtitle
 *   - colorOptions (3 colors with hex codes, no images)
 *   - certifications (DIN 79010, UL 2849, Bosch eBike ABS)
 *
 * Idempotent. Does not touch carryishTake, pros, cons, scores, etc.
 *
 * Usage:
 *   PAYLOAD_URL=https://carryish.ai \
 *   PAYLOAD_EMAIL=... PAYLOAD_PASSWORD=... \
 *   pnpm tsx scripts/tern-gsd-seed-v2.ts
 */
import 'dotenv/config'

const BASE_URL = process.env.PAYLOAD_URL || 'https://carryish.ai'
const EMAIL = process.env.PAYLOAD_EMAIL || 'demo-author@example.com'
const PASSWORD = process.env.PAYLOAD_PASSWORD || 'password'

type ColorOption = { colorName: string; colorHex: string }
type Certification = { name: string; description: string }

type GsdPatch = {
  id: number
  slug: string
  name: string
  subtitle: string
  colorOptions: ColorOption[]
}

const SHARED_CERTS: Certification[] = [
  { name: 'DIN 79010', description: 'German cargo bike safety standard' },
  { name: 'UL 2849', description: 'Fire safety certification for e-bike systems' },
  { name: 'Bosch eBike ABS', description: 'Anti-lock braking for wet conditions' },
]

const GSD_COLORS_3: ColorOption[] = [
  { colorName: 'Beetle Green', colorHex: '#4a6741' },
  { colorName: 'Pearl White', colorHex: '#e8e4dc' },
  { colorName: 'Schoolbus Yellow', colorHex: '#d4a832' },
]

const GSD_COLORS_2: ColorOption[] = [
  { colorName: 'Beetle Green', colorHex: '#4a6741' },
  { colorName: 'Pearl White', colorHex: '#e8e4dc' },
]

const PATCHES: GsdPatch[] = [
  {
    id: 1,
    slug: 'tern-gsd-s10',
    name: 'Tern GSD S10',
    subtitle: 'The do-everything longtail that folds to fit in a closet',
    colorOptions: GSD_COLORS_3,
  },
  {
    id: 115,
    slug: 'tern-gsd-r14',
    name: 'Tern GSD R14',
    subtitle: 'Belt drive and Rohloff hub. The buy-it-for-life GSD.',
    colorOptions: GSD_COLORS_3,
  },
  {
    id: 116,
    slug: 'tern-gsd-p00',
    name: 'Tern GSD P00',
    subtitle: 'Belt drive and stepless CVP shifting. The low-maintenance GSD.',
    colorOptions: GSD_COLORS_2,
  },
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

async function patchProduct(productId: number, body: Record<string, unknown>, token: string) {
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
    throw new Error(`PATCH /products/${productId} failed: ${res.status} ${txt.slice(0, 300)}`)
  }
}

async function main() {
  console.log(`\n→ Tern GSD seed v2 against ${BASE_URL}`)
  const token = await login()
  console.log('  ✓ authenticated\n')

  for (const p of PATCHES) {
    const body = {
      generation: 'Gen 3',
      modelFamily: 'GSD',
      subtitle: p.subtitle,
      colorOptions: p.colorOptions,
      certifications: SHARED_CERTS,
      currentlyAvailable: true,
    }

    try {
      await patchProduct(p.id, body, token)
      console.log(
        `  ✓ ${p.slug.padEnd(18)} colors=${p.colorOptions.length} certs=${SHARED_CERTS.length}`,
      )
    } catch (err) {
      console.error(`  ✗ ${p.slug}: ${err instanceof Error ? err.message : err}`)
    }
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log('\n✓ done\n')
}

main().catch((err) => {
  console.error('fatal', err)
  process.exit(1)
})

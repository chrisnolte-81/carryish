/**
 * Fill Tern product colorOptions + certifications
 * ─────────────────────────────────────────────────
 * Static data. No Claude. Just hardcoded color + cert data keyed by slug,
 * written through the local Payload API.
 *
 * Usage:
 *   pnpm tsx scripts/fill-tern-colors-certs.ts --dry-run
 *   pnpm tsx scripts/fill-tern-colors-certs.ts
 *   pnpm tsx scripts/fill-tern-colors-certs.ts --product=tern-hsd-p5i
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const PRODUCT_FILTER = args.find((a) => a.startsWith('--product='))?.split('=')[1]

type ColorOption = { colorName: string; colorHex: string }
type Certification = { name: string; description: string }

// Cert pools keyed by capability. Combine per product.
const CERT_DIN: Certification = {
  name: 'DIN 79010',
  description: 'German cargo bike safety standard',
}
const CERT_UL: Certification = {
  name: 'UL 2849',
  description: 'Fire safety certification for e-bike systems',
}
const CERT_BOSCH_ABS: Certification = {
  name: 'Bosch eBike ABS',
  description: 'Anti-lock braking for wet conditions',
}

// Per-product data. All six remaining Tern products that the audit flagged.
const TARGETS: Record<
  string,
  { colorOptions: ColorOption[]; certifications: Certification[] }
> = {
  'tern-hsd-p5i': {
    colorOptions: [
      { colorName: 'Matte Black', colorHex: '#2a2a2a' },
      { colorName: 'Silver Blue', colorHex: '#8ba5b5' },
    ],
    certifications: [CERT_DIN, CERT_UL, CERT_BOSCH_ABS],
  },
  'tern-nbd-p8i': {
    colorOptions: [
      { colorName: 'Granite Grey', colorHex: '#5a5d62' },
      { colorName: 'Forest Green', colorHex: '#3d5744' },
    ],
    certifications: [CERT_DIN, CERT_UL],
  },
  'tern-orox': {
    colorOptions: [
      { colorName: 'Expedition Khaki', colorHex: '#7d7355' },
      { colorName: 'Basalt Black', colorHex: '#1f1f22' },
    ],
    certifications: [CERT_DIN, CERT_UL, CERT_BOSCH_ABS],
  },
  'tern-quick-haul-long-d9': {
    colorOptions: [
      { colorName: 'Matte Black', colorHex: '#2a2a2a' },
      { colorName: 'Tabasco', colorHex: '#c62828' },
    ],
    certifications: [CERT_DIN, CERT_UL],
  },
  'tern-quick-haul-p9-sport': {
    colorOptions: [
      { colorName: 'Matte Black', colorHex: '#2a2a2a' },
      { colorName: 'Tabasco', colorHex: '#c62828' },
    ],
    certifications: [CERT_DIN, CERT_UL],
  },
  'tern-short-haul-d8': {
    colorOptions: [
      { colorName: 'Ink Black', colorHex: '#1a1a1f' },
      { colorName: 'Seafoam', colorHex: '#7fbfb0' },
    ],
    // Non-electric — only cargo bike safety cert applies
    certifications: [CERT_DIN],
  },
}

async function main() {
  console.log('\n→ Tern colors + certifications fill')
  console.log(`  mode: ${DRY_RUN ? 'DRY RUN' : 'WRITE'}`)
  if (PRODUCT_FILTER) console.log(`  filter: ${PRODUCT_FILTER}`)
  console.log()

  const payload = await getPayload({ config: configPromise })

  const slugs = PRODUCT_FILTER
    ? Object.keys(TARGETS).filter((s) => s === PRODUCT_FILTER)
    : Object.keys(TARGETS)

  if (slugs.length === 0) {
    console.log(`  ⚠ no targets match filter ${PRODUCT_FILTER}`)
    process.exit(0)
  }

  let written = 0
  let failed = 0

  for (const slug of slugs) {
    const target = TARGETS[slug]
    console.log(`\n── ${slug} ──`)

    const res = await payload.find({
      collection: 'products',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      draft: false,
    })
    const product = res.docs[0]
    if (!product) {
      console.log(`  ✗ not found`)
      failed++
      continue
    }

    console.log(
      `  id=${product.id}  colors=${target.colorOptions.length}  certs=${target.certifications.length}`,
    )
    for (const c of target.colorOptions) {
      console.log(`    • ${c.colorName} (${c.colorHex})`)
    }
    for (const c of target.certifications) {
      console.log(`    • ${c.name} — ${c.description}`)
    }

    if (DRY_RUN) {
      console.log(`  [dry run — not writing]`)
      continue
    }

    try {
      await payload.update({
        collection: 'products',
        id: product.id,
        data: {
          colorOptions: target.colorOptions.map((c) => ({
            colorName: c.colorName,
            colorHex: c.colorHex,
            heroImage: null,
            angleImage: null,
          })),
          certifications: target.certifications.map((c) => ({
            name: c.name,
            description: c.description,
          })),
        } as any,
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      console.log(`  ✓ written`)
      written++
    } catch (err: any) {
      console.log(`  ✗ write failed: ${err.message || err}`)
      failed++
    }
  }

  console.log('\n' + '═'.repeat(60))
  console.log(`  COLORS + CERTS FILL REPORT`)
  console.log('═'.repeat(60))
  console.log(`  Targets: ${slugs.length}`)
  console.log(`  Written: ${written}`)
  console.log(`  Failed:  ${failed}`)
  console.log('═'.repeat(60) + '\n')

  process.exit(0)
}

main().catch((err) => {
  console.error('fatal', err)
  process.exit(1)
})

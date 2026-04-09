/**
 * Data cleanup script for Carryish sprint.
 *
 * Fixes:
 * 1. Strip "(Non-Electric)" from product names, set powerType = 'non-electric'
 * 2. Remove rickroll video entries (dQw4w9WgXcQ)
 * 3. Audit for duplicate products
 * 4. Ensure all bikes have subcategory (cargoLayout) set
 *
 * Usage:
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/data-cleanup.ts
 *   PAYLOAD_URL=https://carryish.ai node --import tsx/esm scripts/data-cleanup.ts --dry-run
 */

import 'dotenv/config'

const BASE_URL = process.env.PAYLOAD_URL || 'http://localhost:3000'
const EMAIL = process.env.PAYLOAD_EMAIL || 'demo-author@example.com'
const PASSWORD = process.env.PAYLOAD_PASSWORD || 'password'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')

async function getToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  const data = await res.json()
  if (!data.token) throw new Error('Login failed: ' + JSON.stringify(data))
  return data.token
}

async function fetchAll(collection: string, token: string, select?: Record<string, boolean>) {
  const params = new URLSearchParams({ limit: '200', depth: '1' })
  if (select) params.set('select', JSON.stringify(select))
  const res = await fetch(`${BASE_URL}/api/${collection}?${params}`, {
    headers: { Authorization: `JWT ${token}` },
  })
  const data = await res.json()
  return data.docs || []
}

async function updateProduct(id: number, updates: Record<string, unknown>, token: string) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would update product ${id}:`, JSON.stringify(updates))
    return
  }
  const res = await fetch(`${BASE_URL}/api/products/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${token}`,
    },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    console.error(`  Failed to update product ${id}: ${res.status}`)
  }
}

async function main() {
  console.log(`\n🔧 Carryish Data Cleanup ${DRY_RUN ? '(DRY RUN)' : ''}\n`)
  console.log(`Target: ${BASE_URL}\n`)

  const token = await getToken()
  console.log('✓ Authenticated\n')

  // ── 1. Fix "(Non-Electric)" in product names ──
  console.log('━━━ 1. Strip "(Non-Electric)" from names ━━━')
  const products = await fetchAll('products', token)
  let nonElectricCount = 0

  for (const p of products) {
    if (p.name?.includes('(Non-Electric)')) {
      const cleanName = p.name.replace(/\s*\(Non-Electric\)\s*/g, '').trim()
      console.log(`  "${p.name}" → "${cleanName}" + powerType=non-electric`)
      await updateProduct(p.id, { name: cleanName, powerType: 'non-electric' }, token)
      nonElectricCount++
    }
  }

  // Also set powerType for bikes that have no motor data (non-electric but not in name)
  for (const p of products) {
    if (!p.name?.includes('(Non-Electric)') && !p.powerType) {
      const isElectric = !!(p.motorBrand || p.motorPosition || p.batteryWh)
      if (!isElectric) {
        console.log(`  "${p.name}" → powerType=non-electric (no motor data)`)
        await updateProduct(p.id, { powerType: 'non-electric' }, token)
        nonElectricCount++
      }
    }
  }

  console.log(`  Fixed ${nonElectricCount} non-electric bikes\n`)

  // ── 2. Remove rickroll videos ──
  console.log('━━━ 2. Remove rickroll video entries ━━━')
  const videos = await fetchAll('product-videos', token)
  let rickrollCount = 0

  for (const v of videos) {
    if (v.youtubeId === 'dQw4w9WgXcQ') {
      console.log(`  Removing rickroll video: "${v.title}" (product ${v.product})`)
      if (!DRY_RUN) {
        const res = await fetch(`${BASE_URL}/api/product-videos/${v.id}`, {
          method: 'DELETE',
          headers: { Authorization: `JWT ${token}` },
        })
        if (!res.ok) console.error(`  Failed to delete video ${v.id}: ${res.status}`)
      }
      rickrollCount++
    }
  }
  console.log(`  Removed ${rickrollCount} rickroll videos\n`)

  // ── 3. Audit duplicates ──
  console.log('━━━ 3. Audit for duplicate products ━━━')
  const nameMap = new Map<string, Array<{ id: number; name: string; slug: string }>>()

  for (const p of products) {
    // Normalize name for comparison
    const normalized = p.name
      .toLowerCase()
      .replace(/\s*\(non-electric\)\s*/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()

    if (!nameMap.has(normalized)) nameMap.set(normalized, [])
    nameMap.get(normalized)!.push({ id: p.id, name: p.name, slug: p.slug })
  }

  let dupeGroups = 0
  for (const [name, entries] of nameMap) {
    if (entries.length > 1) {
      dupeGroups++
      console.log(`  DUPLICATE: "${name}"`)
      for (const e of entries) {
        console.log(`    - id=${e.id} name="${e.name}" slug="${e.slug}"`)
      }
    }
  }
  if (dupeGroups === 0) console.log('  No duplicates found')
  console.log()

  // ── 4. Audit missing subcategories ──
  console.log('━━━ 4. Products missing cargoLayout (subcategory) ━━━')
  let missingLayout = 0
  for (const p of products) {
    if (p.category === 'cargo-bike' && !p.cargoLayout) {
      console.log(`  Missing layout: "${p.name}" (id=${p.id})`)
      missingLayout++
    }
  }
  if (missingLayout === 0) console.log('  All cargo bikes have a layout set')
  console.log()

  console.log('━━━ Summary ━━━')
  console.log(`  Non-electric names fixed: ${nonElectricCount}`)
  console.log(`  Rickroll videos removed: ${rickrollCount}`)
  console.log(`  Duplicate groups found: ${dupeGroups}`)
  console.log(`  Missing subcategories: ${missingLayout}`)
  console.log()
}

main().catch(console.error)

/**
 * Tern audit — read-only coverage check
 * ──────────────────────────────────────
 * Uses the local Payload API (getPayload) to query the prod Neon DB directly,
 * then prints a coverage table showing which editorial + content fields are
 * populated vs empty on each Tern product. Also fetches each GSD product page
 * HTML over HTTP to verify the variant bar renders with the correct
 * current-product highlight.
 *
 * Usage:
 *   pnpm tsx scripts/audit-tern.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

const HTTP_BASE = process.env.PAYLOAD_URL || 'https://carryish.ai'

type AnyObj = Record<string, unknown>

function richTextHasContent(rt: unknown): boolean {
  if (!rt || typeof rt !== 'object') return false
  const root = (rt as AnyObj).root as AnyObj | undefined
  if (!root) return false
  const children = root.children as unknown[] | undefined
  if (!Array.isArray(children) || children.length === 0) return false
  const json = JSON.stringify(children)
  return /"text"\s*:\s*"[^"]+"/.test(json)
}

function richTextLength(rt: unknown): number {
  if (!rt || typeof rt !== 'object') return 0
  const root = (rt as AnyObj).root as AnyObj | undefined
  if (!root) return 0
  const json = JSON.stringify(root)
  // Walk object to sum text lengths accurately
  let total = 0
  const walk = (n: unknown) => {
    if (!n) return
    if (Array.isArray(n)) {
      for (const c of n) walk(c)
      return
    }
    if (typeof n === 'object') {
      const obj = n as AnyObj
      if (typeof obj.text === 'string') total += obj.text.length
      if (Array.isArray(obj.children)) for (const c of obj.children) walk(c)
    }
  }
  try {
    walk(JSON.parse(json))
  } catch {}
  return total
}

const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const red = (s: string) => `\x1b[31m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`

function pad(s: string, n: number): string {
  const stripped = s.replace(/\x1b\[[0-9;]*m/g, '')
  return s + ' '.repeat(Math.max(0, n - stripped.length))
}

function mark(ok: boolean, detail?: string): string {
  if (ok) return green(detail || '✓')
  return red(detail ? `—${detail}` : '—')
}

async function verifyVariantBar(
  slug: string,
): Promise<{ rendered: boolean; highlighted: string | null; siblings: string[] }> {
  try {
    const res = await fetch(`${HTTP_BASE}/bikes/${slug}`, {
      headers: { 'User-Agent': 'carryish-audit/1.0' },
    })
    if (!res.ok) return { rendered: false, highlighted: null, siblings: [] }
    const html = await res.text()

    // The VariantBar renders a header "<modelFamily> lineup"
    const headingMatch = html.match(/([A-Z][a-zA-Z ]+)\s+lineup/)
    if (!headingMatch) return { rendered: false, highlighted: null, siblings: [] }

    // Find aria-current="page" card — that's the highlighted one
    const currentMatch = html.match(
      /aria-current="page"[^>]*>[\s\S]*?<p[^>]*>([^<]+)<\/p>/,
    )
    const highlighted = currentMatch ? currentMatch[1].trim() : null

    // Sibling hrefs
    const barRegion =
      html.match(/lineup<\/p>[\s\S]{0,4000}?(?=<\/div>\s*<\/div>)/)?.[0] || ''
    const hrefs = Array.from(barRegion.matchAll(/href="\/bikes\/([^"]+)"/g)).map(
      (m) => m[1],
    )

    return { rendered: true, highlighted, siblings: hrefs }
  } catch {
    return { rendered: false, highlighted: null, siblings: [] }
  }
}

async function main() {
  console.log(`\n→ Tern product audit (DB via getPayload, pages via ${HTTP_BASE})\n`)
  const payload = await getPayload({ config: configPromise })

  // Find Tern brand
  const brands = await payload.find({
    collection: 'brands',
    where: { slug: { equals: 'tern' } },
    limit: 1,
    depth: 0,
  })
  const tern = brands.docs[0]
  if (!tern) throw new Error('Tern brand not found')
  console.log(`  ✓ Tern brand id=${tern.id}`)

  // All Tern products, with depth=2 so variants are full docs
  const productsRes = await payload.find({
    collection: 'products',
    where: { brand: { equals: tern.id } },
    limit: 50,
    depth: 2,
    overrideAccess: true,
    draft: false,
  })
  const products = productsRes.docs as unknown as AnyObj[]
  console.log(`  ✓ ${products.length} Tern products\n`)

  products.sort((a, b) => {
    const af = String(a.modelFamily || 'zzz')
    const bf = String(b.modelFamily || 'zzz')
    if (af !== bf) return af.localeCompare(bf)
    return String(a.name).localeCompare(String(b.name))
  })

  // ─── Coverage table ───
  console.log('─'.repeat(140))
  console.log(
    pad('Product', 26) +
      pad('sub', 5) +
      pad('gen', 7) +
      pad('fam', 12) +
      pad('price', 9) +
      pad('col', 5) +
      pad('pros', 6) +
      pad('cons', 6) +
      pad('faq', 5) +
      pad('bF', 5) +
      pad('nF', 5) +
      pad('take', 7) +
      pad('verd', 6) +
      pad('cert', 6) +
      pad('img', 5) +
      pad('life', 6) +
      pad('var', 5),
  )
  console.log('─'.repeat(140))

  const missingFields = new Map<string, string[]>()

  for (const p of products) {
    const slug = String(p.slug || '')
    const displayName = String(p.name || '').replace(/^Tern /, '')
    const gone: string[] = []

    const has = {
      subtitle: typeof p.subtitle === 'string' && p.subtitle.length > 0,
      generation: typeof p.generation === 'string' && p.generation.length > 0,
      modelFamily: typeof p.modelFamily === 'string' && p.modelFamily.length > 0,
      price: typeof p.price === 'number' && p.price > 0,
      colorOptions: Array.isArray(p.colorOptions) && p.colorOptions.length > 0,
      pros: Array.isArray(p.pros) && p.pros.length > 0,
      cons: Array.isArray(p.cons) && p.cons.length > 0,
      faq: Array.isArray(p.faq) && p.faq.length > 0,
      bestFor: Array.isArray(p.bestFor) && p.bestFor.length > 0,
      notFor: Array.isArray(p.notFor) && p.notFor.length > 0,
      carryishTake: richTextHasContent(p.carryishTake),
      verdict: typeof p.verdict === 'string' && p.verdict.length > 0,
      certifications: Array.isArray(p.certifications) && p.certifications.length > 0,
      images: Array.isArray(p.images) && p.images.length > 0,
      lifestyle:
        !!p.gallery &&
        typeof p.gallery === 'object' &&
        Array.isArray((p.gallery as AnyObj).lifestyleImages) &&
        ((p.gallery as AnyObj).lifestyleImages as unknown[]).length > 0,
      variants: Array.isArray(p.variants) && p.variants.length > 0,
    }

    if (!has.subtitle) gone.push('subtitle')
    if (!has.pros) gone.push('pros')
    if (!has.cons) gone.push('cons')
    if (!has.faq) gone.push('faq')
    if (!has.bestFor) gone.push('bestFor')
    if (!has.notFor) gone.push('notFor')
    if (!has.carryishTake) gone.push('carryishTake')
    if (!has.verdict) gone.push('verdict')
    if (!has.colorOptions) gone.push('colorOptions')
    if (!has.certifications) gone.push('certifications')
    if (!has.lifestyle) gone.push('lifestyleImages')
    if (!has.variants) gone.push('variants')
    missingFields.set(slug, gone)

    const len = (arr: unknown) => (Array.isArray(arr) ? String(arr.length) : '0')
    const lifeLen =
      p.gallery &&
      typeof p.gallery === 'object' &&
      Array.isArray((p.gallery as AnyObj).lifestyleImages)
        ? String(((p.gallery as AnyObj).lifestyleImages as unknown[]).length)
        : '0'
    const takeLen = richTextLength(p.carryishTake)

    console.log(
      pad(displayName, 26) +
        pad(mark(has.subtitle), 5) +
        pad(mark(has.generation, String(p.generation || '')), 7) +
        pad(mark(has.modelFamily, String(p.modelFamily || '')), 12) +
        pad(mark(has.price, has.price ? `$${p.price}` : ''), 9) +
        pad(mark(has.colorOptions, len(p.colorOptions)), 5) +
        pad(mark(has.pros, len(p.pros)), 6) +
        pad(mark(has.cons, len(p.cons)), 6) +
        pad(mark(has.faq, len(p.faq)), 5) +
        pad(mark(has.bestFor, len(p.bestFor)), 5) +
        pad(mark(has.notFor, len(p.notFor)), 5) +
        pad(mark(has.carryishTake, takeLen > 0 ? String(takeLen) : ''), 7) +
        pad(mark(has.verdict), 6) +
        pad(mark(has.certifications, len(p.certifications)), 6) +
        pad(mark(has.images, len(p.images)), 5) +
        pad(mark(has.lifestyle, lifeLen), 6) +
        pad(mark(has.variants, len(p.variants)), 5),
    )
  }
  console.log('─'.repeat(140))

  // ─── Missing-fields summary ───
  console.log('\n## Missing fields per product\n')
  for (const [slug, gone] of missingFields) {
    if (gone.length === 0) {
      console.log(`  ${green('✓')} ${slug}`)
    } else {
      console.log(
        `  ${red('✗')} ${slug.padEnd(30)} ${dim('missing:')} ${yellow(gone.join(', '))}`,
      )
    }
  }

  // ─── Carryish Take length check ───
  console.log(
    '\n## carryishTake length (target 180-500 chars for 3-4 sentences)\n',
  )
  for (const p of products) {
    const len = richTextLength(p.carryishTake)
    const slug = String(p.slug)
    let flag: string
    if (len === 0) flag = dim('empty')
    else if (len < 180) flag = yellow('too short')
    else if (len > 500) flag = yellow('too long (likely 3 paragraphs)')
    else flag = green('ok')
    console.log(`  ${slug.padEnd(30)} ${String(len).padStart(5)}  ${flag}`)
  }

  // ─── Stale $5,300 reference check ───
  console.log('\n## Stale price refs on Tern GSD S10\n')
  const s10 = products.find((p) => p.slug === 'tern-gsd-s10')
  if (s10) {
    const json = JSON.stringify(s10)
    const stale = json.match(/\$?5,?300/g) || []
    const correct = json.match(/\$?7,?999/g) || []
    console.log(
      `  tern-gsd-s10: stale '$5,300' refs = ${stale.length}, '$7,999' refs = ${correct.length}`,
    )
    if (stale.length > 0) console.log(`    ${red('⚠ stale refs still present')}`)
  }

  // ─── Variant bar rendering check on GSD pages ───
  console.log('\n## Variant bar rendering (GSD pages — fetches prod HTML)\n')
  const gsdSlugs = products
    .filter((p) => p.modelFamily === 'GSD')
    .map((p) => String(p.slug))
  for (const slug of gsdSlugs) {
    const result = await verifyVariantBar(slug)
    if (!result.rendered) {
      console.log(`  ${red('✗')} ${slug.padEnd(22)} variant bar NOT rendered`)
      continue
    }
    const expectedSuffix = slug.replace('tern-gsd-', '').toUpperCase()
    const highlightedNorm = (result.highlighted || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
    const expected = expectedSuffix.replace(/[^A-Z0-9]/g, '')
    const matches = highlightedNorm === expected
    const symbol = matches ? green('✓') : red('✗')
    console.log(
      `  ${symbol} ${slug.padEnd(22)} highlighted="${result.highlighted}" (expected "${expectedSuffix}") siblings=[${result.siblings.join(', ') || '—'}]`,
    )
  }

  console.log('\n✓ audit complete\n')
  process.exit(0)
}

main().catch((e) => {
  console.error('fatal', e)
  process.exit(1)
})

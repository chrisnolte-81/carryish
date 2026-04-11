import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import type { Product, Media as MediaType } from '@/payload-types'

const cargoLayoutLabels: Record<string, string> = {
  longtail: 'Longtail',
  'front-box': 'Front-box',
  compact: 'Compact',
  midtail: 'Midtail',
  trike: 'Trike',
}

const drivetrainLabels: Record<string, string> = {
  chain: 'Chain',
  belt: 'Belt drive',
  shaft: 'Shaft drive',
}

const gearTypeLabels: Record<string, string> = {
  derailleur: 'Derailleur',
  'internal-hub': 'Internal hub',
  cvp: 'CVP (stepless)',
  'single-speed': 'Single speed',
}

/**
 * Family slugs look like "{brand-slug}-{model-family-lowercase}".
 * E.g. "tern-gsd", "tern-hsd", "urban-arrow-family".
 * We decode the family param to find the right products by matching
 * brand.slug prefix + modelFamily (case-insensitive).
 */
export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const products = await payload.find({
    collection: 'products',
    draft: false,
    depth: 1,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    where: { modelFamily: { exists: true } },
    // Only need brand + modelFamily to build slugs; skip heavy lateral joins
    select: {
      brand: true,
      modelFamily: true,
    },
  })

  const seen = new Set<string>()
  const params: { family: string }[] = []
  for (const p of products.docs) {
    const brand = typeof p.brand === 'object' ? p.brand : null
    if (!brand?.slug || !p.modelFamily) continue
    const key = `${brand.slug}-${p.modelFamily.toLowerCase().replace(/\s+/g, '-')}`
    if (seen.has(key)) continue
    seen.add(key)
    params.push({ family: key })
  }
  return params
}

function slugifyFamily(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-')
}

type Args = {
  params: Promise<{ family?: string }>
}

const queryFamilyProducts = cache(async ({ family }: { family: string }) => {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })

  // Family slug is "{brand-slug}-{model-family-slug}".
  // Walk candidate splits so multi-word brand slugs work (e.g. "urban-arrow-family").
  const parts = family.split('-')
  if (parts.length < 2) return null

  for (let i = parts.length - 1; i >= 1; i--) {
    const brandSlug = parts.slice(0, i).join('-')
    const familySlug = parts.slice(i).join('-')

    // Fetch all products for this brand, then filter by modelFamily locally
    // (modelFamily is free-text with possible spaces, so we slugify both sides)
    const result = await payload.find({
      collection: 'products',
      draft,
      depth: 2,
      limit: 200,
      overrideAccess: draft,
      pagination: false,
      where: {
        'brand.slug': { equals: brandSlug },
      },
      sort: 'price',
    })

    if (result.docs.length > 0) {
      const filtered = result.docs.filter(
        (p) => p.modelFamily && slugifyFamily(p.modelFamily) === familySlug,
      )
      if (filtered.length > 0) return filtered
    }
  }

  return null
})

// Pick the "our pick" product — highest overallScore, tiebreak on lowest price
function pickOurPick(products: Product[]): Product | null {
  if (products.length === 0) return null
  const sorted = [...products].sort((a, b) => {
    const as = a.overallScore ?? 0
    const bs = b.overallScore ?? 0
    if (bs !== as) return bs - as
    return (a.price ?? Infinity) - (b.price ?? Infinity)
  })
  return sorted[0] || null
}

// Pull a shared-spec row out of multiple products when they all agree
type SharedRow = { label: string; value: string }
function findSharedSpecs(products: Product[]): SharedRow[] {
  const rows: SharedRow[] = []
  const first = products[0]
  if (!first) return rows

  const candidates: Array<{ label: string; get: (p: Product) => string | null }> = [
    { label: 'Category', get: (p) => (p.cargoLayout ? cargoLayoutLabels[p.cargoLayout] || p.cargoLayout : null) },
    {
      label: 'Motor',
      get: (p) =>
        p.motorBrand && p.motorTorqueNm
          ? `${p.motorBrand} · ${p.motorTorqueNm} Nm`
          : p.motorBrand || null,
    },
    { label: 'Max load', get: (p) => (p.maxSystemWeightLbs ? `${p.maxSystemWeightLbs} lbs` : null) },
    { label: 'Cargo capacity', get: (p) => (p.cargoCapacityLbs ? `${p.cargoCapacityLbs} lbs` : null) },
    { label: 'Frame weight', get: (p) => (p.weightLbs ? `${p.weightLbs} lbs` : null) },
    { label: 'Rider height', get: (p) =>
        p.riderHeightMin && p.riderHeightMax ? `${p.riderHeightMin} – ${p.riderHeightMax}` : null,
    },
    { label: 'Foldable', get: (p) => (p.foldable ? 'Yes' : null) },
  ]

  for (const c of candidates) {
    const firstValue = c.get(first)
    if (!firstValue) continue
    if (products.every((p) => c.get(p) === firstValue)) {
      rows.push({ label: c.label, value: firstValue })
    }
  }
  return rows
}

// Build comparison rows that differ across variants
type CompareRow = { label: string; values: (string | null)[]; bestIndex?: number }
function buildCompareRows(products: Product[]): CompareRow[] {
  const rows: CompareRow[] = []

  type Col = {
    label: string
    get: (p: Product) => string | null
    bestBy?: 'max' | 'min'
    raw?: (p: Product) => number | null
  }

  const cols: Col[] = [
    {
      label: 'Price',
      get: (p) => (p.price != null ? `$${p.price.toLocaleString()}` : null),
      raw: (p) => p.price ?? null,
      bestBy: 'min',
    },
    {
      label: 'Drivetrain',
      get: (p) =>
        p.drivetrainType
          ? `${drivetrainLabels[p.drivetrainType] || p.drivetrainType}${
              p.drivetrainBrand ? ` — ${p.drivetrainBrand}` : ''
            }`
          : null,
    },
    {
      label: 'Gearing',
      get: (p) =>
        p.gearType
          ? `${gearTypeLabels[p.gearType] || p.gearType}${
              p.numberOfGears ? ` · ${p.numberOfGears}-speed` : ''
            }`
          : null,
    },
    {
      label: 'Battery',
      get: (p) => (p.batteryWh ? `${p.batteryWh}Wh` : null),
      raw: (p) => p.batteryWh ?? null,
      bestBy: 'max',
    },
    {
      label: 'Stated range',
      get: (p) => (p.statedRangeMi ? `${p.statedRangeMi} mi` : null),
      raw: (p) => p.statedRangeMi ?? null,
      bestBy: 'max',
    },
    {
      label: 'Overall score',
      get: (p) => (p.overallScore != null ? `${p.overallScore}/10` : null),
      raw: (p) => p.overallScore ?? null,
      bestBy: 'max',
    },
  ]

  for (const col of cols) {
    const values = products.map((p) => col.get(p))
    // Only include rows where at least one product has a value
    if (values.every((v) => v == null)) continue
    // Skip rows where all values are identical (shared → show in shared section)
    const unique = new Set(values.map((v) => v || ''))
    if (unique.size === 1) continue

    let bestIndex: number | undefined
    if (col.bestBy && col.raw) {
      const raws = products.map(col.raw)
      let best: number | null = null
      raws.forEach((r, i) => {
        if (r == null) return
        if (best == null) {
          best = r
          bestIndex = i
        } else if (col.bestBy === 'max' && r > best) {
          best = r
          bestIndex = i
        } else if (col.bestBy === 'min' && r < best) {
          best = r
          bestIndex = i
        }
      })
    }

    rows.push({ label: col.label, values, bestIndex })
  }

  return rows
}

export default async function ModelFamilyPage({ params: paramsPromise }: Args) {
  const { family = '' } = await paramsPromise
  const decodedFamily = decodeURIComponent(family)
  const products = await queryFamilyProducts({ family: decodedFamily })

  if (!products || products.length === 0) notFound()

  // All products share the same brand + modelFamily
  const first = products[0]
  const brand = typeof first.brand === 'object' ? first.brand : null
  const modelFamily = first.modelFamily || ''
  const category = first.category

  // Sort cheapest first for display
  const sorted = [...products].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))

  const ourPick = pickOurPick(products)
  const shared = findSharedSpecs(products)
  const compareRows = buildCompareRows(sorted)

  // Find the best "family hero" image from the cheapest (base) product
  const familyHeroProduct = sorted[0]
  const familyHeroImage =
    familyHeroProduct.images && familyHeroProduct.images.length > 0
      ? familyHeroProduct.images[0]
      : null

  // Pick a shared carryishTake — use the base variant's
  const familyTake = familyHeroProduct.carryishTake || null
  const familySubtitle = familyHeroProduct.subtitle

  // Shared certifications (if all products have identical ones)
  const firstCerts = (first.certifications || []).map((c) => c.name).sort().join('|')
  const allCertsMatch = products.every(
    (p) => (p.certifications || []).map((c) => c.name).sort().join('|') === firstCerts,
  )
  const sharedCerts = allCertsMatch ? first.certifications || [] : []

  return (
    <article className="bg-[#FAFAF8] min-h-screen">
      <div className="container py-20 sm:py-24">
        {/* Breadcrumbs */}
        <nav className="mb-8 text-sm text-[#7A7A8C]">
          <Link href="/" className="hover:text-[#1A1A2E] no-underline transition-colors">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/bikes" className="hover:text-[#1A1A2E] no-underline transition-colors">
            Bikes
          </Link>
          {brand && (
            <>
              <span className="mx-2">/</span>
              <Link
                href={`/brands/${brand.slug}`}
                className="hover:text-[#1A1A2E] no-underline transition-colors"
              >
                {brand.name}
              </Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-[#1A1A2E]">{modelFamily}</span>
        </nav>

        {/* ─── Header ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center mb-16">
          <div>
            {category && (
              <span className="text-xs uppercase tracking-wider text-[#7A7A8C] font-medium">
                {category.replace('-', ' ')} family
              </span>
            )}
            <h1 className="font-[family-name:var(--font-fraunces)] text-4xl sm:text-5xl font-semibold text-[#1A1A2E] mt-3 tracking-tight">
              {brand?.name} {modelFamily}
            </h1>
            {familySubtitle && (
              <p className="font-[family-name:var(--font-fraunces)] text-xl text-[#1A1A2E]/70 mt-3 leading-snug">
                {familySubtitle}
              </p>
            )}
            {brand && (
              <p className="text-[#7A7A8C] mt-3 text-base">
                Made by{' '}
                <Link
                  href={`/brands/${brand.slug}`}
                  className="text-[#3A8FE8] hover:text-[#2D72BA] no-underline"
                >
                  {brand.name}
                </Link>
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#1A1A2E]/5 text-[#1A1A2E] px-3 py-1.5 rounded-full">
                {products.length} variants
              </span>
              {sorted[0].price != null && sorted[sorted.length - 1].price != null && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#1A1A2E]/5 text-[#1A1A2E] px-3 py-1.5 rounded-full">
                  ${sorted[0].price!.toLocaleString()} – ${sorted[sorted.length - 1].price!.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div className="relative aspect-[4/3] bg-[#FAFAF8] rounded-[14px] overflow-hidden border border-[#7A7A8C]/10">
            {familyHeroImage && typeof familyHeroImage === 'object' ? (
              <Media resource={familyHeroImage} imgClassName="object-contain w-full h-full" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[#1A1A2E]/40">
                No image
              </div>
            )}
          </div>
        </div>

        {/* ─── Family Carryish Take ─── */}
        {familyTake && (
          <div className="mt-4 max-w-3xl">
            <div className="bg-[#FAFAF8] border-l-[3px] border-[#E85D3A] pl-8 py-6">
              <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-[#E85D3A] mb-4">
                The Carryish Take on the {modelFamily}
              </h2>
              <div className="text-[#1A1A2E] text-[1.05rem] leading-[1.7]">
                <RichText data={familyTake} enableGutter={false} />
              </div>
            </div>
          </div>
        )}

        {/* ─── Which one should you get? ─── */}
        {products.length > 1 && (
          <div className="mt-16 max-w-3xl bg-[#FEF0EC] border border-[#E85D3A]/20 rounded-[14px] p-8">
            <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#1A1A2E] mb-4">
              Which one should you get?
            </h2>
            <ul className="space-y-3 text-sm text-[#1A1A2E]/85 leading-relaxed">
              {sorted.map((p) => (
                <li key={p.id} className="flex items-start gap-3">
                  <span className="text-[#E85D3A] font-bold shrink-0 mt-0.5">→</span>
                  <span>
                    <Link
                      href={`/bikes/${p.slug}`}
                      className="font-semibold text-[#1A1A2E] hover:text-[#E85D3A] no-underline"
                    >
                      {p.name}
                    </Link>
                    {p.subtitle && <span className="text-[#7A7A8C]"> — {p.subtitle}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ─── Model cards ─── */}
        <div className="mt-20">
          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E] mb-8">
            Variants in the lineup
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((p) => {
              const pImage = p.images && p.images.length > 0 ? p.images[0] : null
              const isOurPick = ourPick?.id === p.id
              return (
                <Link
                  key={p.id}
                  href={`/bikes/${p.slug}`}
                  className={`group relative block bg-white border rounded-[12px] overflow-hidden hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200 no-underline ${
                    isOurPick ? 'border-[#E85D3A]/40 shadow-[0_4px_20px_rgba(232,93,58,0.08)]' : 'border-[#7A7A8C]/15'
                  }`}
                >
                  {isOurPick && (
                    <span className="absolute top-3 left-3 z-10 bg-[#E85D3A] text-white text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded">
                      Our pick
                    </span>
                  )}
                  <div className="relative aspect-[4/3] w-full bg-[#FAFAF8]">
                    {pImage && typeof pImage === 'object' ? (
                      <Media resource={pImage} imgClassName="object-contain w-full h-full" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[#1A1A2E]/40 text-sm">
                        {p.name}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-[#1A1A2E] group-hover:text-[#E85D3A] transition-colors leading-tight">
                      {p.name}
                    </h3>
                    {p.subtitle && (
                      <p className="text-sm text-[#7A7A8C] mt-1.5 leading-snug line-clamp-2">
                        {p.subtitle}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#7A7A8C]/10">
                      {p.price != null ? (
                        <span className="text-base font-semibold text-[#1A1A2E]">
                          ${p.price.toLocaleString()}
                        </span>
                      ) : (
                        <span />
                      )}
                      {p.overallScore != null && (
                        <span className="text-xs font-bold bg-[#1A1A2E] text-white px-2 py-0.5 rounded">
                          {p.overallScore}/10
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* ─── Comparison table ─── */}
        {compareRows.length > 0 && sorted.length > 1 && (
          <div className="mt-20">
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E] mb-6">
              Compare variants
            </h2>
            <div className="overflow-x-auto rounded-[12px] border border-[#7A7A8C]/15">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-[#FAFAF8] border-b border-[#7A7A8C]/15">
                    <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-[#7A7A8C] font-semibold">
                      Spec
                    </th>
                    {sorted.map((p) => (
                      <th
                        key={p.id}
                        className="text-left px-4 py-3 text-xs uppercase tracking-wider text-[#1A1A2E] font-semibold whitespace-nowrap"
                      >
                        <Link
                          href={`/bikes/${p.slug}`}
                          className="text-[#1A1A2E] hover:text-[#E85D3A] no-underline"
                        >
                          {p.name.replace(`${brand?.name || ''} `, '').replace(`${modelFamily} `, '') || p.name}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#7A7A8C]/10 bg-white">
                  {compareRows.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-3 text-[#7A7A8C]">{row.label}</td>
                      {row.values.map((v, i) => (
                        <td
                          key={i}
                          className={`px-4 py-3 font-medium ${
                            row.bestIndex === i ? 'text-[#E85D3A]' : 'text-[#1A1A2E]'
                          }`}
                        >
                          {v || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-[#7A7A8C]">
              Values in <span className="text-[#E85D3A] font-semibold">coral</span> are the best in the lineup for that row.
            </p>
          </div>
        )}

        {/* ─── Shared specs ─── */}
        {shared.length > 0 && (
          <div className="mt-20">
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E] mb-6">
              What every {modelFamily} shares
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {shared.map((row) => (
                <div
                  key={row.label}
                  className="p-5 rounded-[10px] bg-white border border-[#7A7A8C]/15"
                >
                  <p className="text-xs uppercase tracking-wider text-[#7A7A8C] font-semibold">
                    {row.label}
                  </p>
                  <p className="text-base font-semibold text-[#1A1A2E] mt-1.5">{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Shared certifications ─── */}
        {sharedCerts.length > 0 && (
          <div className="mt-20 max-w-3xl">
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E] mb-6">
              Safety certifications
            </h2>
            <div className="flex flex-wrap gap-3">
              {sharedCerts.map((cert, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 bg-[#3A8FE8]/5 border border-[#3A8FE8]/20 rounded-lg px-4 py-3 max-w-sm"
                >
                  <svg
                    className="w-5 h-5 text-[#3A8FE8] shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A2E]">{cert.name}</p>
                    {cert.description && (
                      <p className="text-xs text-[#7A7A8C] mt-0.5 leading-snug">{cert.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { family = '' } = await paramsPromise
  const products = await queryFamilyProducts({ family: decodeURIComponent(family) })
  if (!products || products.length === 0) return { title: 'Model Family Not Found' }

  const first = products[0]
  const brand = typeof first.brand === 'object' ? first.brand : null
  const modelFamily = first.modelFamily || ''
  const subtitle = first.subtitle || ''

  return {
    title: `${brand?.name || ''} ${modelFamily} — ${products.length} variants compared | Carryish`,
    description:
      subtitle ||
      `Compare every ${brand?.name} ${modelFamily} variant side-by-side. Specs, prices, and which one is right for you.`,
  }
}

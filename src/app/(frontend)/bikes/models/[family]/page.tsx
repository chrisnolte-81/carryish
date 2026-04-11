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

type FamilyMeta = {
  subtitle?: string
  take?: string
  decisionHelper?: { title: string; body: string }
  sharedFeatures?: Array<{ icon: string; title: string; description: string }>
}

// Family-level editorial overrides. When a family slug matches, these values
// replace the variant-derived subtitle and Take, and supply extra sections.
const FAMILY_METADATA: Record<string, FamilyMeta> = {
  'tern-gsd': {
    subtitle: 'The compact longtail that folds. Three builds, one platform. Gen 3.',
    take:
      "Every GSD shares the same folding frame, 463 lb capacity, and 20\" wheels. The difference is drivetrain: the S10 gives you a proven Shimano chain for the least money. The P00 upgrades to a Gates belt that never needs maintenance. The R14 goes all-in with a Rohloff 14-speed that'll outlast the bike.",
    decisionHelper: {
      title: 'Not sure which GSD?',
      body: 'The S10 is right for most families. Upgrade to the P00 if you hate chain maintenance, or step up to the R14 for the last drivetrain you will ever need.',
    },
    sharedFeatures: [
      { icon: 'F', title: 'FlatFold', description: 'Handlebar folds down, seatpost telescopes. Fits in SUVs and tight spaces.' },
      { icon: 'V', title: 'Vertical parking', description: 'Stands upright on its tail. Footprint of a potted plant.' },
      { icon: 'A', title: 'Bosch ABS', description: 'Prevents wheel lockup in wet conditions and emergency braking.' },
      { icon: 'L', title: 'Integrated lights', description: 'Supernova headlight + RearStop brake light, powered by main battery.' },
      { icon: 'K', title: 'Atlas lockstand', description: 'Auto-locking double-leg kickstand with remote unlock.' },
      { icon: 'S', title: 'Smart system', description: 'Bosch Kiox 300, Flow app, GPS anti-theft, electronic lock.' },
    ],
  },
  'tern-quick-haul': {
    subtitle: "Tern's affordable cargo platform. Two builds, one frame family. Compact or stretched.",
    take:
      "Both Quick Hauls undercut the GSD by two grand while running the same Bosch platform. The P9 Sport at $3,399 is the compact pick — one kid plus groceries, 65Nm motor, fits an apartment elevator. The Long D9 adds $600 for a stretched midtail deck, an 85Nm motor, and 88 lbs more capacity — RadWagon 5 Plus territory, minus the RadPower reliability concerns.",
    decisionHelper: {
      title: 'Compact or stretched?',
      body: 'Go P9 Sport if you have one kid and live in a small apartment. Step up to Long D9 if you haul two kids or bigger loads — the extra $600 buys 88 more lbs of max load and a stronger motor.',
    },
  },
}

/**
 * Compute display tags for a single variant card: drivetrain, gearing, colors.
 * Belt drive and Rohloff hub get the green "standout" highlight.
 */
function variantCardTags(p: Product): Array<{ label: string; highlight?: boolean }> {
  const tags: Array<{ label: string; highlight?: boolean }> = []
  if (p.drivetrainType === 'belt') {
    tags.push({ label: 'Belt drive', highlight: true })
  } else if (p.drivetrainType === 'chain') {
    tags.push({ label: 'Chain drive' })
  } else if (p.drivetrainType === 'shaft') {
    tags.push({ label: 'Shaft drive' })
  }
  if (p.drivetrainBrand && /rohloff/i.test(p.drivetrainBrand)) {
    tags.push({ label: 'Rohloff hub', highlight: true })
  } else if (p.gearType === 'cvp') {
    tags.push({ label: 'CVP shifting' })
  } else if (p.gearType === 'internal-hub' && p.numberOfGears) {
    tags.push({ label: `${p.numberOfGears}-speed hub` })
  } else if (p.gearType === 'derailleur' && p.numberOfGears) {
    tags.push({ label: `${p.numberOfGears}-speed` })
  }
  const colorCount = (p.colorOptions || []).length
  if (colorCount > 1) {
    tags.push({ label: `${colorCount} colors` })
  }
  return tags
}

export const revalidate = 3600

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

// Build comparison rows that differ across variants, grouped by section
type CompareRow = { label: string; values: (string | null)[]; bestIndex?: number }
type CompareSection = { title: string; rows: CompareRow[] }

function buildCompareSections(products: Product[]): CompareSection[] {
  type Col = {
    label: string
    section: string
    get: (p: Product) => string | null
    bestBy?: 'max' | 'min'
    raw?: (p: Product) => number | null
  }

  const cols: Col[] = [
    {
      label: 'Price',
      section: 'Price and value',
      get: (p) => (p.price != null ? `$${p.price.toLocaleString()}` : null),
      raw: (p) => p.price ?? null,
      bestBy: 'min',
    },
    {
      label: 'Overall score',
      section: 'Price and value',
      get: (p) => (p.overallScore != null ? `${p.overallScore}/10` : null),
      raw: (p) => p.overallScore ?? null,
      bestBy: 'max',
    },
    {
      label: 'Drivetrain',
      section: 'Drivetrain',
      get: (p) =>
        p.drivetrainType
          ? `${drivetrainLabels[p.drivetrainType] || p.drivetrainType}${
              p.drivetrainBrand ? ` — ${p.drivetrainBrand}` : ''
            }`
          : null,
    },
    {
      label: 'Gearing',
      section: 'Drivetrain',
      get: (p) =>
        p.gearType
          ? `${gearTypeLabels[p.gearType] || p.gearType}${
              p.numberOfGears ? ` · ${p.numberOfGears}-speed` : ''
            }`
          : null,
    },
    {
      label: 'Battery',
      section: 'Battery and range',
      get: (p) => (p.batteryWh ? `${p.batteryWh}Wh` : null),
      raw: (p) => p.batteryWh ?? null,
      bestBy: 'max',
    },
    {
      label: 'Stated range',
      section: 'Battery and range',
      get: (p) => (p.statedRangeMi ? `${p.statedRangeMi} mi` : null),
      raw: (p) => p.statedRangeMi ?? null,
      bestBy: 'max',
    },
    {
      label: 'Frame weight',
      section: 'Weight',
      get: (p) => (p.weightLbs != null ? `${p.weightLbs} lbs` : null),
      raw: (p) => p.weightLbs ?? null,
      bestBy: 'min',
    },
  ]

  const sectionMap = new Map<string, CompareRow[]>()

  for (const col of cols) {
    const values = products.map((p) => col.get(p))
    if (values.every((v) => v == null)) continue
    // Skip rows where all values are identical (shared specs)
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

    if (!sectionMap.has(col.section)) sectionMap.set(col.section, [])
    sectionMap.get(col.section)!.push({ label: col.label, values, bestIndex })
  }

  const sections: CompareSection[] = []
  for (const [title, rows] of sectionMap) {
    if (rows.length > 0) sections.push({ title, rows })
  }
  return sections
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
  const ourPickIndex = ourPick ? sorted.findIndex((p) => p.id === ourPick.id) : -1
  const shared = findSharedSpecs(products)
  const compareSections = buildCompareSections(sorted)

  // Resolve family metadata override if defined for this family slug
  const familyMeta = FAMILY_METADATA[decodedFamily] || null

  // Find the best "family hero" image from the cheapest (base) product
  const familyHeroProduct = sorted[0]
  const familyHeroImage =
    familyHeroProduct.images && familyHeroProduct.images.length > 0
      ? familyHeroProduct.images[0]
      : null

  // Family-level subtitle + Take: prefer explicit override, fall back to base variant's
  const familySubtitle = familyMeta?.subtitle || familyHeroProduct.subtitle
  const familyTakeOverride = familyMeta?.take || null
  const familyTakeRich = !familyTakeOverride ? familyHeroProduct.carryishTake || null : null

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
        {(familyTakeOverride || familyTakeRich) && (
          <div className="mt-4 max-w-3xl">
            <div className="bg-white border-l-[3px] border-[#E85D3A] px-6 py-5">
              <h2 className="font-[family-name:var(--font-fraunces)] text-sm font-medium text-[#E85D3A] mb-2">
                The Carryish Take on the {modelFamily}
              </h2>
              {familyTakeOverride ? (
                <p className="text-[#1A1A2E] text-sm leading-[1.7]">{familyTakeOverride}</p>
              ) : familyTakeRich ? (
                <div className="text-[#1A1A2E] text-sm leading-[1.7]">
                  <RichText data={familyTakeRich} enableGutter={false} />
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* ─── Decision helper ─── */}
        {products.length > 1 && familyMeta?.decisionHelper && (
          <div className="mt-8 max-w-3xl bg-[#FEF0EC] rounded-[10px] px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#E85D3A] flex items-center justify-center text-white text-base font-medium shrink-0">
              ?
            </div>
            <div className="flex-1">
              <p className="text-sm leading-[1.5] text-[#1A1A2E]">
                <strong className="font-semibold">{familyMeta.decisionHelper.title}</strong>{' '}
                <span className="text-[#1A1A2E]/85">{familyMeta.decisionHelper.body}</span>
              </p>
              <Link
                href="/chat"
                className="mt-2 inline-block text-sm font-medium text-[#E85D3A] hover:underline"
              >
                Ask our matchmaker →
              </Link>
            </div>
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
              const tags = variantCardTags(p)
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
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {tags.map((tag, i) => (
                          <span
                            key={i}
                            className={`text-[11px] px-2 py-0.5 rounded ${
                              tag.highlight
                                ? 'bg-[#EAF3DE] text-[#3B6D11]'
                                : 'bg-[#E8E8EC] text-[#7A7A8C]'
                            }`}
                          >
                            {tag.label}
                          </span>
                        ))}
                      </div>
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
        {compareSections.length > 0 && sorted.length > 1 && (
          <div className="mt-20">
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E] mb-6">
              Compare variants
            </h2>
            <div className="overflow-x-auto rounded-[12px] border border-[#E8E8EC] bg-white">
              <table className="min-w-full text-[13px] border-collapse">
                <thead>
                  <tr className="border-b border-[#E8E8EC]">
                    <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider text-[#7A7A8C] font-semibold w-[140px]">
                      Spec
                    </th>
                    {sorted.map((p, i) => {
                      const isOurPick = ourPickIndex === i
                      return (
                        <th
                          key={p.id}
                          className={`text-left px-3 py-2 text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap ${
                            isOurPick ? 'bg-[#FEF0EC] text-[#E85D3A]' : 'text-[#1A1A2E]'
                          }`}
                        >
                          <Link
                            href={`/bikes/${p.slug}`}
                            className={`no-underline ${
                              isOurPick ? 'text-[#E85D3A]' : 'text-[#1A1A2E]'
                            } hover:text-[#E85D3A]`}
                          >
                            {p.name.replace(`${brand?.name || ''} `, '').replace(`${modelFamily} `, '') || p.name}
                          </Link>
                          {isOurPick && (
                            <span className="block text-[9px] font-medium text-[#E85D3A] mt-0.5 normal-case tracking-normal">
                              Our pick
                            </span>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {compareSections.map((section) => (
                    <React.Fragment key={section.title}>
                      <tr>
                        <td
                          colSpan={sorted.length + 1}
                          className="bg-[#E8E8EC] px-3 py-1.5 text-[11px] uppercase tracking-wider text-[#7A7A8C] font-semibold"
                        >
                          {section.title}
                        </td>
                      </tr>
                      {section.rows.map((row) => (
                        <tr key={row.label} className="border-b border-[#E8E8EC] last:border-b-0">
                          <td className="px-3 py-2 text-[#7A7A8C]">{row.label}</td>
                          {row.values.map((v, i) => {
                            const isBest = row.bestIndex === i
                            const isOurPick = ourPickIndex === i
                            return (
                              <td
                                key={i}
                                className={`px-3 py-2 ${isOurPick ? 'bg-[#FEF0EC]' : ''} ${
                                  isBest
                                    ? 'text-[#E85D3A] font-medium'
                                    : 'text-[#1A1A2E]'
                                }`}
                              >
                                {v || '—'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {shared.length > 0 && (
                    <React.Fragment>
                      <tr>
                        <td
                          colSpan={sorted.length + 1}
                          className="bg-[#E8E8EC] px-3 py-1.5 text-[11px] uppercase tracking-wider text-[#7A7A8C] font-semibold"
                        >
                          Shared across all models
                        </td>
                      </tr>
                      {shared.map((row) => (
                        <tr key={row.label} className="border-b border-[#E8E8EC] last:border-b-0">
                          <td className="px-3 py-2 text-[#7A7A8C]">{row.label}</td>
                          <td
                            colSpan={sorted.length}
                            className="px-3 py-2 text-center text-[#7A7A8C]"
                          >
                            {row.value}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-[#7A7A8C]">
              Values in <span className="text-[#E85D3A] font-medium">coral</span> are the best in the lineup for that row.
            </p>
          </div>
        )}

        {/* ─── Shared features ─── */}
        {familyMeta?.sharedFeatures && familyMeta.sharedFeatures.length > 0 && (
          <div className="mt-20 max-w-3xl">
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E] mb-6">
              What every {modelFamily} shares
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {familyMeta.sharedFeatures.map((f, i) => (
                <div
                  key={i}
                  className="flex gap-3 p-3 bg-white rounded-lg border border-[#E8E8EC]"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#E8E8EC] flex items-center justify-center shrink-0 text-xs font-semibold text-[#7A7A8C]">
                    {f.icon}
                  </div>
                  <div className="text-xs leading-[1.4] text-[#7A7A8C]">
                    <strong className="block text-[#1A1A2E] font-medium mb-0.5">
                      {f.title}
                    </strong>
                    {f.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Shared certifications ─── */}
        {sharedCerts.length > 0 && (
          <div className="mt-12 max-w-3xl">
            <div className="flex flex-wrap gap-2">
              {sharedCerts.map((cert, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-1.5 bg-white border border-[#E8E8EC] rounded-md px-3 py-1 text-xs text-[#7A7A8C]"
                  title={cert.description || undefined}
                >
                  <span className="text-green-600 text-sm leading-none">✓</span>
                  <span>{cert.name}</span>
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

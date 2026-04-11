import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Media } from '@/components/Media'
import {
  ProductGallery,
  type GalleryColorOption,
  type GalleryDetailItem,
  type GalleryLifestyleItem,
} from '@/components/ProductGallery'
import RichText from '@/components/RichText'
import type { Product, Media as MediaType, ReviewSource, ProductVideo } from '@/payload-types'

const categoryLabels: Record<string, string> = {
  'cargo-bike': 'Cargo Bike',
  stroller: 'Stroller',
  trailer: 'Trailer',
  wagon: 'Wagon',
  accessory: 'Accessory',
}

const motorPositionLabels: Record<string, string> = {
  'mid-drive': 'Mid-drive',
  'hub-rear': 'Hub (rear)',
  'hub-front': 'Hub (front)',
}

const throttleLabels: Record<string, string> = {
  none: 'None',
  thumb: 'Thumb throttle',
  twist: 'Twist throttle',
  'pedal-activated': 'Pedal-activated',
}

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

const brakeTypeLabels: Record<string, string> = {
  'hydraulic-disc': 'Hydraulic disc',
  'mechanical-disc': 'Mechanical disc',
  rim: 'Rim',
}

const suspensionLabels: Record<string, string> = {
  rigid: 'Rigid',
  front: 'Front suspension',
  full: 'Full suspension',
  seatpost: 'Seatpost suspension',
}

const bikeClassLabels: Record<string, string> = {
  'class-1': 'Class 1 (20 mph, no throttle)',
  'class-2': 'Class 2 (20 mph, throttle)',
  'class-3': 'Class 3 (28 mph)',
}

/** Pick similar bikes by subcategory + price proximity, respecting powerType */
function pickSimilar(
  pool: Product[],
  cargoLayout: string | null | undefined,
  currentPrice: number,
  isElectric: boolean,
  count: number,
): Product[] {
  if (pool.length === 0 || count <= 0) return []

  // Score each candidate
  const scored = pool.map((p) => {
    let score = 0
    const pIsElectric = !!(p.motorBrand || p.motorPosition || p.batteryWh)

    // Same subcategory is the strongest signal
    if (cargoLayout && p.cargoLayout === cargoLayout) score += 100

    // Adjacent subcategories get partial credit
    const adjacent: Record<string, string[]> = {
      longtail: ['midtail'],
      midtail: ['longtail', 'compact'],
      compact: ['midtail'],
      'front-box': [],
      trike: [],
    }
    if (cargoLayout && adjacent[cargoLayout]?.includes(p.cargoLayout || '')) score += 50

    // Price proximity (within ±40% is ideal)
    if (currentPrice > 0 && p.price) {
      const ratio = p.price / currentPrice
      if (ratio >= 0.6 && ratio <= 1.4) score += 30
      else if (ratio >= 0.4 && ratio <= 1.6) score += 10
    }

    // Matching electric/non-electric
    if (pIsElectric === isElectric) score += 20

    return { product: p, score }
  })

  // Sort by score desc, then price proximity
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // Tiebreak: closest in price
    const aDiff = Math.abs((a.product.price || 0) - currentPrice)
    const bDiff = Math.abs((b.product.price || 0) - currentPrice)
    return aDiff - bDiff
  })

  return scored.slice(0, count).map((s) => s.product)
}

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const products = await payload.find({
    collection: 'products',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: { slug: true },
  })
  return products.docs.map(({ slug }) => ({ slug }))
}

type Args = {
  params: Promise<{ slug?: string }>
}

export default async function ProductPage({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const product = await queryProductBySlug({ slug: decodedSlug })

  if (!product) notFound()

  const brand = product.brand && typeof product.brand === 'object' ? product.brand : null
  const payload = await getPayload({ config: configPromise })

  // Resolve competitor IDs if available
  const competitorIds: number[] = []
  if (product.directCompetitors && product.directCompetitors.length > 0) {
    for (const c of product.directCompetitors) {
      competitorIds.push(typeof c === 'object' ? c.id : c)
    }
  }
  if (product.cheaperAlternative) {
    const id = typeof product.cheaperAlternative === 'object' ? product.cheaperAlternative.id : product.cheaperAlternative
    if (id && !competitorIds.includes(id)) competitorIds.push(id)
  }
  if (product.premiumAlternative) {
    const id = typeof product.premiumAlternative === 'object' ? product.premiumAlternative.id : product.premiumAlternative
    if (id && !competitorIds.includes(id)) competitorIds.push(id)
  }

  // Fetch review sources, videos, and candidate similar bikes in parallel
  const [reviewSources, videos, candidatePool] = await Promise.all([
    payload.find({
      collection: 'review-sources',
      depth: 0,
      limit: 20,
      where: { product: { equals: product.id } },
      sort: '-rating',
    }),
    payload.find({
      collection: 'product-videos',
      depth: 0,
      limit: 10,
      where: { product: { equals: product.id } },
    }),
    // Fetch a broad pool of published products to pick the best alternatives from
    payload.find({
      collection: 'products',
      depth: 1,
      limit: 50,
      where: {
        _status: { equals: 'published' },
        slug: { not_equals: product.slug },
        category: { equals: product.category },
      },
    }),
  ])

  // Build smart similar bikes list:
  // 1. Use explicit directCompetitors if set
  // 2. Otherwise match by subcategory + price proximity, respecting powerType
  const isElectric = !!(product.motorBrand || product.motorPosition || product.batteryWh)
  const currentPrice = product.price || 0

  let similarDocs = (() => {
    // If explicit competitors are set, use those first
    if (competitorIds.length > 0) {
      const explicit = candidatePool.docs.filter((p) => competitorIds.includes(p.id))
      if (explicit.length >= 3) return explicit.slice(0, 4)
      // Supplement with auto-matched if not enough explicit competitors
      const remaining = candidatePool.docs.filter((p) => !competitorIds.includes(p.id))
      return [...explicit, ...pickSimilar(remaining, product.cargoLayout, currentPrice, isElectric, 4 - explicit.length)]
    }

    return pickSimilar(candidatePool.docs, product.cargoLayout, currentPrice, isElectric, 4)
  })()

  const similar = { docs: similarDocs }

  const affiliateUrlWithUtm = product.affiliateUrl
    ? `${product.affiliateUrl}${product.affiliateUrl.includes('?') ? '&' : '?'}utm_source=carryish&utm_medium=referral&utm_campaign=product-page`
    : '#'

  const scores = [
    { label: 'Overall', value: product.overallScore, color: '#E85D3A' },
    { label: 'Hills', value: product.hillScore, color: '#3A8FE8' },
    { label: 'Cargo', value: product.cargoScore, color: '#3A8FE8' },
    { label: 'Range', value: product.rangeScore, color: '#3A8FE8' },
    { label: 'Value', value: product.valueScore, color: '#3A8FE8' },
    { label: 'Family', value: product.familyScore, color: '#3A8FE8' },
  ].filter((s) => s.value != null)

  const hasScores = scores.length > 0

  // Build spec sections
  const motorSpecs = buildSpecs([
    ['Motor', product.motorBrand ? `${product.motorBrand}${product.motorPosition ? ` (${motorPositionLabels[product.motorPosition]})` : ''}` : null],
    ['Power', product.motorNominalWatts ? `${product.motorNominalWatts}W nominal${product.motorPeakWatts ? ` / ${product.motorPeakWatts}W peak` : ''}` : null],
    ['Torque', product.motorTorqueNm ? `${product.motorTorqueNm} Nm` : null],
    ['Assist levels', product.pedalAssistLevels],
    ['Throttle', product.throttle ? throttleLabels[product.throttle] : null],
    ['Top speed', product.topSpeedMph ? `${product.topSpeedMph} mph` : null],
    ['Class', product.bikeClass ? bikeClassLabels[product.bikeClass] : null],
  ])

  const batterySpecs = buildSpecs([
    ['Battery', product.batteryBrand ? `${product.batteryBrand} ${product.batteryWh ? `${product.batteryWh}Wh` : ''}` : (product.batteryWh ? `${product.batteryWh}Wh` : null)],
    ['Voltage', product.batteryVolts ? `${product.batteryVolts}V` : null],
    ['Removable', product.batteryRemovable != null ? (product.batteryRemovable ? 'Yes' : 'No') : null],
    ['Dual battery', product.dualBatteryCapable ? `Yes${product.dualBatteryWh ? ` (${product.dualBatteryWh}Wh total)` : ''}` : null],
    ['Stated range', product.statedRangeMi ? `${product.statedRangeMi} mi` : null],
    ['Real-world range', product.estimatedRealRangeMi ? `~${product.estimatedRealRangeMi} mi (loaded)` : null],
    ['Charge time', product.chargeTimeHours ? `${product.chargeTimeHours} hrs` : null],
  ])

  const dimensionSpecs = buildSpecs([
    ['Weight', product.weightLbs ? `${product.weightLbs} lbs` : null],
    ['Max system weight', product.maxSystemWeightLbs ? `${product.maxSystemWeightLbs} lbs` : null],
    ['Cargo capacity', product.cargoCapacityLbs ? `${product.cargoCapacityLbs} lbs` : null],
    ['Length', product.lengthInches ? `${product.lengthInches}"` : null],
    ['Wheelbase', product.wheelbaseInches ? `${product.wheelbaseInches}"` : null],
    ['Rider height', product.riderHeightMin && product.riderHeightMax ? `${product.riderHeightMin} – ${product.riderHeightMax}` : null],
    ['Foldable', product.foldable ? 'Yes' : null],
    ['Fits in elevator', product.fitsInElevator ? 'Yes' : null],
  ])

  const drivetrainSpecs = buildSpecs([
    ['Drivetrain', product.drivetrainType ? `${drivetrainLabels[product.drivetrainType]}${product.drivetrainBrand ? ` — ${product.drivetrainBrand}` : ''}` : null],
    ['Gearing', product.gearType ? `${gearTypeLabels[product.gearType]}${product.numberOfGears ? ` (${product.numberOfGears}-speed)` : ''}` : null],
    ['Brakes', product.brakeType ? `${brakeTypeLabels[product.brakeType]}${product.brakeBrand ? ` — ${product.brakeBrand}` : ''}` : null],
    ['Rotor size', product.brakeRotorSizeMm ? `${product.brakeRotorSizeMm}mm` : null],
  ])

  const wheelSpecs = buildSpecs([
    ['Front wheel', product.frontWheelSize],
    ['Rear wheel', product.rearWheelSize],
    ['Tire width', product.tireWidthInches ? `${product.tireWidthInches}"` : null],
    ['Tires', product.tireBrand],
    ['Puncture protection', product.punctureProtection ? 'Yes' : null],
    ['Suspension', product.suspensionType ? suspensionLabels[product.suspensionType] : null],
  ])

  const cargoFamilySpecs = buildSpecs([
    ['Layout', product.cargoLayout ? cargoLayoutLabels[product.cargoLayout] : null],
    ['Max child passengers', product.maxChildPassengers],
    ['Child seat compatibility', product.childSeatCompatibility],
    ['Integrated child seats', product.hasIntegratedChildSeats ? 'Yes' : null],
    ['Seatbelts', product.hasSeatbelts ? 'Yes' : null],
    ['Footboards', product.hasFootboards ? 'Yes' : null],
    ['Wheel guards', product.hasWheelGuards ? 'Yes' : null],
    ['Rain cover', product.hasRainCover ? 'Included' : product.rainCoverAvailable ? 'Available separately' : null],
    ['Racks', [product.frontRack && 'Front', product.rearRack && 'Rear'].filter(Boolean).join(' + ') || null],
    ['Rack system', product.rackSystem],
  ])

  const safetySpecs = buildSpecs([
    ['Integrated lights', product.integratedLights ? 'Yes' : null],
    ['Turn signals', product.turnSignals ? 'Yes' : null],
    ['ABS', product.absAvailable ? 'Yes' : null],
    ['GPS tracking', product.gpsTracking ? 'Yes' : null],
    ['Alarm', product.alarm ? 'Yes' : null],
    ['Locking kickstand', product.lockingKickstand ? 'Yes' : null],
  ])

  const extraSpecs = buildSpecs([
    ['Display', product.display],
    ['Kickstand', product.kickstandType ? product.kickstandType.replace('-', ' ') : null],
    ['Fenders', product.fenders ? 'Included' : null],
    ['Included accessories', product.includedAccessories],
  ])

  // Map component detail images to the spec section they illustrate
  const componentToSection: Record<string, string> = {
    motor: 'Motor & Power',
    battery: 'Battery & Range',
    display: 'Motor & Power',
    brakes: 'Drivetrain & Brakes',
    drivetrain: 'Drivetrain & Brakes',
    suspension: 'Wheels & Comfort',
    wheels: 'Wheels & Comfort',
    rack: 'Cargo & Family',
    'child-seat': 'Cargo & Family',
    kickstand: 'Extras',
    lights: 'Safety & Security',
    lock: 'Safety & Security',
    fold: 'Size & Weight',
    cockpit: 'Extras',
    seat: 'Extras',
    other: 'Extras',
  }

  type ComponentDetail = { image: MediaType; caption?: string | null; component?: string | null }
  const componentDetails = (product.gallery?.componentDetails || []).filter(
    (entry): entry is ComponentDetail & { id?: string | null } =>
      typeof entry.image === 'object' && entry.image !== null,
  )

  const detailsBySection: Record<string, ComponentDetail[]> = {}
  for (const d of componentDetails) {
    const section = d.component ? componentToSection[d.component] : undefined
    if (!section) continue
    if (!detailsBySection[section]) detailsBySection[section] = []
    detailsBySection[section].push(d)
  }

  const specSections = [
    { title: 'Motor & Power', specs: motorSpecs },
    { title: 'Battery & Range', specs: batterySpecs },
    { title: 'Size & Weight', specs: dimensionSpecs },
    { title: 'Drivetrain & Brakes', specs: drivetrainSpecs },
    { title: 'Wheels & Comfort', specs: wheelSpecs },
    { title: 'Cargo & Family', specs: cargoFamilySpecs },
    { title: 'Safety & Security', specs: safetySpecs },
    { title: 'Extras', specs: extraSpecs },
  ].filter((s) => s.specs.length > 0)

  // Aggregate review rating
  const ratedReviews = reviewSources.docs.filter((r) => r.rating != null)
  const avgRating = ratedReviews.length > 0
    ? (ratedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / ratedReviews.length).toFixed(1)
    : null

  const featuredVideos = videos.docs.filter((v) => v.featured)
  const otherVideos = videos.docs.filter((v) => !v.featured)

  const displayPrice = product.currentBestPrice || product.streetPriceUsd || product.price
  const hasMultiplePrices = product.price && product.streetPriceUsd && product.streetPriceUsd < product.price

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.oneLiner || `${product.name} - ${categoryLabels[product.category || ''] || 'Cargo Bike'}`,
    brand: brand ? { '@type': 'Brand', name: brand.name } : undefined,
    ...(product.overallScore ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.overallScore,
        bestRating: 10,
        ratingCount: ratedReviews.length || 1,
      },
    } : {}),
    offers: product.price
      ? {
          '@type': 'Offer',
          price: displayPrice,
          priceCurrency: 'USD',
          url: affiliateUrlWithUtm,
          availability: 'https://schema.org/InStock',
        }
      : undefined,
  }

  return (
    <article className="bg-[#FAFAF8] min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container py-20 sm:py-24">
        {/* Breadcrumbs */}
        <nav className="mb-8 text-sm text-[#7A7A8C]">
          <Link href="/" className="hover:text-[#1A1A2E] no-underline transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/bikes" className="hover:text-[#1A1A2E] no-underline transition-colors">Bikes</Link>
          {product.modelFamily && brand && (
            <>
              <span className="mx-2">/</span>
              <Link
                href={`/bikes/models/${brand.slug}-${product.modelFamily.toLowerCase().replace(/\s+/g, '-')}`}
                className="hover:text-[#1A1A2E] no-underline transition-colors"
              >
                {brand.name} {product.modelFamily}
              </Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-[#1A1A2E]">{product.name}</span>
        </nav>

        {/* ─── Hero ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Images */}
          <div>
            <ProductGallery
              images={
                (product.images?.filter((img): img is MediaType => typeof img === 'object' && img !== null) || [])
              }
              details={
                (product.gallery?.componentDetails || [])
                  .filter(
                    (entry): entry is GalleryDetailItem & { id?: string | null } =>
                      typeof entry.image === 'object' && entry.image !== null,
                  )
                  .map((entry) => ({
                    image: entry.image as MediaType,
                    caption: entry.caption,
                    component: entry.component,
                  }))
              }
              lifestyle={
                (product.gallery?.lifestyleImages || [])
                  .filter(
                    (entry): entry is GalleryLifestyleItem & { id?: string | null } =>
                      typeof entry.image === 'object' && entry.image !== null,
                  )
                  .map((entry) => ({
                    image: entry.image as MediaType,
                    caption: entry.caption,
                    context: entry.context,
                  }))
              }
              colorOptions={
                (product.colorOptions || []).map((c): GalleryColorOption => ({
                  colorName: c.colorName,
                  colorHex: c.colorHex,
                  heroImage: typeof c.heroImage === 'object' ? (c.heroImage as MediaType) : null,
                  angleImage: typeof c.angleImage === 'object' ? (c.angleImage as MediaType) : null,
                }))
              }
              brandName={brand?.name || undefined}
              productName={product.name}
            />
          </div>

          {/* Details sidebar */}
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              {product.category && (
                <span className="text-xs uppercase tracking-wider text-[#7A7A8C] font-medium">
                  {categoryLabels[product.category] || product.category}
                </span>
              )}
              {product.generation && (
                <span className="text-xs font-medium bg-[#1A1A2E]/5 text-[#1A1A2E] px-2.5 py-1 rounded-md">
                  {product.generation}
                </span>
              )}
              {product.testingStatus === 'tested' && (
                <span className="text-xs font-semibold bg-[#E85D3A]/10 text-[#E85D3A] px-2.5 py-1 rounded-md">
                  Tested by Carryish
                </span>
              )}
              {product.powerType === 'non-electric' && (
                <span className="text-xs font-medium bg-[#E8E8EC] text-[#7A7A8C] px-2.5 py-1 rounded-md">
                  Non-electric
                </span>
              )}
              {product.currentlyAvailable === false && (
                <span className="text-xs font-semibold bg-red-50 text-red-700 px-2.5 py-1 rounded-md">
                  Discontinued
                </span>
              )}
            </div>

            <h1 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl font-semibold text-[#1A1A2E] mt-3 tracking-tight">
              {product.name}
            </h1>

            {product.subtitle && (
              <p className="font-[family-name:var(--font-fraunces)] text-lg text-[#1A1A2E]/70 mt-2 leading-snug">
                {product.subtitle}
              </p>
            )}

            {product.tagline && (
              <p className="text-base text-[#7A7A8C] mt-1.5 italic">{product.tagline}</p>
            )}

            {brand && (
              <p className="text-[#7A7A8C] mt-2 text-base">
                by{' '}
                <Link
                  href={`/brands/${brand.slug}`}
                  className="text-[#3A8FE8] hover:text-[#2D72BA] no-underline"
                >
                  {brand.name}
                </Link>
              </p>
            )}

            {/* Best-for tags */}
            {product.bestFor && product.bestFor.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-5">
                {product.bestFor.map((item, i) => (
                  <span
                    key={i}
                    className="text-xs font-medium bg-[#1A1A2E]/5 text-[#1A1A2E] px-3 py-1.5 rounded-full"
                  >
                    {item.tag}
                  </span>
                ))}
              </div>
            )}

            {/* Not-for tags */}
            {product.notFor && product.notFor.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {product.notFor.map((item, i) => (
                  <span
                    key={i}
                    className="text-xs font-medium bg-red-50 text-red-600/80 px-3 py-1.5 rounded-full"
                  >
                    Not for: {item.text}
                  </span>
                ))}
              </div>
            )}

            {/* Price */}
            <div className="mt-6">
              {hasMultiplePrices ? (
                <div className="flex items-baseline gap-3">
                  <p className="text-2xl font-semibold text-[#1A1A2E]">
                    ${(product.streetPriceUsd!).toLocaleString()}
                  </p>
                  <p className="text-lg text-[#7A7A8C] line-through">
                    ${product.price!.toLocaleString()}
                  </p>
                </div>
              ) : product.price != null ? (
                <p className="text-2xl font-semibold text-[#1A1A2E]">
                  ${product.price.toLocaleString()}
                  {product.msrpTo && product.msrpTo > product.price && (
                    <span> &ndash; ${product.msrpTo.toLocaleString()}</span>
                  )}
                </p>
              ) : null}
              {product.priceNote && (
                <p className="text-xs text-[#7A7A8C] mt-1">{product.priceNote}</p>
              )}
              {product.onSale && (
                <span className="inline-block mt-1 text-xs font-semibold text-[#E85D3A]">On sale</span>
              )}
            </div>

            <a
              href={affiliateUrlWithUtm}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-6 px-8 py-3.5 bg-[#E85D3A] text-white rounded-lg font-medium hover:bg-[#d14e2d] transition-colors no-underline"
            >
              Check Price
            </a>
            <p className="mt-3 text-xs text-[#7A7A8C]">
              If you buy through our links, we earn a small commission. It doesn&apos;t change what we recommend.
            </p>

            {/* Quick specs */}
            <div className="mt-8 pt-6 border-t border-[#7A7A8C]/10">
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                {product.weightLbs && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-[#7A7A8C] font-medium">Weight</dt>
                    <dd className="text-[#1A1A2E] font-medium mt-0.5">{product.weightLbs} lbs</dd>
                  </div>
                )}
                {product.maxSystemWeightLbs && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-[#7A7A8C] font-medium">Max load</dt>
                    <dd className="text-[#1A1A2E] font-medium mt-0.5">{product.maxSystemWeightLbs} lbs</dd>
                  </div>
                )}
                {product.motorTorqueNm && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-[#7A7A8C] font-medium">Torque</dt>
                    <dd className="text-[#1A1A2E] font-medium mt-0.5">{product.motorTorqueNm} Nm</dd>
                  </div>
                )}
                {product.estimatedRealRangeMi && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-[#7A7A8C] font-medium">Range (real)</dt>
                    <dd className="text-[#1A1A2E] font-medium mt-0.5">~{product.estimatedRealRangeMi} mi</dd>
                  </div>
                )}
                {product.batteryWh && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-[#7A7A8C] font-medium">Battery</dt>
                    <dd className="text-[#1A1A2E] font-medium mt-0.5">{product.batteryWh}Wh</dd>
                  </div>
                )}
                {product.maxChildPassengers != null && product.maxChildPassengers > 0 && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-[#7A7A8C] font-medium">Kids</dt>
                    <dd className="text-[#1A1A2E] font-medium mt-0.5">Up to {product.maxChildPassengers}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Warranty & availability */}
            <div className="mt-6 flex flex-wrap gap-4 text-xs text-[#7A7A8C]">
              {product.warrantyYears && (
                <span>{product.warrantyYears}-year warranty</span>
              )}
              {product.availableIn && (
                <span>Available: {product.availableIn}</span>
              )}
              {product.salesModel && (
                <span className="capitalize">{product.salesModel.replace(/-/g, ' ')}</span>
              )}
            </div>
          </div>
        </div>

        {/* ─── Variant comparison strip ─── */}
        {product.variants && product.variants.length > 0 && (() => {
          const variantDocs = product.variants.filter(
            (v): v is Product => typeof v === 'object' && v !== null,
          )
          if (variantDocs.length === 0) return null

          return (
            <div className="mt-16 pt-10 border-t border-[#7A7A8C]/10">
              <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
                <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E]">
                  Other {product.modelFamily || 'variants'} in the lineup
                </h2>
                <p className="text-sm text-[#7A7A8C]">
                  Same bones. Different trims, gearing, and price points.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Current product card */}
                <div className="relative bg-[#FAFAF8] border-2 border-[#E85D3A] rounded-[10px] overflow-hidden">
                  <span className="absolute top-2 left-2 z-10 bg-[#E85D3A] text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded">
                    You are here
                  </span>
                  <div className="relative aspect-[4/3] w-full bg-[#FAFAF8]">
                    {product.images && product.images.length > 0 && typeof product.images[0] === 'object' ? (
                      <Media resource={product.images[0]} imgClassName="object-contain w-full h-full" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[#1A1A2E]/40 text-xs">
                        {product.name}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-[family-name:var(--font-fraunces)] text-base font-semibold text-[#1A1A2E] leading-tight">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      {product.price != null ? (
                        <span className="text-sm font-semibold text-[#1A1A2E]">
                          ${product.price.toLocaleString()}
                        </span>
                      ) : (
                        <span />
                      )}
                      {product.overallScore != null && (
                        <span className="text-xs font-bold bg-[#1A1A2E] text-white px-1.5 py-0.5 rounded">
                          {product.overallScore}/10
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {variantDocs.map((v) => {
                  const vImage = v.images && v.images.length > 0 ? v.images[0] : null
                  return (
                    <Link
                      key={v.id}
                      href={`/bikes/${v.slug}`}
                      className="group block bg-[#FAFAF8] border border-[#7A7A8C]/15 rounded-[10px] overflow-hidden hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 no-underline"
                    >
                      <div className="relative aspect-[4/3] w-full bg-[#FAFAF8]">
                        {vImage && typeof vImage === 'object' ? (
                          <Media resource={vImage} imgClassName="object-contain w-full h-full" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[#1A1A2E]/40 text-xs px-2 text-center">
                            {v.name}
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-[family-name:var(--font-fraunces)] text-base font-semibold text-[#1A1A2E] group-hover:text-[#E85D3A] transition-colors leading-tight">
                          {v.name}
                        </h3>
                        <div className="flex items-center justify-between mt-2">
                          {v.price != null ? (
                            <span className="text-sm font-semibold text-[#1A1A2E]">
                              ${v.price.toLocaleString()}
                            </span>
                          ) : (
                            <span />
                          )}
                          {v.overallScore != null && (
                            <span className="text-xs font-bold bg-[#1A1A2E]/80 text-white px-1.5 py-0.5 rounded">
                              {v.overallScore}/10
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* ─── Carryish Scores ─── */}
        {hasScores && (
          <div className="mt-20 max-w-3xl" id="scores">
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E] mb-6">
              Carryish Scores
            </h2>
            <div className="space-y-4">
              {scores.map((score) => (
                <div key={score.label} className="flex items-center gap-4">
                  <span className="text-sm text-[#7A7A8C] w-16 shrink-0">{score.label}</span>
                  <div className="flex-1 h-3 bg-[#1A1A2E]/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(score.value! / 10) * 100}%`,
                        backgroundColor: score.color,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-[#1A1A2E] w-8 text-right">
                    {score.value}/10
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Carryish Take ─── */}
        {product.carryishTake && (
          <div className="mt-20 max-w-3xl">
            <div className="bg-[#FAFAF8] border-l-[3px] border-[#E85D3A] pl-8 py-6">
              <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-[#E85D3A] mb-4">
                The Carryish Take
              </h2>
              <div className="text-[#1A1A2E] text-[1.05rem] leading-[1.7]">
                <RichText data={product.carryishTake} enableGutter={false} />
              </div>
            </div>
          </div>
        )}

        {/* ─── In the wild (dedicated lifestyle section) ─── */}
        {(() => {
          const lifestyleDocs = (product.gallery?.lifestyleImages || []).filter(
            (entry): entry is { image: MediaType; caption?: string | null; context?: string | null; id?: string | null } =>
              typeof entry.image === 'object' && entry.image !== null,
          )
          if (lifestyleDocs.length === 0) return null
          return (
            <div className="mt-20" id="in-the-wild">
              <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
                <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E]">
                  In the wild
                </h2>
                <p className="text-sm text-[#7A7A8C]">
                  How it actually gets used.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {lifestyleDocs.slice(0, 6).map((entry, i) => (
                  <figure
                    key={i}
                    className="relative overflow-hidden rounded-[10px] bg-[#E8E8EC] aspect-[4/3]"
                  >
                    <Media resource={entry.image} imgClassName="object-cover w-full h-full" />
                    {entry.caption && (
                      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1A1A2E]/80 to-transparent p-4 text-xs text-white font-medium">
                        {entry.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </div>
          )
        })()}

        {/* ─── Verdict ─── */}
        {product.verdict && (
          <div className="mt-10 max-w-3xl">
            <div className="bg-[#1A1A2E] rounded-lg px-8 py-5">
              <p className="text-white text-base font-medium">
                <span className="text-[#E85D3A] font-semibold">Bottom line:</span>{' '}
                {product.verdict}
              </p>
            </div>
          </div>
        )}

        {/* ─── Pros & Cons ─── */}
        {((product.pros && product.pros.length > 0) || (product.cons && product.cons.length > 0)) && (
          <div className="mt-16 max-w-3xl" id="pros-cons">
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E] mb-6">
              Pros & Cons
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {product.pros && product.pros.length > 0 && (
                <div>
                  <h3 className="text-sm uppercase tracking-wider text-green-700 font-semibold mb-3">What we like</h3>
                  <ul className="space-y-2">
                    {product.pros.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[#1A1A2E]">
                        <span className="text-green-600 mt-0.5 shrink-0">+</span>
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {product.cons && product.cons.length > 0 && (
                <div>
                  <h3 className="text-sm uppercase tracking-wider text-red-700 font-semibold mb-3">Watch out for</h3>
                  <ul className="space-y-2">
                    {product.cons.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[#1A1A2E]">
                        <span className="text-red-500 mt-0.5 shrink-0">&ndash;</span>
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Spec Sections ─── */}
        {specSections.length > 0 && (
          <div className="mt-20" id="specs">
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E] mb-8">
              Full Specifications
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              {specSections.map((section) => {
                const details = detailsBySection[section.title] || []
                return (
                  <div key={section.title}>
                    <h3 className="text-sm uppercase tracking-wider text-[#7A7A8C] font-semibold mb-4 pb-2 border-b border-[#7A7A8C]/10">
                      {section.title}
                    </h3>
                    {details.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {details.slice(0, 2).map((d, i) => (
                          <figure
                            key={i}
                            className="relative aspect-square rounded-[8px] overflow-hidden bg-[#E8E8EC]"
                          >
                            <Media resource={d.image} imgClassName="object-cover w-full h-full" />
                            {d.caption && (
                              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1A1A2E]/80 to-transparent p-2 text-[10px] text-white font-medium leading-tight">
                                {d.caption}
                              </figcaption>
                            )}
                          </figure>
                        ))}
                      </div>
                    )}
                    <dl className="space-y-3">
                      {section.specs.map((spec) => (
                        <div key={spec.label} className="flex justify-between gap-4">
                          <dt className="text-sm text-[#7A7A8C]">{spec.label}</dt>
                          <dd className="text-sm font-medium text-[#1A1A2E] text-right">{spec.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── Safety Certifications ─── */}
        {product.certifications && product.certifications.length > 0 && (
          <div className="mt-20 max-w-3xl" id="certifications">
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E] mb-6">
              Safety certifications
            </h2>
            <div className="flex flex-wrap gap-3">
              {product.certifications.map((cert, i) => (
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

        {/* ─── Key Accessories ─── */}
        {product.keyAccessories && product.keyAccessories.length > 0 && (
          <div className="mt-20" id="accessories">
            <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
              <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E]">
                Key accessories
              </h2>
              <p className="text-sm text-[#7A7A8C]">
                What to budget for. Included items are marked.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {product.keyAccessories.map((acc, i) => {
                const categoryLabel: Record<string, string> = {
                  'child-seat': 'Child seat',
                  pannier: 'Pannier / Bag',
                  rack: 'Rack',
                  'rain-cover': 'Rain cover',
                  'running-board': 'Running board',
                  'safety-rail': 'Safety rail',
                  lock: 'Lock',
                  'trailer-hitch': 'Trailer hitch',
                  battery: 'Battery',
                  other: 'Other',
                }
                return (
                  <div
                    key={i}
                    className="border border-[#7A7A8C]/15 rounded-[10px] p-5 bg-[#FAFAF8]"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="text-base font-semibold text-[#1A1A2E] leading-tight">
                          {acc.name}
                        </h3>
                        {acc.category && (
                          <span className="text-[10px] uppercase tracking-wider text-[#7A7A8C] font-medium mt-1 inline-block">
                            {categoryLabel[acc.category] || acc.category}
                          </span>
                        )}
                      </div>
                      {acc.included ? (
                        <span className="text-[10px] font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                          Included
                        </span>
                      ) : acc.price != null ? (
                        <span className="text-sm font-semibold text-[#1A1A2E] shrink-0">
                          ${acc.price.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    {acc.description && (
                      <p className="text-xs text-[#7A7A8C] leading-snug mt-2">{acc.description}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── Reviews ─── */}
        {reviewSources.docs.length > 0 && (
          <div className="mt-20" id="reviews">
            <div className="flex items-baseline gap-4 mb-8">
              <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E]">
                What reviewers say
              </h2>
              {avgRating && (
                <span className="text-lg font-semibold text-[#E85D3A]">
                  {avgRating}/10 avg
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviewSources.docs.map((review) => (
                <a
                  key={review.id}
                  href={review.sourceUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-5 border border-[#7A7A8C]/15 rounded-[10px] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 no-underline group"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A2E] group-hover:text-[#E85D3A] transition-colors">
                        {review.sourceName}
                      </p>
                      {review.reviewerName && (
                        <p className="text-xs text-[#7A7A8C] mt-0.5">{review.reviewerName}</p>
                      )}
                    </div>
                    {review.rating != null && (
                      <span className="text-sm font-bold text-[#1A1A2E] bg-[#1A1A2E]/5 px-2 py-0.5 rounded">
                        {review.rating}/10
                      </span>
                    )}
                  </div>
                  {review.pullQuote && (
                    <p className="text-sm text-[#1A1A2E]/80 italic leading-relaxed">
                      &ldquo;{review.pullQuote}&rdquo;
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      review.sentiment === 'positive' ? 'bg-green-500' :
                      review.sentiment === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <span className="text-xs text-[#7A7A8C] capitalize">{review.sentiment}</span>
                    {review.sourceType && (
                      <span className="text-xs text-[#7A7A8C] ml-auto capitalize">
                        {review.sourceType.replace('-', ' ')}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ─── Videos ─── */}
        {videos.docs.length > 0 && (
          <div className="mt-20" id="videos">
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E] mb-8">
              Videos
            </h2>
            {/* Featured video large */}
            {featuredVideos.length > 0 && (
              <div className="mb-6">
                {featuredVideos.slice(0, 1).map((video) => (
                  <div key={video.id} className="rounded-[10px] overflow-hidden bg-black">
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        className="absolute inset-0 w-full h-full"
                        src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <div className="p-4 bg-[#1A1A2E]">
                      <p className="text-white font-medium text-sm">{video.title}</p>
                      {video.channelName && (
                        <p className="text-white/60 text-xs mt-1">{video.channelName}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Other videos grid */}
            {(featuredVideos.length > 1 ? featuredVideos.slice(1) : []).concat(otherVideos).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(featuredVideos.length > 1 ? featuredVideos.slice(1) : []).concat(otherVideos).map((video) => (
                  <a
                    key={video.id}
                    href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border border-[#7A7A8C]/15 rounded-[10px] overflow-hidden hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 no-underline group"
                  >
                    <div className="relative aspect-video bg-[#E8E0D4]">
                      <img
                        src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-[#E85D3A] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-medium text-[#1A1A2E] group-hover:text-[#E85D3A] transition-colors line-clamp-2">
                        {video.title}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {video.channelName && (
                          <span className="text-xs text-[#7A7A8C]">{video.channelName}</span>
                        )}
                        {video.videoType && (
                          <span className="text-xs text-[#7A7A8C] ml-auto capitalize bg-[#1A1A2E]/5 px-2 py-0.5 rounded">
                            {video.videoType.replace('-', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── FAQ ─── */}
        {product.faq && product.faq.length > 0 && (
          <div className="mt-20 max-w-3xl" id="faq">
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E] mb-6">
              Frequently Asked Questions
            </h2>
            <div className="divide-y divide-[#7A7A8C]/10">
              {product.faq.map((item, i) => (
                <details key={i} className="group py-4">
                  <summary className="flex items-center justify-between cursor-pointer list-none text-[#1A1A2E] font-medium text-base hover:text-[#E85D3A] transition-colors">
                    {item.question}
                    <svg
                      className="w-5 h-5 text-[#7A7A8C] shrink-0 ml-4 group-open:rotate-180 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="mt-3 text-sm text-[#1A1A2E]/80 leading-relaxed">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* ─── Competitors ─── */}
        {product.comparisonContext && (
          <div className="mt-20 max-w-3xl">
            <p className="text-sm text-[#7A7A8C] italic">{product.comparisonContext}</p>
          </div>
        )}

        {/* ─── Similar bikes ─── */}
        {similar.docs.length > 0 && (
          <div className="mt-8 pt-12 border-t border-[#7A7A8C]/10">
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E] mb-8">
              Similar bikes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similar.docs.map((p) => {
                const pBrand = p.brand && typeof p.brand === 'object' ? p.brand.name : null
                const pImage = p.images && p.images.length > 0 ? p.images[0] : null

                return (
                  <Link
                    key={p.id}
                    href={`/bikes/${p.slug}`}
                    className="group block bg-[#FAFAF8] border border-[#7A7A8C]/15 rounded-[10px] overflow-hidden hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 no-underline"
                  >
                    <div className="relative aspect-[4/3] w-full bg-[#E8E0D4]">
                      {pImage && typeof pImage === 'object' ? (
                        <Media resource={pImage} imgClassName="object-cover w-full h-full" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center px-4">
                            <p className="font-[family-name:var(--font-fraunces)] text-lg text-[#1A1A2E]/60 font-medium">
                              {pBrand || 'Brand'}
                            </p>
                            <p className="font-[family-name:var(--font-fraunces)] text-sm text-[#1A1A2E]/40 mt-1">
                              {p.name}
                            </p>
                          </div>
                        </div>
                      )}
                      {p.overallScore && (
                        <span className="absolute top-3 right-3 bg-[#1A1A2E]/80 text-white text-xs font-bold px-2 py-1 rounded">
                          {p.overallScore}/10
                        </span>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-[#1A1A2E] group-hover:text-[#E85D3A] transition-colors">
                        {p.name}
                      </h3>
                      <div className="flex items-center justify-between mt-2">
                        {pBrand && <span className="text-sm text-[#7A7A8C]">{pBrand}</span>}
                        {p.price != null && (
                          <span className="text-sm font-semibold text-[#1A1A2E]">
                            ${p.price.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

function buildSpecs(pairs: [string, string | number | boolean | null | undefined][]): { label: string; value: string }[] {
  return pairs
    .filter(([, value]) => value != null && value !== '' && value !== false)
    .map(([label, value]) => ({ label, value: String(value) }))
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const product = await queryProductBySlug({ slug: decodedSlug })

  if (!product) return { title: 'Product Not Found' }

  const brand = product.brand && typeof product.brand === 'object' ? product.brand.name : ''

  return {
    title: product.metaTitle || `${product.name}${brand ? ` by ${brand}` : ''} | Carryish`,
    description: product.metaDescription || (product.overallScore
      ? `${product.name} scores ${product.overallScore}/10. ${product.bestFor?.map((b) => b.tag).join(', ') || 'Honest review with real tradeoffs.'}`
      : `${product.name} - ${categoryLabels[product.category || ''] || 'Product'} reviewed on Carryish.`),
  }
}

const queryProductBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'products',
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: { slug: { equals: slug } },
  })

  return result.docs?.[0] || null
})

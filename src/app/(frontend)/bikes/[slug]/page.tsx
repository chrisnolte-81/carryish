import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import type { Product, ReviewSource, ProductVideo } from '@/payload-types'

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

  // Fetch review sources, videos, and similar bikes in parallel
  const [reviewSources, videos, similar] = await Promise.all([
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
    payload.find({
      collection: 'products',
      depth: 1,
      limit: 3,
      where: {
        _status: { equals: 'published' },
        slug: { not_equals: product.slug },
        category: { equals: product.category },
      },
    }),
  ])

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
    description: `${product.name} - ${categoryLabels[product.category || ''] || 'Cargo Bike'}`,
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
          <span className="mx-2">/</span>
          <span className="text-[#1A1A2E]">{product.name}</span>
        </nav>

        {/* ─── Hero ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Images */}
          <div className="space-y-4">
            {product.images && product.images.length > 0 ? (
              product.images.map((image, i) =>
                typeof image === 'object' ? (
                  <div key={i} className="relative rounded-[10px] overflow-hidden bg-[#E8E0D4]">
                    <Media resource={image} imgClassName="w-full h-auto object-cover" />
                  </div>
                ) : null,
              )
            ) : (
              <div className="aspect-[4/3] rounded-[10px] bg-[#E8E0D4] flex items-center justify-center">
                <div className="text-center px-4">
                  <p className="font-[family-name:var(--font-fraunces)] text-2xl text-[#1A1A2E]/60 font-medium">
                    {brand?.name || 'Brand'}
                  </p>
                  <p className="font-[family-name:var(--font-fraunces)] text-lg text-[#1A1A2E]/40 mt-2">
                    {product.name}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Details sidebar */}
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              {product.category && (
                <span className="text-xs uppercase tracking-wider text-[#7A7A8C] font-medium">
                  {categoryLabels[product.category] || product.category}
                </span>
              )}
              {product.testingStatus === 'tested' && (
                <span className="text-xs font-semibold bg-[#E85D3A]/10 text-[#E85D3A] px-2.5 py-1 rounded-md">
                  Tested by Carryish
                </span>
              )}
            </div>

            <h1 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl font-semibold text-[#1A1A2E] mt-3 tracking-tight">
              {product.name}
            </h1>

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
                </p>
              ) : null}
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

        {/* ─── Spec Sections ─── */}
        {specSections.length > 0 && (
          <div className="mt-20" id="specs">
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E] mb-8">
              Full Specifications
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              {specSections.map((section) => (
                <div key={section.title}>
                  <h3 className="text-sm uppercase tracking-wider text-[#7A7A8C] font-semibold mb-4 pb-2 border-b border-[#7A7A8C]/10">
                    {section.title}
                  </h3>
                  <dl className="space-y-3">
                    {section.specs.map((spec) => (
                      <div key={spec.label} className="flex justify-between gap-4">
                        <dt className="text-sm text-[#7A7A8C]">{spec.label}</dt>
                        <dd className="text-sm font-medium text-[#1A1A2E] text-right">{spec.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
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

        {/* ─── Similar bikes ─── */}
        {similar.docs.length > 0 && (
          <div className="mt-20 pt-12 border-t border-[#7A7A8C]/10">
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
    title: `${product.name}${brand ? ` by ${brand}` : ''} | Carryish`,
    description: product.overallScore
      ? `${product.name} scores ${product.overallScore}/10. ${product.bestFor?.map((b) => b.tag).join(', ') || 'Honest review with real tradeoffs.'}`
      : `${product.name} - ${categoryLabels[product.category || ''] || 'Product'} reviewed on Carryish.`,
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

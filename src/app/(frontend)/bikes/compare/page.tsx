import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import Link from 'next/link'
import RichText from '@/components/RichText'

type Props = {
  searchParams: Promise<{ ids?: string }>
}

export default async function ComparePage({ searchParams }: Props) {
  const { ids } = await searchParams
  const slugs = ids?.split(',').filter(Boolean) || []

  if (slugs.length < 2) {
    return (
      <div className="bg-[#FAFAF8] min-h-screen">
        <div className="container py-20 sm:py-24 max-w-3xl text-center">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#1A1A2E]">
            Compare Bikes
          </h1>
          <p className="mt-4 text-[#7A7A8C] text-lg">
            Select 2-3 bikes from the{' '}
            <Link href="/bikes" className="text-[#3A8FE8] no-underline hover:text-[#2D72BA]">
              bikes page
            </Link>{' '}
            to compare them side by side.
          </p>
        </div>
      </div>
    )
  }

  const payload = await getPayload({ config: configPromise })

  const products = await Promise.all(
    slugs.slice(0, 3).map(async (slug) => {
      const result = await payload.find({
        collection: 'products',
        depth: 1,
        limit: 1,
        where: { slug: { equals: slug }, _status: { equals: 'published' } },
      })
      return result.docs[0] || null
    }),
  )

  const validProducts = products.filter(Boolean)

  if (validProducts.length < 2) {
    return (
      <div className="bg-[#FAFAF8] min-h-screen">
        <div className="container py-20 sm:py-24 max-w-3xl text-center">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#1A1A2E]">
            Compare Bikes
          </h1>
          <p className="mt-4 text-[#7A7A8C] text-lg">
            Some bikes weren&apos;t found. Go back to the{' '}
            <Link href="/bikes" className="text-[#3A8FE8] no-underline hover:text-[#2D72BA]">
              bikes page
            </Link>{' '}
            and try again.
          </p>
        </div>
      </div>
    )
  }

  const motorPositionLabels: Record<string, string> = {
    'mid-drive': 'Mid-drive',
    'hub-rear': 'Hub (rear)',
    'hub-front': 'Hub (front)',
  }

  const specRows = [
    { label: 'Price', getValue: (p: any) => p.price != null ? `$${p.price.toLocaleString()}` : '—' },
    { label: 'Score', getValue: (p: any) => p.overallScore != null ? `${p.overallScore}/10` : '—' },
    { label: 'Weight', getValue: (p: any) => p.weightLbs ? `${p.weightLbs} lbs` : '—' },
    { label: 'Cargo capacity', getValue: (p: any) => p.cargoCapacityLbs ? `${p.cargoCapacityLbs} lbs` : '—' },
    { label: 'Motor', getValue: (p: any) => {
      const parts = [p.motorBrand, p.motorPosition ? motorPositionLabels[p.motorPosition] : null].filter(Boolean)
      return parts.length > 0 ? parts.join(' — ') : '—'
    }},
    { label: 'Torque', getValue: (p: any) => p.motorTorqueNm ? `${p.motorTorqueNm} Nm` : '—' },
    { label: 'Battery', getValue: (p: any) => p.batteryWh ? `${p.batteryWh} Wh` : '—' },
    { label: 'Range (real)', getValue: (p: any) => p.estimatedRealRangeMi ? `~${p.estimatedRealRangeMi} mi` : '—' },
    { label: 'Max kids', getValue: (p: any) => p.maxChildPassengers ?? '—' },
    { label: 'Layout', getValue: (p: any) => p.cargoLayout || '—' },
  ]

  return (
    <div className="bg-[#FAFAF8] min-h-screen">
      <div className="container py-20 sm:py-24">
        {/* Breadcrumbs */}
        <nav className="mb-8 text-sm text-[#7A7A8C]">
          <Link href="/" className="hover:text-[#1A1A2E] no-underline transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/bikes" className="hover:text-[#1A1A2E] no-underline transition-colors">Bikes</Link>
          <span className="mx-2">/</span>
          <span className="text-[#1A1A2E]">Compare</span>
        </nav>

        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl font-semibold text-[#1A1A2E] mb-12">
          Compare Bikes
        </h1>

        {/* Comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Header row with bike names */}
            <thead>
              <tr>
                <th className="text-left p-4 border-b border-[#7A7A8C]/10 w-40"></th>
                {validProducts.map((p) => {
                  const brand = p.brand && typeof p.brand === 'object' ? p.brand.name : null
                  return (
                    <th key={p.id} className="text-left p-4 border-b border-[#7A7A8C]/10 min-w-[200px]">
                      <Link href={`/bikes/${p.slug}`} className="no-underline">
                        {/* Placeholder image */}
                        <div className="aspect-[4/3] rounded-lg bg-[#E8E0D4] flex items-center justify-center mb-3">
                          <div className="text-center px-3">
                            <p className="font-[family-name:var(--font-fraunces)] text-sm text-[#1A1A2E]/60 font-medium">
                              {brand}
                            </p>
                            <p className="font-[family-name:var(--font-fraunces)] text-xs text-[#1A1A2E]/40 mt-0.5">
                              {p.name}
                            </p>
                          </div>
                        </div>
                        <h3 className="font-[family-name:var(--font-fraunces)] text-base font-semibold text-[#1A1A2E]">
                          {p.name}
                        </h3>
                        {brand && <p className="text-sm text-[#7A7A8C] mt-0.5">{brand}</p>}
                      </Link>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {specRows.map((row) => (
                <tr key={row.label}>
                  <td className="p-4 border-b border-[#7A7A8C]/10 text-sm text-[#7A7A8C] font-medium">
                    {row.label}
                  </td>
                  {validProducts.map((p) => (
                    <td key={p.id} className="p-4 border-b border-[#7A7A8C]/10 text-sm text-[#1A1A2E] font-medium">
                      {row.getValue(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Carryish Takes */}
        <div className="mt-16">
          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E] mb-8">
            The Carryish Take
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {validProducts.map((p) => (
              <div key={p.id} className="bg-[#FAFAF8] border-l-[3px] border-[#E85D3A] pl-6 py-4">
                <h3 className="font-[family-name:var(--font-fraunces)] text-base font-semibold text-[#1A1A2E] mb-3">
                  {p.name}
                </h3>
                {p.carryishTake && (
                  <div className="text-sm text-[#1A1A2E] leading-relaxed">
                    <RichText data={p.carryishTake} enableGutter={false} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: 'Compare Bikes | Carryish',
    description: 'Compare cargo bikes side by side — specs, prices, and honest takes.',
  }
}

import type { Metadata } from 'next/types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import Link from 'next/link'
import { Media } from '@/components/Media'

export const dynamic = 'force-static'
export const revalidate = 600

export default async function BrandsPage() {
  const payload = await getPayload({ config: configPromise })

  const [brands, products] = await Promise.all([
    payload.find({
      collection: 'brands',
      depth: 1,
      limit: 50,
      sort: 'name',
    }),
    payload.find({
      collection: 'products',
      depth: 0,
      limit: 200,
      where: { _status: { equals: 'published' } },
      select: { brand: true },
    }),
  ])

  // Count products per brand
  const productCounts: Record<number, number> = {}
  for (const product of products.docs) {
    const brandId = typeof product.brand === 'object' ? product.brand?.id : product.brand
    if (brandId) productCounts[brandId] = (productCounts[brandId] || 0) + 1
  }

  return (
    <div className="bg-[#FAFAF8] min-h-screen">
      <div className="container py-20 sm:py-24">
        <div className="mb-12">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-[#1A1A2E] tracking-tight">
            Brands
          </h1>
          <p className="mt-3 text-[#7A7A8C] text-lg max-w-2xl">
            {brands.totalDocs} brands we cover. Each one reviewed with honest opinions and real tradeoffs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {brands.docs.map((brand) => {
            const count = productCounts[brand.id] || 0
            const hasLogo = brand.logo && typeof brand.logo === 'object' && (brand.logo as any).url

            return (
              <Link
                key={brand.id}
                href={`/brands/${brand.slug}`}
                className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300 no-underline"
              >
                {/* Logo / visual area */}
                {hasLogo ? (
                  <div className="relative aspect-[2.2/1] w-full bg-[#F8F7F5]">
                    <Media
                      resource={brand.logo as any}
                      imgClassName="object-contain w-full h-full p-8"
                      fill
                    />
                  </div>
                ) : (
                  <div className="relative aspect-[2.2/1] w-full bg-gradient-to-br from-[#1A1A2E] to-[#2D2D44] flex items-center justify-center">
                    <span className="font-[family-name:var(--font-fraunces)] text-2xl sm:text-3xl font-semibold text-white/90 tracking-tight">
                      {brand.name}
                    </span>
                    {count > 0 && (
                      <span className="absolute bottom-3 right-3 text-[10px] font-medium text-white/40 bg-white/10 px-2.5 py-1 rounded-full">
                        {count} {count === 1 ? 'bike' : 'bikes'}
                      </span>
                    )}
                  </div>
                )}

                {/* Card body */}
                <div className="flex flex-col flex-1 p-5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-[#1A1A2E] group-hover:text-[#E85D3A] transition-colors">
                      {brand.name}
                    </h2>
                    {hasLogo && count > 0 && (
                      <span className="text-[11px] font-medium text-[#7A7A8C] bg-[#1A1A2E]/[0.04] px-2.5 py-1 rounded-full shrink-0">
                        {count} {count === 1 ? 'bike' : 'bikes'}
                      </span>
                    )}
                  </div>

                  {brand.description && (
                    <p className="text-sm text-[#7A7A8C] leading-relaxed line-clamp-2 mt-1">
                      {brand.description}
                    </p>
                  )}

                  <div className="mt-auto pt-4">
                    <span className="text-xs font-semibold text-[#E85D3A] group-hover:text-[#d14e2d] transition-colors uppercase tracking-wider">
                      View brand &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: 'Brands | Carryish',
    description: 'All cargo bike brands we review and recommend. Honest opinions on every one.',
  }
}

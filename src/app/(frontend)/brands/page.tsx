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

  const brands = await payload.find({
    collection: 'brands',
    depth: 1,
    limit: 50,
    sort: 'name',
  })

  return (
    <div className="bg-[#FAFAF8] min-h-screen">
      <div className="container py-20 sm:py-24">
        <div className="mb-12">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-[#1A1A2E] tracking-tight">
            Brands
          </h1>
          <p className="mt-3 text-[#7A7A8C] text-lg max-w-2xl">
            {brands.totalDocs} brands in our catalog. Each one reviewed with honest opinions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {brands.docs.map((brand) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.slug}`}
              className="group block bg-[#FAFAF8] border border-[#7A7A8C]/15 rounded-[10px] overflow-hidden hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 no-underline"
            >
              {brand.logo && typeof brand.logo === 'object' ? (
                <div className="relative aspect-[2/1] w-full bg-[#F5F5F3]">
                  <Media
                    resource={brand.logo}
                    imgClassName="object-contain w-full h-full p-6"
                    fill
                  />
                </div>
              ) : (
                <div className="aspect-[2/1] w-full bg-[#F5F5F3] flex items-center justify-center">
                  <span className="text-2xl font-semibold text-[#7A7A8C]/40 font-[family-name:var(--font-fraunces)]">
                    {brand.name}
                  </span>
                </div>
              )}
              <div className="p-6">
              <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#1A1A2E] group-hover:text-[#E85D3A] transition-colors">
                {brand.name}
              </h2>
              {brand.description && (
                <p className="mt-3 text-sm text-[#7A7A8C] leading-relaxed line-clamp-3">
                  {brand.description}
                </p>
              )}
              {brand.websiteUrl && (
                <span className="inline-block mt-4 text-xs text-[#3A8FE8] font-medium">
                  View brand &rarr;
                </span>
              )}
              </div>
            </Link>
          ))}
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

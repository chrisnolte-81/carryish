import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React, { cache } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Media } from '@/components/Media'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const brands = await payload.find({
    collection: 'brands',
    limit: 100,
    pagination: false,
    select: { slug: true },
  })

  return brands.docs.map(({ slug }) => ({ slug }))
}

type Args = {
  params: Promise<{ slug?: string }>
}

export default async function BrandPage({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const brand = await queryBrandBySlug({ slug: decodeURIComponent(slug) })

  if (!brand) {
    notFound()
  }

  const payload = await getPayload({ config: configPromise })
  const products = await payload.find({
    collection: 'products',
    depth: 1,
    limit: 50,
    select: {
      name: true,
      slug: true,
      price: true,
      images: true,
    },
    where: {
      _status: { equals: 'published' },
      brand: { equals: brand.id },
    },
  })

  return (
    <div className="bg-[#FAFAF8] min-h-screen">
      <div className="container py-20 sm:py-24">
        {/* Breadcrumbs */}
        <nav className="mb-8 text-sm text-[#7A7A8C]">
          <Link href="/" className="hover:text-[#1A1A2E] no-underline transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/brands" className="hover:text-[#1A1A2E] no-underline transition-colors">Brands</Link>
          <span className="mx-2">/</span>
          <span className="text-[#1A1A2E]">{brand.name}</span>
        </nav>

        <div className="max-w-3xl">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl font-semibold text-[#1A1A2E] tracking-tight">
            {brand.name}
          </h1>
          {brand.websiteUrl && (
            <a
              href={brand.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-sm text-[#3A8FE8] hover:text-[#2D72BA] no-underline"
            >
              {brand.websiteUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')} &rarr;
            </a>
          )}
          {brand.description && (
            <p className="mt-6 text-[#1A1A2E] text-[1.05rem] leading-[1.7]">
              {brand.description}
            </p>
          )}
        </div>

        {/* Brand's products */}
        {products.docs.length > 0 && (
          <div className="mt-16 pt-12 border-t border-[#7A7A8C]/10">
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E] mb-8">
              {brand.name} bikes on Carryish
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {products.docs.map((product) => {
                const firstImage = product.images && product.images.length > 0 ? product.images[0] : null

                return (
                  <Link
                    key={product.id}
                    href={`/bikes/${product.slug}`}
                    className="group block bg-[#FAFAF8] border border-[#7A7A8C]/15 rounded-[10px] overflow-hidden hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 no-underline"
                  >
                    <div className="relative aspect-[4/3] w-full bg-[#E8E0D4]">
                      {firstImage && typeof firstImage === 'object' ? (
                        <Media resource={firstImage} imgClassName="object-cover w-full h-full" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center px-4">
                            <p className="font-[family-name:var(--font-fraunces)] text-lg text-[#1A1A2E]/60 font-medium">
                              {brand.name}
                            </p>
                            <p className="font-[family-name:var(--font-fraunces)] text-sm text-[#1A1A2E]/40 mt-1">
                              {product.name}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-[#1A1A2E] group-hover:text-[#E85D3A] transition-colors">
                        {product.name}
                      </h3>
                      {product.price != null && (
                        <span className="text-sm font-semibold text-[#1A1A2E] mt-2 block">
                          ${product.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const brand = await queryBrandBySlug({ slug: decodeURIComponent(slug) })

  if (!brand) {
    return { title: 'Brand Not Found' }
  }

  return {
    title: `${brand.name} | Carryish`,
    description: brand.description || `${brand.name} cargo bikes and gear on Carryish.`,
  }
}

const queryBrandBySlug = cache(async ({ slug }: { slug: string }) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'brands',
    limit: 1,
    pagination: false,
    where: {
      slug: { equals: slug },
    },
  })

  return result.docs?.[0] || null
})

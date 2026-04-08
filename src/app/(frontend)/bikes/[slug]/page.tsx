import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import { notFound } from 'next/navigation'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'

const categoryLabels: Record<string, string> = {
  'cargo-bike': 'Cargo Bike',
  stroller: 'Stroller',
  trailer: 'Trailer',
  wagon: 'Wagon',
  accessory: 'Accessory',
}

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const products = await payload.find({
    collection: 'products',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  return products.docs.map(({ slug }) => ({ slug }))
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function ProductPage({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const product = await queryProductBySlug({ slug: decodedSlug })

  if (!product) {
    notFound()
  }

  const brand =
    product.brand && typeof product.brand === 'object' ? product.brand : null

  const specs = [
    { label: 'Weight', value: product.weight },
    { label: 'Cargo Capacity', value: product.cargoCapacity },
    { label: 'Motor Type', value: product.motorType },
    { label: 'Battery Range', value: product.batteryRange },
  ].filter((s) => s.value)

  return (
    <article className="pt-24 pb-24">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-4">
            {product.images &&
              product.images.map((image, i) =>
                typeof image === 'object' ? (
                  <div key={i} className="relative rounded-lg overflow-hidden bg-muted">
                    <Media resource={image} imgClassName="w-full h-auto object-cover" />
                  </div>
                ) : null,
              )}
          </div>

          {/* Details */}
          <div>
            {product.category && (
              <span className="text-sm uppercase tracking-wide text-muted-foreground">
                {categoryLabels[product.category] || product.category}
              </span>
            )}
            <h1 className="text-3xl font-bold mt-2">{product.name}</h1>
            {brand && (
              <p className="text-muted-foreground mt-1">
                by{' '}
                {brand.websiteUrl ? (
                  <a
                    href={brand.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {brand.name}
                  </a>
                ) : (
                  brand.name
                )}
              </p>
            )}

            {product.price != null && (
              <p className="text-2xl font-semibold mt-4">
                ${product.price.toLocaleString()}
              </p>
            )}

            <a
              href={product.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Buy Now
            </a>

            {/* Specs */}
            {specs.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Specs</h2>
                <dl className="grid grid-cols-2 gap-4">
                  {specs.map((spec) => (
                    <div key={spec.label}>
                      <dt className="text-sm text-muted-foreground">{spec.label}</dt>
                      <dd className="font-medium">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>

        {/* Carryish Take */}
        {product.carryishTake && (
          <div className="mt-16 max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold mb-6">The Carryish Take</h2>
            <RichText data={product.carryishTake} enableGutter={false} />
          </div>
        )}
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const product = await queryProductBySlug({ slug: decodedSlug })

  if (!product) {
    return { title: 'Product Not Found' }
  }

  const brand =
    product.brand && typeof product.brand === 'object' ? product.brand.name : ''

  return {
    title: `${product.name}${brand ? ` by ${brand}` : ''} | Carryish`,
    description: `${product.name} - ${categoryLabels[product.category || ''] || 'Product'} available on Carryish.`,
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
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})

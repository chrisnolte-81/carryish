import type { Metadata } from 'next/types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import Link from 'next/link'
import { Media } from '@/components/Media'

export const dynamic = 'force-static'
export const revalidate = 600

const categoryLabels: Record<string, string> = {
  'cargo-bike': 'Cargo Bike',
  stroller: 'Stroller',
  trailer: 'Trailer',
  wagon: 'Wagon',
  accessory: 'Accessory',
}

export default async function BikesPage() {
  const payload = await getPayload({ config: configPromise })

  const products = await payload.find({
    collection: 'products',
    depth: 1,
    limit: 12,
    overrideAccess: false,
    sort: '-publishedAt',
    where: {
      _status: {
        equals: 'published',
      },
    },
  })

  return (
    <div className="pt-24 pb-24">
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none">
          <h1>Bikes & Gear</h1>
        </div>
      </div>

      <div className="container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.docs.map((product) => {
            const firstImage =
              product.images && product.images.length > 0 ? product.images[0] : null
            const brand =
              product.brand && typeof product.brand === 'object' ? product.brand.name : null

            return (
              <Link
                key={product.id}
                href={`/bikes/${product.slug}`}
                className="border border-border rounded-lg overflow-hidden bg-card hover:shadow-lg transition-shadow no-underline"
              >
                <div className="relative aspect-[4/3] w-full bg-muted">
                  {firstImage && typeof firstImage === 'object' && (
                    <Media resource={firstImage} imgClassName="object-cover w-full h-full" />
                  )}
                </div>
                <div className="p-4">
                  {product.category && (
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {categoryLabels[product.category] || product.category}
                    </span>
                  )}
                  <h3 className="text-lg font-semibold mt-1">{product.name}</h3>
                  <div className="flex items-center justify-between mt-2">
                    {brand && (
                      <span className="text-sm text-muted-foreground">{brand}</span>
                    )}
                    {product.price != null && (
                      <span className="text-sm font-medium">
                        ${product.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {products.docs.length === 0 && (
          <p className="text-muted-foreground">No products found.</p>
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: 'Bikes & Gear | Carryish',
    description: 'Browse cargo bikes, strollers, trailers, wagons, and accessories.',
  }
}

import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import PageClient from './page.client'

export const dynamic = 'force-static'
export const revalidate = 600

export default async function Page() {
  const payload = await getPayload({ config: configPromise })

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 12,
    overrideAccess: false,
    select: {
      title: true,
      slug: true,
      categories: true,
      meta: true,
    },
  })

  return (
    <div className="bg-[#FAFAF8] min-h-screen">
      <div className="container py-20 sm:py-24">
        <PageClient />
        <div className="mb-12">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-[#1A1A2E] tracking-tight">
            Blog
          </h1>
          <p className="mt-3 text-[#7A7A8C] text-lg max-w-2xl">
            Honest takes on cargo bikes, gear, and the car-lite life. No press releases, no filler.
          </p>
        </div>

        {posts.totalDocs > 0 ? (
          <>
            <div className="mb-8">
              <PageRange
                collection="posts"
                currentPage={posts.page}
                limit={12}
                totalDocs={posts.totalDocs}
              />
            </div>

            <CollectionArchive posts={posts.docs} />

            <div className="mt-12">
              {posts.totalPages > 1 && posts.page && (
                <Pagination page={posts.page} totalPages={posts.totalPages} />
              )}
            </div>
          </>
        ) : (
          <div className="py-16 text-center max-w-md mx-auto">
            <p className="text-lg text-[#1A1A2E] font-medium mb-2">Blog coming soon</p>
            <p className="text-[#7A7A8C] text-sm mb-6">
              We&apos;re writing honest takes on cargo bikes, gear, and going car-lite. Sign up to get notified.
            </p>
            <a
              href="/api/subscribe"
              className="inline-block px-6 py-3 bg-[#E85D3A] text-white rounded-lg font-medium hover:bg-[#d14e2d] transition-colors no-underline text-sm"
            >
              Notify me
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: 'Blog | Carryish',
    description: 'Honest takes on cargo bikes, gear, and the car-lite life.',
  }
}

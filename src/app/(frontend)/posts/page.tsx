import type { Metadata } from 'next/types'

import { Pagination } from '@/components/Pagination'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import Link from 'next/link'
import React from 'react'
import PageClient from './page.client'

export const dynamic = 'force-static'
export const revalidate = 600

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

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
      publishedAt: true,
      heroImage: true,
    },
  })

  return (
    <div className="bg-[#FAFAF8] min-h-screen">
      <div className="container py-20 sm:py-24">
        <PageClient />
        <div className="mb-14">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-[#1A1A2E] tracking-tight">
            From the workshop
          </h1>
          <p className="mt-3 text-[#7A7A8C] text-lg max-w-2xl">
            Honest takes on cargo bikes, costs, and the gear that makes it work.
          </p>
        </div>

        {posts.totalDocs > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.docs.map((post) => {
                const heroImage = post.heroImage
                const hasImage = heroImage && typeof heroImage === 'object' && heroImage.url

                return (
                  <Link
                    key={post.slug}
                    href={`/posts/${post.slug}`}
                    className="group block no-underline"
                  >
                    <article className="bg-white rounded-xl overflow-hidden border border-[#E8E8EC] hover:border-[#7A7A8C]/40 transition-colors h-full flex flex-col">
                      {/* Image or placeholder */}
                      <div className="aspect-[16/9] bg-[#F0F0F0] relative overflow-hidden">
                        {hasImage ? (
                          <img
                            src={heroImage.url!}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="font-[family-name:var(--font-fraunces)] text-[#7A7A8C]/30 text-4xl font-semibold select-none">
                              ish
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-5 flex flex-col flex-1">
                        {/* Date */}
                        <div className="flex items-center gap-2 text-xs text-[#7A7A8C] mb-3">
                          {post.publishedAt && (
                            <time dateTime={post.publishedAt}>
                              {formatDate(post.publishedAt)}
                            </time>
                          )}
                        </div>

                        {/* Title */}
                        <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-[#1A1A2E] leading-snug group-hover:text-[#E85D3A] transition-colors mb-2">
                          {post.title}
                        </h2>

                        {/* Excerpt */}
                        {post.meta?.description && (
                          <p className="text-sm text-[#7A7A8C] leading-relaxed line-clamp-3 flex-1">
                            {post.meta.description}
                          </p>
                        )}

                        {/* Author */}
                        <p className="text-xs text-[#7A7A8C]/60 mt-4 pt-3 border-t border-[#E8E8EC]">
                          By the Carryish team
                        </p>
                      </div>
                    </article>
                  </Link>
                )
              })}
            </div>

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
    title: 'From the workshop | Carryish',
    description: 'Honest takes on cargo bikes, costs, and the gear that makes it work.',
  }
}

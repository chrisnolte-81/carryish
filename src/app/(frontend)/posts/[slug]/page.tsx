import type { Metadata } from 'next'

import { RelatedPosts } from '@/blocks/RelatedPosts/Component'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import RichText from '@/components/RichText'

import type { Post } from '@/payload-types'

import { PostHero } from '@/heros/PostHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const posts = await payload.find({
    collection: 'posts',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = posts.docs.map(({ slug }) => {
    return { slug }
  })

  return params
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function countWords(node: any): number {
  if (!node) return 0
  if (node.type === 'text' && typeof node.text === 'string') {
    return node.text.split(/\s+/).filter(Boolean).length
  }
  if (Array.isArray(node.children)) {
    return node.children.reduce((sum: number, child: any) => sum + countWords(child), 0)
  }
  if (node.root) return countWords(node.root)
  return 0
}

export default async function Post({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const url = '/posts/' + decodedSlug
  const post = await queryPostBySlug({ slug: decodedSlug })

  if (!post) return <PayloadRedirects url={url} />

  const hasHeroImage = post.heroImage && typeof post.heroImage !== 'string'
  const wordCount = countWords(post.content)
  const readMinutes = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <article className="bg-[#FAFAF8]">
      <PageClient />
      <PayloadRedirects disableNotFound url={url} />
      {draft && <LivePreviewListener />}

      {hasHeroImage ? (
        <PostHero post={post} />
      ) : (
        /* Text-only hero for posts without images */
        <div className="pt-24 sm:pt-32 pb-8">
          <div className="max-w-[42.5rem] mx-auto px-6">
            {post.categories && post.categories.length > 0 && (
              <div className="uppercase text-xs font-medium tracking-wider text-[#7A7A8C] mb-4">
                {post.categories.map((cat, i) => (
                  <React.Fragment key={i}>
                    {typeof cat === 'object' ? cat.title : ''}
                    {i < post.categories!.length - 1 && ', '}
                  </React.Fragment>
                ))}
              </div>
            )}

            <h1 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-[#1A1A2E] tracking-tight leading-tight">
              {post.title}
            </h1>

            <div className="flex items-center gap-3 mt-6 text-sm text-[#7A7A8C]">
              <span>By the Carryish team</span>
              <span className="text-[#7A7A8C]/40">&middot;</span>
              {post.publishedAt && (
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              )}
              <span className="text-[#7A7A8C]/40">&middot;</span>
              <span>{readMinutes} min read</span>
            </div>

            <hr className="mt-8 border-[#E8E8EC]" />
          </div>
        </div>
      )}

      <div className="pb-16 sm:pb-24">
        <div className="max-w-[42.5rem] mx-auto px-6">
          <RichText
            className="prose prose-lg max-w-none
              prose-headings:font-[family-name:var(--font-fraunces)] prose-headings:text-[#1A1A2E] prose-headings:tracking-tight
              prose-p:text-[#1A1A2E]/85 prose-p:leading-[1.75]
              prose-li:text-[#1A1A2E]/85 prose-li:leading-[1.65]
              prose-a:text-[#3A8FE8] prose-a:no-underline hover:prose-a:underline
              prose-strong:text-[#1A1A2E]
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3"
            data={post.content}
            enableGutter={false}
            enableProse={false}
          />

          {/* Affiliate disclosure */}
          <div className="mt-12 pt-6 border-t border-[#E8E8EC]">
            <p className="text-xs text-[#7A7A8C] leading-relaxed">
              If you buy through our links, we earn a small commission. It doesn&apos;t change what we recommend.
            </p>
          </div>

          {/* Related posts */}
          {post.relatedPosts && post.relatedPosts.length > 0 && (
            <div className="mt-16">
              <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#1A1A2E] mb-6">
                Keep reading
              </h2>
              <RelatedPosts
                docs={post.relatedPosts.filter((p) => typeof p === 'object')}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const post = await queryPostBySlug({ slug: decodedSlug })

  return generateMeta({ doc: post })
}

const queryPostBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'posts',
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

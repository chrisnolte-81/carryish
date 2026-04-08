import { anthropic } from '@ai-sdk/anthropic'
import { streamText, tool, stepCountIs, zodSchema } from 'ai'
import { z } from 'zod'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { systemPrompt } from './system-prompt'
import type { Where } from 'payload'

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages: uiMessages } = await req.json()

  // Convert UIMessage format (parts array) to ModelMessage format (content string)
  const messages = uiMessages.map(
    (msg: { role: string; parts?: { type: string; text?: string }[]; content?: string }) => ({
      role: msg.role,
      content:
        msg.parts
          ?.filter((p: { type: string }) => p.type === 'text')
          .map((p: { text?: string }) => p.text)
          .join('') || msg.content || '',
    }),
  )

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: systemPrompt,
    messages,
    tools: {
      searchProducts: tool({
        description:
          'Search the Carryish product catalog. Use this when users ask about bikes, products, or need recommendations. Returns matching products with specs, pricing, and affiliate links.',
        inputSchema: zodSchema(
          z.object({
            category: z
              .enum(['cargo-bike', 'stroller', 'trailer', 'wagon', 'accessory'])
              .optional()
              .describe('Filter by product category'),
            brand: z.string().optional().describe('Filter by brand name (partial match)'),
            minPrice: z.number().optional().describe('Minimum price in USD'),
            maxPrice: z.number().optional().describe('Maximum price in USD'),
          }),
        ),
        execute: async ({ category, brand, minPrice, maxPrice }) => {
          const payload = await getPayload({ config: configPromise })

          const where: Where = {
            _status: { equals: 'published' },
          }

          if (category) {
            where.category = { equals: category }
          }

          if (minPrice !== undefined || maxPrice !== undefined) {
            where.price = {}
            if (minPrice !== undefined) {
              (where.price as Record<string, unknown>).greater_than_equal = minPrice
            }
            if (maxPrice !== undefined) {
              (where.price as Record<string, unknown>).less_than_equal = maxPrice
            }
          }

          const products = await payload.find({
            collection: 'products',
            where,
            depth: 1,
            limit: 20,
            sort: 'price',
          })

          let results = products.docs

          // Filter by brand name if provided (brand is a relationship, need post-filter)
          if (brand) {
            const brandLower = brand.toLowerCase()
            results = results.filter((p) => {
              if (p.brand && typeof p.brand === 'object') {
                return p.brand.name.toLowerCase().includes(brandLower)
              }
              return false
            })
          }

          return results.map((p) => {
            const brandName = p.brand && typeof p.brand === 'object' ? p.brand.name : null

            // Extract plain text from richtext carryishTake
            let carryishTake = ''
            if (p.carryishTake && typeof p.carryishTake === 'object') {
              const root = (p.carryishTake as Record<string, any>).root
              if (root?.children) {
                carryishTake = root.children
                  .map((node: Record<string, any>) =>
                    node.children
                      ?.map((child: Record<string, any>) => child.text || '')
                      .join('') || '',
                  )
                  .join(' ')
                  .trim()
              }
            }

            return {
              name: p.name,
              slug: p.slug,
              brand: brandName,
              category: p.category,
              price: p.price,
              overallScore: p.overallScore ?? null,
              bestFor: p.bestFor?.map((b) => b.tag) || [],
              motorTorqueNm: p.motorTorqueNm ?? null,
              estimatedRealRangeMi: p.estimatedRealRangeMi ?? null,
              weightLbs: p.weightLbs ?? null,
              affiliateUrl: p.affiliateUrl,
              carryishTake,
              url: `/bikes/${p.slug}`,
            }
          })
        },
      }),
    },
    stopWhen: stepCountIs(3),
  })

  return result.toUIMessageStreamResponse()
}

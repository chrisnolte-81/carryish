import Link from 'next/link'
import React from 'react'
import type { Product } from '@/payload-types'

interface VariantBarProps {
  currentSlug: string
  currentName: string
  currentPrice?: number | null
  currentDrivetrainSummary?: string | null
  modelFamily?: string | null
  brandName?: string | null
  variants: Product[]
}

/** Strip "Brand ModelFamily" from a variant name to leave just the trim (e.g. "Tern GSD S10" → "S10"). */
function stripPrefix(
  name: string,
  brandName?: string | null,
  modelFamily?: string | null,
): string {
  let stripped = name
  if (brandName) {
    const brandRe = new RegExp(`^${brandName}\\s+`, 'i')
    stripped = stripped.replace(brandRe, '')
  }
  if (modelFamily) {
    const familyRe = new RegExp(`^${modelFamily}\\s+`, 'i')
    stripped = stripped.replace(familyRe, '')
  }
  return stripped.trim() || name
}

/** Short drivetrain summary like "10-speed chain" or "14-speed belt". */
function drivetrainSummary(product: Product): string | null {
  const gears = product.numberOfGears
  const type = product.drivetrainType
  if (!gears && !type) return null
  const parts: string[] = []
  if (gears) parts.push(`${gears}-speed`)
  if (type === 'belt') parts.push('belt')
  else if (type === 'chain') parts.push('chain')
  return parts.join(' ') || null
}

export const VariantBar: React.FC<VariantBarProps> = ({
  currentSlug,
  currentName,
  currentPrice,
  currentDrivetrainSummary,
  modelFamily,
  brandName,
  variants,
}) => {
  if (!variants || variants.length === 0) return null

  type Item = {
    slug: string
    name: string
    price?: number | null
    drivetrain: string | null
    isCurrent: boolean
  }

  const items: Item[] = [
    {
      slug: currentSlug,
      name: stripPrefix(currentName, brandName, modelFamily),
      price: currentPrice,
      drivetrain: currentDrivetrainSummary || null,
      isCurrent: true,
    },
    ...variants.map((v) => ({
      slug: v.slug || '',
      name: stripPrefix(v.name, brandName, modelFamily),
      price: v.price,
      drivetrain: drivetrainSummary(v),
      isCurrent: false,
    })),
  ]

  return (
    <div className="mt-5">
      <p className="text-[11px] font-medium text-[#7A7A8C] uppercase tracking-wide mb-2">
        {modelFamily ? `${modelFamily} lineup` : 'Variants'}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {items.map((item) =>
          item.isCurrent ? (
            <div
              key={item.slug}
              className="shrink-0 min-w-[110px] px-3 py-2 rounded-lg border-2 border-[#E85D3A] bg-[#FEF0EC]"
              aria-current="page"
            >
              <p className="text-sm font-semibold text-[#E85D3A] leading-tight">{item.name}</p>
              {item.price != null && (
                <p className="text-xs font-medium text-[#1A1A2E] mt-0.5">
                  ${item.price.toLocaleString()}
                </p>
              )}
              {item.drivetrain && (
                <p className="text-[10px] text-[#7A7A8C] mt-0.5 capitalize">{item.drivetrain}</p>
              )}
            </div>
          ) : (
            <Link
              key={item.slug}
              href={`/bikes/${item.slug}`}
              className="shrink-0 min-w-[110px] px-3 py-2 rounded-lg border border-[#E8E8EC] bg-white hover:border-[#E85D3A] hover:bg-[#FEF0EC]/50 transition-colors no-underline"
            >
              <p className="text-sm font-semibold text-[#1A1A2E] leading-tight">{item.name}</p>
              {item.price != null && (
                <p className="text-xs font-medium text-[#1A1A2E] mt-0.5">
                  ${item.price.toLocaleString()}
                </p>
              )}
              {item.drivetrain && (
                <p className="text-[10px] text-[#7A7A8C] mt-0.5 capitalize">{item.drivetrain}</p>
              )}
            </Link>
          ),
        )}
      </div>
    </div>
  )
}

'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import NextImage from 'next/image'
import { cn } from '@/utilities/ui'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import type { Media } from '@/payload-types'

export interface GalleryDetailItem {
  image: Media
  caption?: string | null
  component?: string | null
}

export interface GalleryLifestyleItem {
  image: Media
  caption?: string | null
  context?: string | null
}

export interface GalleryColorOption {
  colorName: string
  colorHex?: string | null
  heroImage?: Media | null
  angleImage?: Media | null
}

interface ProductGalleryProps {
  images: Media[]
  details?: GalleryDetailItem[]
  lifestyle?: GalleryLifestyleItem[]
  colorOptions?: GalleryColorOption[]
  brandName?: string
  productName: string
  testedBadge?: boolean
  overallScore?: number | null
}

type TabKey = 'product' | 'details' | 'lifestyle'

const TAB_LABELS: Record<TabKey, string> = {
  product: 'Product',
  details: 'Details',
  lifestyle: 'In the wild',
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  images,
  details = [],
  lifestyle = [],
  colorOptions = [],
  brandName,
  productName,
  testedBadge = false,
  overallScore = null,
}) => {
  // null = "All" / default (use product.images)
  // number = selected color index (use that color's hero + angle)
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null)

  // Colors are renderable as swatches as long as they have a hex value.
  // If they also have per-color hero images we swap the gallery on click;
  // otherwise the swatch is a visual reference only.
  const usableColors = useMemo(
    () => colorOptions.filter((c) => typeof c.colorHex === 'string' && c.colorHex.length > 0),
    [colorOptions],
  )

  // Build slides for each tab
  const tabSlides = useMemo(() => {
    // When a color with per-color images is selected, swap in those slides.
    // Otherwise fall back to the product's default images.
    let product: { image: Media; caption?: string | null }[]
    const selectedColor =
      selectedColorIndex !== null ? usableColors[selectedColorIndex] : null
    const hasSwappableImages =
      selectedColor &&
      ((selectedColor.heroImage && typeof selectedColor.heroImage === 'object') ||
        (selectedColor.angleImage && typeof selectedColor.angleImage === 'object'))
    if (selectedColor && hasSwappableImages) {
      const slides: { image: Media; caption?: string | null }[] = []
      if (selectedColor.heroImage && typeof selectedColor.heroImage === 'object') {
        slides.push({
          image: selectedColor.heroImage,
          caption: `${selectedColor.colorName} — side profile`,
        })
      }
      if (selectedColor.angleImage && typeof selectedColor.angleImage === 'object') {
        slides.push({
          image: selectedColor.angleImage,
          caption: `${selectedColor.colorName} — 3/4 angle`,
        })
      }
      product = slides
    } else {
      product = images.map((img) => ({
        image: img,
        caption: img.alt || null,
      }))
    }
    const detailSlides = details.map((d) => ({ image: d.image, caption: d.caption || null }))
    const lifestyleSlides = lifestyle.map((l) => ({ image: l.image, caption: l.caption || null }))
    return { product, details: detailSlides, lifestyle: lifestyleSlides }
  }, [images, details, lifestyle, selectedColorIndex, usableColors])

  const availableTabs = useMemo(() => {
    const tabs: TabKey[] = []
    if (tabSlides.product.length > 0) tabs.push('product')
    if (tabSlides.details.length > 0) tabs.push('details')
    if (tabSlides.lifestyle.length > 0) tabs.push('lifestyle')
    return tabs
  }, [tabSlides])

  const [activeTab, setActiveTab] = useState<TabKey>(availableTabs[0] || 'product')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const currentSlides = tabSlides[activeTab] || []
  const currentSlide = currentSlides[selectedIndex]

  // Reset index when tab changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [activeTab])

  // Reset index when color changes (only affects product tab)
  useEffect(() => {
    if (activeTab === 'product') setSelectedIndex(0)
  }, [selectedColorIndex, activeTab])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!lightboxOpen) return
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowRight' && selectedIndex < currentSlides.length - 1)
        setSelectedIndex((i) => i + 1)
      if (e.key === 'ArrowLeft' && selectedIndex > 0) setSelectedIndex((i) => i - 1)
    },
    [lightboxOpen, selectedIndex, currentSlides.length],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [lightboxOpen])

  if (availableTabs.length === 0) {
    return (
      <div className="aspect-[4/3] rounded-[10px] bg-[#E8E0D4] flex items-center justify-center">
        <div className="text-center px-4">
          <p className="font-[family-name:var(--font-fraunces)] text-2xl text-[#1A1A2E]/60 font-medium">
            {brandName || 'Brand'}
          </p>
          <p className="font-[family-name:var(--font-fraunces)] text-lg text-[#1A1A2E]/40 mt-2">
            {productName}
          </p>
        </div>
      </div>
    )
  }

  const getImageSrc = (img: Media) => getMediaUrl(img.url, img.updatedAt)

  // Lifestyle tab uses object-cover + darker fallback background.
  // Product + details use object-contain + Canvas background.
  const isLifestyle = activeTab === 'lifestyle'
  const mainImageClass = isLifestyle ? 'object-cover' : 'object-contain'
  const frameBgClass = isLifestyle ? 'bg-[#E8E0D4]' : 'bg-[#FAFAF8]'

  return (
    <>
      <div className="space-y-3">
        {/* Color swatches */}
        {usableColors.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-[#7A7A8C] uppercase tracking-wide mr-1">
              Color:
            </span>
            <button
              type="button"
              onClick={() => setSelectedColorIndex(null)}
              className={cn(
                'text-xs font-medium px-2.5 py-1 rounded-full transition-colors',
                selectedColorIndex === null
                  ? 'bg-[#1A1A2E] text-white'
                  : 'bg-[#E8E0D4]/60 text-[#7A7A8C] hover:text-[#1A1A2E]',
              )}
            >
              All
            </button>
            {usableColors.map((c, i) => (
              <button
                key={`${c.colorName}-${i}`}
                type="button"
                onClick={() => setSelectedColorIndex(i)}
                className={cn(
                  'relative w-8 h-8 rounded-full border-2 transition-all',
                  selectedColorIndex === i
                    ? 'border-[#E85D3A] ring-2 ring-[#E85D3A]/20 ring-offset-2 ring-offset-[#FAFAF8] scale-110'
                    : 'border-[#7A7A8C]/20 hover:border-[#1A1A2E]/40',
                )}
                style={{ backgroundColor: c.colorHex || '#E8E0D4' }}
                aria-label={`Show ${c.colorName}`}
                title={c.colorName}
              />
            ))}
            {selectedColorIndex !== null && usableColors[selectedColorIndex] && (
              <span className="text-xs text-[#1A1A2E] font-medium ml-1">
                {usableColors[selectedColorIndex].colorName}
              </span>
            )}
          </div>
        )}

        {/* Tab bar */}
        {availableTabs.length > 1 && (
          <div className="flex gap-1 border-b border-[#7A7A8C]/15">
            {availableTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'relative px-4 py-2.5 text-sm font-medium transition-colors',
                  activeTab === tab
                    ? 'text-[#1A1A2E]'
                    : 'text-[#7A7A8C] hover:text-[#1A1A2E]',
                )}
              >
                {TAB_LABELS[tab]}
                <span className="ml-1.5 text-xs text-[#7A7A8C]">
                  {tabSlides[tab].length}
                </span>
                {activeTab === tab && (
                  <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#E85D3A]" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Main image */}
        {currentSlide && (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className={cn(
              'relative w-full aspect-[4/3] rounded-[10px] overflow-hidden cursor-zoom-in group border border-[#7A7A8C]/10',
              frameBgClass,
            )}
            aria-label={`View ${productName} fullscreen`}
          >
            <NextImage
              src={getImageSrc(currentSlide.image)}
              alt={currentSlide.caption || currentSlide.image.alt || productName}
              fill
              className={cn('transition-transform duration-300 group-hover:scale-[1.02]', mainImageClass)}
              sizes="(max-width: 768px) 100vw, 50vw"
              priority={activeTab === 'product'}
            />

            {/* Caption overlay for lifestyle + details */}
            {currentSlide.caption && activeTab !== 'product' && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent text-white text-xs px-4 py-3 text-left">
                {currentSlide.caption}
              </div>
            )}

            {/* Zoom hint */}
            <div className="absolute bottom-3 right-3 bg-[#1A1A2E]/70 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              Click to enlarge
            </div>

            {/* Image counter */}
            {currentSlides.length > 1 && (
              <div className="absolute top-3 right-3 bg-[#1A1A2E]/60 text-white text-xs font-medium px-2 py-1 rounded-md">
                {selectedIndex + 1} / {currentSlides.length}
              </div>
            )}

            {/* Tested badge overlay (product tab only) */}
            {testedBadge && activeTab === 'product' && (
              <span className="absolute top-3 left-3 bg-[#E85D3A] text-white text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm">
                Tested
              </span>
            )}

            {/* Overall score badge overlay (product tab only, hidden when counter shown top-right) */}
            {overallScore != null && activeTab === 'product' && currentSlides.length <= 1 && (
              <span className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-white text-[#1A1A2E] text-sm font-bold shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
                {overallScore}
              </span>
            )}
            {overallScore != null && activeTab === 'product' && currentSlides.length > 1 && (
              <span className="absolute top-14 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-white text-[#1A1A2E] text-sm font-bold shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
                {overallScore}
              </span>
            )}
          </button>
        )}

        {/* Thumbnail strip */}
        {currentSlides.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {currentSlides.map((slide, i) => (
              <button
                key={slide.image.id}
                type="button"
                onClick={() => setSelectedIndex(i)}
                className={cn(
                  'relative shrink-0 w-16 h-12 rounded-md overflow-hidden transition-all border-2',
                  isLifestyle ? 'bg-[#E8E0D4]' : 'bg-[#FAFAF8]',
                  i === selectedIndex
                    ? 'border-[#E85D3A]'
                    : 'border-[#E8E8EC] opacity-70 hover:opacity-100',
                )}
                aria-label={`View image ${i + 1}`}
              >
                <NextImage
                  src={getImageSrc(slide.image)}
                  alt={slide.caption || slide.image.alt || `${productName} image ${i + 1}`}
                  fill
                  className={isLifestyle ? 'object-cover' : 'object-contain'}
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && currentSlide && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10 p-2"
            aria-label="Close lightbox"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Prev/Next buttons */}
          {currentSlides.length > 1 && (
            <>
              {selectedIndex > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedIndex((i) => i - 1)
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 z-10"
                  aria-label="Previous image"
                >
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {selectedIndex < currentSlides.length - 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedIndex((i) => i + 1)
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 z-10"
                  aria-label="Next image"
                >
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </>
          )}

          {/* Lightbox image */}
          <div
            className="relative w-full h-full max-w-5xl max-h-[85vh] mx-8"
            onClick={(e) => e.stopPropagation()}
          >
            <NextImage
              src={getImageSrc(currentSlide.image)}
              alt={currentSlide.caption || currentSlide.image.alt || productName}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>

          {/* Caption + counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium text-center max-w-2xl px-4">
            {currentSlide.caption && (
              <p className="mb-1 text-white">{currentSlide.caption}</p>
            )}
            {currentSlides.length > 1 && (
              <p className="text-white/60 text-xs">
                {selectedIndex + 1} / {currentSlides.length}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

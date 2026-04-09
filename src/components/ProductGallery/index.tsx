'use client'

import React, { useState, useCallback, useEffect } from 'react'
import NextImage from 'next/image'
import { cn } from '@/utilities/ui'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import type { Media } from '@/payload-types'

interface ProductGalleryProps {
  images: Media[]
  brandName?: string
  productName: string
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  images,
  brandName,
  productName,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const currentImage = images[selectedIndex]

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (lightboxOpen) {
        if (e.key === 'Escape') setLightboxOpen(false)
        if (e.key === 'ArrowRight' && selectedIndex < images.length - 1)
          setSelectedIndex((i) => i + 1)
        if (e.key === 'ArrowLeft' && selectedIndex > 0)
          setSelectedIndex((i) => i - 1)
        return
      }
    },
    [lightboxOpen, selectedIndex, images.length],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Lock body scroll when lightbox is open
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

  if (images.length === 0) {
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

  return (
    <>
      <div className="space-y-3">
        {/* Main image */}
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="relative w-full aspect-[4/3] rounded-[10px] overflow-hidden bg-[#E8E0D4] cursor-zoom-in group"
          aria-label={`View ${productName} fullscreen`}
        >
          <NextImage
            src={getImageSrc(currentImage)}
            alt={currentImage.alt || productName}
            fill
            className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
          {/* Zoom hint */}
          <div className="absolute bottom-3 right-3 bg-[#1A1A2E]/60 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            Click to enlarge
          </div>
          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute top-3 right-3 bg-[#1A1A2E]/60 text-white text-xs font-medium px-2 py-1 rounded-md">
              {selectedIndex + 1} / {images.length}
            </div>
          )}
        </button>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setSelectedIndex(i)}
                className={cn(
                  'relative shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-[#E8E0D4] transition-all',
                  i === selectedIndex
                    ? 'ring-2 ring-[#E85D3A] ring-offset-2 ring-offset-[#FAFAF8]'
                    : 'opacity-60 hover:opacity-100',
                )}
                aria-label={`View image ${i + 1}`}
              >
                <NextImage
                  src={getImageSrc(img)}
                  alt={img.alt || `${productName} image ${i + 1}`}
                  fill
                  className="object-contain"
                  sizes="80px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
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
          {images.length > 1 && (
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
              {selectedIndex < images.length - 1 && (
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
              src={getImageSrc(currentImage)}
              alt={currentImage.alt || productName}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium">
              {selectedIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  )
}

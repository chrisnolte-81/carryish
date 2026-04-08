'use client'

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Media } from '@/components/Media'
import type { Media as MediaType } from '@/payload-types'

// ─── Types ───

type Product = {
  id: number
  name: string
  slug: string
  brand: string | null
  category: string
  price: number
  thumbnailImage: MediaType | null
  overallScore: number | null
  hillScore: number | null
  cargoScore: number | null
  rangeScore: number | null
  valueScore: number | null
  familyScore: number | null
  motorBrand: string | null
  motorPosition: string | null
  motorTorqueNm: number | null
  topSpeedMph: number | null
  bikeClass: string | null
  throttle: string | null
  batteryWh: number | null
  estimatedRealRangeMi: number | null
  batteryRemovable: boolean | null
  dualBatteryCapable: boolean | null
  weightLbs: number | null
  maxSystemWeightLbs: number | null
  cargoCapacityLbs: number | null
  foldable: boolean | null
  fitsInElevator: boolean | null
  drivetrainType: string | null
  gearType: string | null
  brakeType: string | null
  cargoLayout: string | null
  maxChildPassengers: number | null
  hasSeatbelts: boolean | null
  hasRainCover: boolean | null
  rainCoverAvailable: boolean | null
  integratedLights: boolean | null
  gpsTracking: boolean | null
  alarm: boolean | null
  suspensionType: string | null
  bestFor: string[]
  testingStatus: string | null
}

type Filters = {
  brand: string
  priceRange: string
  cargoLayout: string
  motorPosition: string
  bikeClass: string
  minRange: string
  minBattery: string
  maxWeight: string
  kids: string
  hasThrottle: boolean
  foldable: boolean
  fitsInElevator: boolean
  beltDrive: boolean
  gpsTracking: boolean
  suspension: boolean
  dualBattery: boolean
  removableBattery: boolean
  seatbelts: boolean
}

const defaultFilters: Filters = {
  brand: '',
  priceRange: '',
  cargoLayout: '',
  motorPosition: '',
  bikeClass: '',
  minRange: '',
  minBattery: '',
  maxWeight: '',
  kids: '',
  hasThrottle: false,
  foldable: false,
  fitsInElevator: false,
  beltDrive: false,
  gpsTracking: false,
  suspension: false,
  dualBattery: false,
  removableBattery: false,
  seatbelts: false,
}

// ─── Constants ───

const priceRanges = [
  { label: 'Under $2K', min: 0, max: 2000 },
  { label: '$2K–$4K', min: 2000, max: 4000 },
  { label: '$4K–$6K', min: 4000, max: 6000 },
  { label: '$6K+', min: 6000, max: Infinity },
]

const sortOptions = [
  { label: 'Top rated', value: 'score-desc', icon: '★' },
  { label: 'Price: Low → High', value: 'price-asc', icon: '↑' },
  { label: 'Price: High → Low', value: 'price-desc', icon: '↓' },
  { label: 'Best value', value: 'value-desc', icon: '◆' },
  { label: 'Best for hills', value: 'hill-desc', icon: '⛰' },
  { label: 'Lightest', value: 'weight-asc', icon: '⚖' },
  { label: 'Longest range', value: 'range-desc', icon: '🔋' },
  { label: 'Name A–Z', value: 'name-asc', icon: 'A' },
]

const cargoLayoutOptions = [
  { value: 'longtail', label: 'Longtail', desc: 'Kids sit behind you' },
  { value: 'front-box', label: 'Front-box', desc: 'Cargo up front' },
  { value: 'compact', label: 'Compact', desc: 'Normal-bike size' },
  { value: 'midtail', label: 'Midtail', desc: 'Between compact & long' },
]

const motorOptions = [
  { value: 'mid-drive', label: 'Mid-drive', desc: 'Best for hills' },
  { value: 'hub-rear', label: 'Hub motor', desc: 'Simpler, cheaper' },
]

const classOptions = [
  { value: 'class-1', label: 'Class 1', desc: '20 mph, no throttle' },
  { value: 'class-2', label: 'Class 2', desc: '20 mph + throttle' },
  { value: 'class-3', label: 'Class 3', desc: '28 mph' },
]

const kidsOptions = [
  { value: '1', label: '1 kid' },
  { value: '2', label: '2+ kids' },
]

// ─── Component ───

export function BikesClient({
  products,
  brands,
}: {
  products: Product[]
  brands: string[]
}) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [filters, setFilters] = useState<Filters>(() => ({
    ...defaultFilters,
    brand: searchParams.get('brand') || '',
    priceRange: searchParams.get('price') || '',
    cargoLayout: searchParams.get('layout') || '',
  }))
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'score-desc')
  const [showModal, setShowModal] = useState(false)
  const [compareList, setCompareList] = useState<string[]>([])
  const modalRef = useRef<HTMLDivElement>(null)

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.brand) count++
    if (filters.priceRange) count++
    if (filters.cargoLayout) count++
    if (filters.motorPosition) count++
    if (filters.bikeClass) count++
    if (filters.minRange) count++
    if (filters.minBattery) count++
    if (filters.maxWeight) count++
    if (filters.kids) count++
    if (filters.hasThrottle) count++
    if (filters.foldable) count++
    if (filters.fitsInElevator) count++
    if (filters.beltDrive) count++
    if (filters.gpsTracking) count++
    if (filters.suspension) count++
    if (filters.dualBattery) count++
    if (filters.removableBattery) count++
    if (filters.seatbelts) count++
    return count
  }, [filters])

  const updateFilter = useCallback((key: keyof Filters, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const togglePill = useCallback((key: keyof Filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? '' : value,
    }))
  }, [])

  const clearAll = useCallback(() => {
    setFilters(defaultFilters)
    setSortBy('score-desc')
    router.replace('/bikes', { scroll: false })
  }, [router])

  const toggleCompare = useCallback((slug: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCompareList((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug)
      if (prev.length >= 3) return prev
      return [...prev, slug]
    })
  }, [])

  // Close modal on outside click
  useEffect(() => {
    if (!showModal) return
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowModal(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [showModal])

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.brand) params.set('brand', filters.brand)
    if (filters.priceRange) params.set('price', filters.priceRange)
    if (filters.cargoLayout) params.set('layout', filters.cargoLayout)
    if (sortBy !== 'score-desc') params.set('sort', sortBy)
    const qs = params.toString()
    router.replace(qs ? `/bikes?${qs}` : '/bikes', { scroll: false })
  }, [filters.brand, filters.priceRange, filters.cargoLayout, sortBy, router])

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...products]

    if (filters.brand) result = result.filter((p) => p.brand === filters.brand)

    if (filters.priceRange) {
      const range = priceRanges.find((r) => r.label === filters.priceRange)
      if (range) result = result.filter((p) => p.price >= range.min && p.price < range.max)
    }

    if (filters.cargoLayout) result = result.filter((p) => p.cargoLayout === filters.cargoLayout)
    if (filters.motorPosition) result = result.filter((p) => p.motorPosition === filters.motorPosition)
    if (filters.bikeClass) result = result.filter((p) => p.bikeClass === filters.bikeClass)

    if (filters.minRange) {
      const min = parseInt(filters.minRange)
      result = result.filter((p) => (p.estimatedRealRangeMi ?? 0) >= min)
    }
    if (filters.minBattery) {
      const min = parseInt(filters.minBattery)
      result = result.filter((p) => (p.batteryWh ?? 0) >= min)
    }
    if (filters.maxWeight) {
      const max = parseInt(filters.maxWeight)
      result = result.filter((p) => (p.weightLbs ?? 999) <= max)
    }
    if (filters.kids) {
      const min = parseInt(filters.kids)
      result = result.filter((p) => (p.maxChildPassengers ?? 0) >= min)
    }

    if (filters.hasThrottle) result = result.filter((p) => p.throttle && p.throttle !== 'none')
    if (filters.foldable) result = result.filter((p) => p.foldable)
    if (filters.fitsInElevator) result = result.filter((p) => p.fitsInElevator)
    if (filters.beltDrive) result = result.filter((p) => p.drivetrainType === 'belt')
    if (filters.gpsTracking) result = result.filter((p) => p.gpsTracking)
    if (filters.suspension) result = result.filter((p) => p.suspensionType && p.suspensionType !== 'rigid')
    if (filters.dualBattery) result = result.filter((p) => p.dualBatteryCapable)
    if (filters.removableBattery) result = result.filter((p) => p.batteryRemovable)
    if (filters.seatbelts) result = result.filter((p) => p.hasSeatbelts)

    // Sort
    switch (sortBy) {
      case 'score-desc':
        result.sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))
        break
      case 'price-asc':
        result.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        result.sort((a, b) => b.price - a.price)
        break
      case 'value-desc':
        result.sort((a, b) => (b.valueScore ?? 0) - (a.valueScore ?? 0))
        break
      case 'hill-desc':
        result.sort((a, b) => (b.hillScore ?? 0) - (a.hillScore ?? 0))
        break
      case 'weight-asc':
        result.sort((a, b) => (a.weightLbs ?? 999) - (b.weightLbs ?? 999))
        break
      case 'range-desc':
        result.sort((a, b) => (b.estimatedRealRangeMi ?? 0) - (a.estimatedRealRangeMi ?? 0))
        break
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
    }

    return result
  }, [products, filters, sortBy])

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = []
    if (filters.brand) chips.push({ label: filters.brand, onRemove: () => updateFilter('brand', '') })
    if (filters.priceRange) chips.push({ label: filters.priceRange, onRemove: () => updateFilter('priceRange', '') })
    if (filters.cargoLayout) {
      const opt = cargoLayoutOptions.find((o) => o.value === filters.cargoLayout)
      chips.push({ label: opt?.label || filters.cargoLayout, onRemove: () => updateFilter('cargoLayout', '') })
    }
    if (filters.motorPosition) {
      const opt = motorOptions.find((o) => o.value === filters.motorPosition)
      chips.push({ label: opt?.label || filters.motorPosition, onRemove: () => updateFilter('motorPosition', '') })
    }
    if (filters.bikeClass) {
      const opt = classOptions.find((o) => o.value === filters.bikeClass)
      chips.push({ label: opt?.label || filters.bikeClass, onRemove: () => updateFilter('bikeClass', '') })
    }
    if (filters.minRange) chips.push({ label: `${filters.minRange}+ mi range`, onRemove: () => updateFilter('minRange', '') })
    if (filters.minBattery) chips.push({ label: `${filters.minBattery}+ Wh`, onRemove: () => updateFilter('minBattery', '') })
    if (filters.maxWeight) chips.push({ label: `Under ${filters.maxWeight} lbs`, onRemove: () => updateFilter('maxWeight', '') })
    if (filters.kids) chips.push({ label: `${filters.kids}+ kids`, onRemove: () => updateFilter('kids', '') })
    if (filters.hasThrottle) chips.push({ label: 'Throttle', onRemove: () => updateFilter('hasThrottle', false) })
    if (filters.foldable) chips.push({ label: 'Foldable', onRemove: () => updateFilter('foldable', false) })
    if (filters.fitsInElevator) chips.push({ label: 'Fits in elevator', onRemove: () => updateFilter('fitsInElevator', false) })
    if (filters.beltDrive) chips.push({ label: 'Belt drive', onRemove: () => updateFilter('beltDrive', false) })
    if (filters.gpsTracking) chips.push({ label: 'GPS tracking', onRemove: () => updateFilter('gpsTracking', false) })
    if (filters.suspension) chips.push({ label: 'Suspension', onRemove: () => updateFilter('suspension', false) })
    if (filters.dualBattery) chips.push({ label: 'Dual battery', onRemove: () => updateFilter('dualBattery', false) })
    if (filters.removableBattery) chips.push({ label: 'Removable battery', onRemove: () => updateFilter('removableBattery', false) })
    if (filters.seatbelts) chips.push({ label: 'Seatbelts', onRemove: () => updateFilter('seatbelts', false) })
    return chips
  }, [filters, updateFilter])

  return (
    <div className="bg-[#FAFAF8] min-h-screen">
      <div className="container py-20 sm:py-24">
        {/* ─── Header ─── */}
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-[#1A1A2E] tracking-tight">
            Bikes & Gear
          </h1>
          <p className="mt-3 text-[#7A7A8C] text-lg max-w-2xl">
            {products.length} cargo bikes from {brands.length} brands. Every one reviewed with honest tradeoffs.
          </p>
        </div>

        {/* ─── Quick Filter Pills ─── */}
        <div className="flex flex-wrap gap-2 items-center mb-4">
          {/* Price pills */}
          {priceRanges.map((range) => (
            <button
              key={range.label}
              onClick={() => togglePill('priceRange', range.label)}
              className={`text-sm px-4 py-2 rounded-full border transition-all duration-150 cursor-pointer ${
                filters.priceRange === range.label
                  ? 'bg-[#1A1A2E] text-white border-[#1A1A2E] shadow-sm'
                  : 'bg-white text-[#1A1A2E] border-[#7A7A8C]/20 hover:border-[#1A1A2E]/40 hover:shadow-sm'
              }`}
            >
              {range.label}
            </button>
          ))}

          <div className="w-px h-6 bg-[#7A7A8C]/15 mx-1" />

          {/* Layout pills */}
          {cargoLayoutOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => togglePill('cargoLayout', opt.value)}
              className={`text-sm px-4 py-2 rounded-full border transition-all duration-150 cursor-pointer ${
                filters.cargoLayout === opt.value
                  ? 'bg-[#1A1A2E] text-white border-[#1A1A2E] shadow-sm'
                  : 'bg-white text-[#1A1A2E] border-[#7A7A8C]/20 hover:border-[#1A1A2E]/40 hover:shadow-sm'
              }`}
            >
              {opt.label}
            </button>
          ))}

          <div className="w-px h-6 bg-[#7A7A8C]/15 mx-1" />

          {/* More Filters button */}
          <button
            onClick={() => setShowModal(true)}
            className="text-sm px-4 py-2 rounded-full border border-[#7A7A8C]/20 bg-white text-[#1A1A2E] hover:border-[#1A1A2E]/40 hover:shadow-sm transition-all duration-150 cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            More filters
            {activeFilterCount > 0 && (
              <span className="ml-1 w-5 h-5 flex items-center justify-center bg-[#E85D3A] text-white text-xs font-bold rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* ─── Sort + Result count ─── */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#1A1A2E]/[0.06]">
          <span className="text-sm text-[#7A7A8C] tabular-nums">
            {filtered.length === products.length
              ? `${filtered.length} ${filtered.length === 1 ? 'bike' : 'bikes'}`
              : `${filtered.length} of ${products.length} bikes`}
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm bg-transparent text-[#7A7A8C] outline-none cursor-pointer hover:text-[#1A1A2E] transition-colors border-none pr-1"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.icon} {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* ─── Active Filter Chips ─── */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {activeChips.map((chip) => (
              <button
                key={chip.label}
                onClick={chip.onRemove}
                className="group flex items-center gap-1.5 text-sm px-3 py-1.5 bg-[#E85D3A]/8 text-[#E85D3A] border border-[#E85D3A]/20 rounded-full hover:bg-[#E85D3A]/15 transition-colors cursor-pointer"
              >
                {chip.label}
                <svg className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ))}
            <button
              onClick={clearAll}
              className="text-sm text-[#7A7A8C] hover:text-[#1A1A2E] transition-colors cursor-pointer bg-transparent border-none underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ─── Product Grid ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {filtered.map((product) => {
            const specs = [
              product.motorTorqueNm && `${product.motorTorqueNm}Nm`,
              product.estimatedRealRangeMi && `~${product.estimatedRealRangeMi}mi`,
              product.weightLbs && `${product.weightLbs}lbs`,
              product.maxChildPassengers != null && product.maxChildPassengers > 0 &&
                `${product.maxChildPassengers} ${product.maxChildPassengers === 1 ? 'kid' : 'kids'}`,
            ].filter(Boolean) as string[]

            const layoutLabel = product.cargoLayout
              ? cargoLayoutOptions.find((o) => o.value === product.cargoLayout)?.label
              : null

            return (
              <Link
                key={product.id}
                href={`/bikes/${product.slug}`}
                className="group relative flex flex-col bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300 no-underline"
              >
                {/* Image area */}
                <div className="relative aspect-[4/3] w-full bg-[#F3F1EE] overflow-hidden">
                  {product.thumbnailImage ? (
                    <Media resource={product.thumbnailImage} imgClassName="object-cover w-full h-full group-hover:scale-[1.03] transition-transform duration-500" fill />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#F5F3F0] to-[#EBE8E4]">
                      <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center mb-3 shadow-sm">
                        <svg className="w-7 h-7 text-[#7A7A8C]/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-[#7A7A8C]/60 tracking-wide uppercase">
                        Photo coming soon
                      </span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {product.testingStatus === 'tested' && (
                      <span className="bg-[#E85D3A] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm">
                        Tested
                      </span>
                    )}
                  </div>

                  {/* Score badge */}
                  {product.overallScore && (
                    <div className="absolute top-3 right-3 w-10 h-10 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                      <span className="text-sm font-bold text-[#1A1A2E]">{product.overallScore}</span>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="flex flex-col flex-1 p-5">
                  {/* Brand + layout */}
                  <div className="flex items-center gap-2 mb-1">
                    {product.brand && (
                      <span className="text-[11px] font-semibold text-[#7A7A8C] uppercase tracking-wider">
                        {product.brand}
                      </span>
                    )}
                    {product.brand && layoutLabel && (
                      <span className="text-[#7A7A8C]/30">|</span>
                    )}
                    {layoutLabel && (
                      <span className="text-[11px] text-[#7A7A8C]/70 tracking-wide">
                        {layoutLabel}
                      </span>
                    )}
                  </div>

                  {/* Name + price */}
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-[family-name:var(--font-fraunces)] text-[1.05rem] font-semibold text-[#1A1A2E] leading-snug group-hover:text-[#E85D3A] transition-colors">
                      {product.name}
                    </h3>
                    {product.price > 0 && (
                      <span className="text-[15px] font-bold text-[#1A1A2E] shrink-0 tabular-nums">
                        ${product.price.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Specs */}
                  {specs.length > 0 && (
                    <p className="mt-2.5 text-xs text-[#7A7A8C]">
                      {specs.join(' \u00B7 ')}
                    </p>
                  )}

                  {/* Best-for tags */}
                  {product.bestFor.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-auto pt-3">
                      {product.bestFor.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] font-medium bg-[#1A1A2E]/[0.04] text-[#1A1A2E]/60 px-2.5 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Compare — bottom-right, visible on hover or when active */}
                <button
                  onClick={(e) => toggleCompare(product.slug, e)}
                  className={`absolute bottom-4 right-4 text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer ${
                    compareList.includes(product.slug)
                      ? 'bg-[#3A8FE8] text-white border-[#3A8FE8] opacity-100'
                      : 'bg-white/90 backdrop-blur-sm text-[#7A7A8C] border-[#7A7A8C]/15 opacity-0 group-hover:opacity-100 hover:border-[#3A8FE8] hover:text-[#3A8FE8]'
                  }`}
                >
                  {compareList.includes(product.slug) ? '✓ Comparing' : '+ Compare'}
                </button>
              </Link>
            )
          })}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-[#1A1A2E]/5 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#7A7A8C]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <p className="text-[#1A1A2E] text-lg font-medium">No bikes match your filters</p>
            <p className="text-[#7A7A8C] mt-2">Try removing some filters to see more options.</p>
            <button
              onClick={clearAll}
              className="mt-4 text-sm font-medium text-[#E85D3A] hover:text-[#d14e2d] cursor-pointer bg-transparent border-none"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* ─── Floating Compare Bar ─── */}
      {compareList.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1A1A2E] text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 animate-[slideUp_0.3s_ease-out]">
          <span className="text-sm font-medium">
            {compareList.length} bikes selected
          </span>
          <Link
            href={`/bikes/compare?ids=${compareList.join(',')}`}
            className="text-sm font-semibold bg-[#E85D3A] px-5 py-2 rounded-xl hover:bg-[#d14e2d] transition-colors no-underline text-white"
          >
            Compare Now
          </Link>
          <button
            onClick={() => setCompareList([])}
            className="text-sm text-white/50 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
          >
            Clear
          </button>
        </div>
      )}

      {/* ─── More Filters Modal ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal panel */}
          <div
            ref={modalRef}
            className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl animate-[slideUp_0.3s_ease-out]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#7A7A8C]/10 shrink-0">
              <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#1A1A2E]">
                Filters
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#1A1A2E]/5 transition-colors cursor-pointer bg-transparent border-none"
              >
                <svg className="w-5 h-5 text-[#1A1A2E]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto px-6 py-5 space-y-8 flex-1">

              {/* Brand */}
              <FilterSection title="Brand">
                <div className="flex flex-wrap gap-2">
                  {brands.sort().map((b) => (
                    <button
                      key={b}
                      onClick={() => togglePill('brand', b)}
                      className={`text-sm px-3.5 py-2 rounded-lg border transition-all duration-150 cursor-pointer ${
                        filters.brand === b
                          ? 'bg-[#1A1A2E] text-white border-[#1A1A2E]'
                          : 'bg-white text-[#1A1A2E] border-[#7A7A8C]/20 hover:border-[#1A1A2E]/40'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </FilterSection>

              {/* Cargo Layout */}
              <FilterSection title="Bike style">
                <div className="grid grid-cols-2 gap-3">
                  {cargoLayoutOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => togglePill('cargoLayout', opt.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-150 cursor-pointer ${
                        filters.cargoLayout === opt.value
                          ? 'border-[#1A1A2E] bg-[#1A1A2E]/3'
                          : 'border-[#7A7A8C]/15 bg-white hover:border-[#7A7A8C]/30'
                      }`}
                    >
                      <p className="font-medium text-sm text-[#1A1A2E]">{opt.label}</p>
                      <p className="text-xs text-[#7A7A8C] mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </FilterSection>

              {/* Motor */}
              <FilterSection title="Motor type">
                <div className="grid grid-cols-2 gap-3">
                  {motorOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => togglePill('motorPosition', opt.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-150 cursor-pointer ${
                        filters.motorPosition === opt.value
                          ? 'border-[#1A1A2E] bg-[#1A1A2E]/3'
                          : 'border-[#7A7A8C]/15 bg-white hover:border-[#7A7A8C]/30'
                      }`}
                    >
                      <p className="font-medium text-sm text-[#1A1A2E]">{opt.label}</p>
                      <p className="text-xs text-[#7A7A8C] mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </FilterSection>

              {/* Bike class */}
              <FilterSection title="Speed class">
                <div className="grid grid-cols-3 gap-3">
                  {classOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => togglePill('bikeClass', opt.value)}
                      className={`p-3 rounded-xl border-2 text-center transition-all duration-150 cursor-pointer ${
                        filters.bikeClass === opt.value
                          ? 'border-[#1A1A2E] bg-[#1A1A2E]/3'
                          : 'border-[#7A7A8C]/15 bg-white hover:border-[#7A7A8C]/30'
                      }`}
                    >
                      <p className="font-semibold text-sm text-[#1A1A2E]">{opt.label}</p>
                      <p className="text-[10px] text-[#7A7A8C] mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </FilterSection>

              {/* Kids */}
              <FilterSection title="Passengers">
                <div className="flex gap-3">
                  {kidsOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => togglePill('kids', opt.value)}
                      className={`text-sm px-4 py-2.5 rounded-xl border-2 transition-all duration-150 cursor-pointer ${
                        filters.kids === opt.value
                          ? 'border-[#1A1A2E] bg-[#1A1A2E]/3'
                          : 'border-[#7A7A8C]/15 bg-white hover:border-[#7A7A8C]/30'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </FilterSection>

              {/* Range sliders */}
              <FilterSection title="Range & Battery">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#7A7A8C] block mb-1.5">Min range (miles)</label>
                    <select
                      value={filters.minRange}
                      onChange={(e) => updateFilter('minRange', e.target.value)}
                      className="w-full text-sm bg-white border border-[#7A7A8C]/20 rounded-lg px-3 py-2 text-[#1A1A2E] outline-none focus:border-[#3A8FE8] transition-colors cursor-pointer"
                    >
                      <option value="">Any</option>
                      <option value="20">20+ miles</option>
                      <option value="30">30+ miles</option>
                      <option value="40">40+ miles</option>
                      <option value="50">50+ miles</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#7A7A8C] block mb-1.5">Min battery (Wh)</label>
                    <select
                      value={filters.minBattery}
                      onChange={(e) => updateFilter('minBattery', e.target.value)}
                      className="w-full text-sm bg-white border border-[#7A7A8C]/20 rounded-lg px-3 py-2 text-[#1A1A2E] outline-none focus:border-[#3A8FE8] transition-colors cursor-pointer"
                    >
                      <option value="">Any</option>
                      <option value="400">400+ Wh</option>
                      <option value="500">500+ Wh</option>
                      <option value="700">700+ Wh</option>
                      <option value="900">900+ Wh</option>
                    </select>
                  </div>
                </div>
              </FilterSection>

              {/* Weight */}
              <FilterSection title="Size & Storage">
                <div className="mb-4">
                  <label className="text-xs text-[#7A7A8C] block mb-1.5">Max weight (lbs)</label>
                  <select
                    value={filters.maxWeight}
                    onChange={(e) => updateFilter('maxWeight', e.target.value)}
                    className="w-full text-sm bg-white border border-[#7A7A8C]/20 rounded-lg px-3 py-2 text-[#1A1A2E] outline-none focus:border-[#3A8FE8] transition-colors cursor-pointer"
                  >
                    <option value="">Any weight</option>
                    <option value="60">Under 60 lbs</option>
                    <option value="70">Under 70 lbs</option>
                    <option value="80">Under 80 lbs</option>
                    <option value="90">Under 90 lbs</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-3">
                  <ToggleChip
                    label="Foldable"
                    active={filters.foldable}
                    onClick={() => updateFilter('foldable', !filters.foldable)}
                  />
                  <ToggleChip
                    label="Fits in elevator"
                    active={filters.fitsInElevator}
                    onClick={() => updateFilter('fitsInElevator', !filters.fitsInElevator)}
                  />
                </div>
              </FilterSection>

              {/* Features */}
              <FilterSection title="Features">
                <div className="flex flex-wrap gap-3">
                  <ToggleChip label="Throttle" active={filters.hasThrottle} onClick={() => updateFilter('hasThrottle', !filters.hasThrottle)} />
                  <ToggleChip label="Belt drive" active={filters.beltDrive} onClick={() => updateFilter('beltDrive', !filters.beltDrive)} />
                  <ToggleChip label="GPS tracking" active={filters.gpsTracking} onClick={() => updateFilter('gpsTracking', !filters.gpsTracking)} />
                  <ToggleChip label="Suspension" active={filters.suspension} onClick={() => updateFilter('suspension', !filters.suspension)} />
                  <ToggleChip label="Dual battery" active={filters.dualBattery} onClick={() => updateFilter('dualBattery', !filters.dualBattery)} />
                  <ToggleChip label="Removable battery" active={filters.removableBattery} onClick={() => updateFilter('removableBattery', !filters.removableBattery)} />
                  <ToggleChip label="Seatbelts" active={filters.seatbelts} onClick={() => updateFilter('seatbelts', !filters.seatbelts)} />
                </div>
              </FilterSection>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#7A7A8C]/10 shrink-0">
              <button
                onClick={clearAll}
                className="text-sm text-[#1A1A2E] underline underline-offset-2 hover:text-[#E85D3A] transition-colors cursor-pointer bg-transparent border-none"
              >
                Clear all
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 bg-[#1A1A2E] text-white text-sm font-semibold rounded-xl hover:bg-[#2A2A3E] transition-colors cursor-pointer border-none"
              >
                Show {filtered.length} {filtered.length === 1 ? 'bike' : 'bikes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#1A1A2E] mb-3">{title}</h3>
      {children}
    </div>
  )
}

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm px-4 py-2 rounded-full border transition-all duration-150 cursor-pointer ${
        active
          ? 'bg-[#1A1A2E] text-white border-[#1A1A2E]'
          : 'bg-white text-[#1A1A2E] border-[#7A7A8C]/20 hover:border-[#1A1A2E]/40'
      }`}
    >
      {active && (
        <svg className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
      {label}
    </button>
  )
}

'use client'

import React, { createContext, useContext, useState } from 'react'
import { cn } from '@/utilities/ui'

export interface ColorSwatchOption {
  colorName: string
  colorHex?: string | null
}

interface ColorSyncContextValue {
  selectedColorIndex: number | null
  setSelectedColorIndex: (i: number | null) => void
}

const ColorSyncContext = createContext<ColorSyncContextValue | null>(null)

export function useColorSync(): ColorSyncContextValue {
  const ctx = useContext(ColorSyncContext)
  if (!ctx) {
    // Soft fallback so ProductGallery can render outside a provider (e.g. isolated use).
    return { selectedColorIndex: null, setSelectedColorIndex: () => {} }
  }
  return ctx
}

export const ColorSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null)
  return (
    <ColorSyncContext.Provider value={{ selectedColorIndex, setSelectedColorIndex }}>
      {children}
    </ColorSyncContext.Provider>
  )
}

interface ColorSwatchesProps {
  colorOptions: ColorSwatchOption[]
}

export const ColorSwatches: React.FC<ColorSwatchesProps> = ({ colorOptions }) => {
  const { selectedColorIndex, setSelectedColorIndex } = useColorSync()
  const usable = colorOptions.filter(
    (c) => typeof c.colorHex === 'string' && c.colorHex.length > 0,
  )
  if (usable.length === 0) return null
  const active = selectedColorIndex !== null ? usable[selectedColorIndex] : null
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A8C]">
          Color
        </span>
        {active && (
          <span className="text-xs font-medium text-[#1A1A2E]">{active.colorName}</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {usable.map((c, i) => {
          const isActive = selectedColorIndex === i
          return (
            <button
              key={`${c.colorName}-${i}`}
              type="button"
              onClick={() => setSelectedColorIndex(isActive ? null : i)}
              className={cn(
                'relative w-6 h-6 rounded-full transition-all',
                isActive
                  ? 'ring-2 ring-[#E85D3A] ring-offset-2 ring-offset-[#FAFAF8]'
                  : 'ring-1 ring-[#7A7A8C]/25 hover:ring-[#1A1A2E]/50',
              )}
              style={{ backgroundColor: c.colorHex || '#E8E0D4' }}
              aria-label={`Show ${c.colorName}`}
              aria-pressed={isActive}
              title={c.colorName}
            />
          )
        })}
      </div>
    </div>
  )
}

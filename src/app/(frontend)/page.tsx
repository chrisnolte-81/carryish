import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

export default function HomePage() {
  return (
    <main className="flex-1 flex items-center justify-center bg-[#FAFAF8]">
      <div className="container max-w-3xl text-center py-24 px-4">
        <h1 className="font-[family-name:var(--font-fraunces)] text-5xl sm:text-6xl md:text-7xl font-semibold text-[#1A1A2E] tracking-tight leading-tight">
          Find your perfect ride.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-[#7A7A8C] max-w-xl mx-auto leading-relaxed">
          AI-powered recommendations for cargo bikes, strollers, and everything that carries your
          life.
        </p>
        <div className="mt-10">
          <Link
            href="/bikes"
            className="inline-block px-8 py-4 bg-[#E85D3A] text-white text-lg font-medium rounded-lg hover:opacity-90 transition-opacity no-underline"
          >
            Browse Bikes
          </Link>
        </div>
      </div>
    </main>
  )
}

export const metadata: Metadata = {
  title: 'Carryish — Find your perfect ride',
  description:
    'AI-powered recommendations for cargo bikes, strollers, and everything that carries your life.',
}

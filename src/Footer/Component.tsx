import Link from 'next/link'
import React from 'react'

import { Logo } from '@/components/Logo/Logo'
import { NewsletterForm } from './NewsletterForm'

export async function Footer() {
  return (
    <footer className="mt-auto bg-[#1A1A2E]">
      <div className="container py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8">
          {/* Brand column */}
          <div>
            <Link href="/" className="no-underline">
              <Logo invert />
            </Link>
            <p className="text-[#FAFAF8]/50 text-sm mt-3 leading-relaxed max-w-xs">
              Independent cargo bike reviews and recommendations. We earn affiliate commissions.
              It doesn&apos;t change what we recommend.
            </p>
          </div>

          {/* Links column */}
          <div>
            <h4 className="font-[family-name:var(--font-fraunces)] text-[#FAFAF8]/80 text-sm font-semibold uppercase tracking-wider mb-4">
              Explore
            </h4>
            <nav className="flex flex-col gap-2.5">
              <Link href="/bikes" className="text-sm text-[#FAFAF8]/50 hover:text-[#FAFAF8] transition-colors no-underline">
                Bikes
              </Link>
              <Link href="/posts" className="text-sm text-[#FAFAF8]/50 hover:text-[#FAFAF8] transition-colors no-underline">
                Blog
              </Link>
              <Link href="/about" className="text-sm text-[#FAFAF8]/50 hover:text-[#FAFAF8] transition-colors no-underline">
                About
              </Link>
            </nav>
          </div>

          {/* Newsletter column */}
          <div>
            <h4 className="font-[family-name:var(--font-fraunces)] text-[#FAFAF8]/80 text-sm font-semibold uppercase tracking-wider mb-4">
              Stay in the loop
            </h4>
            <p className="text-sm text-[#FAFAF8]/50 mb-3">
              New reviews, gear picks, and the occasional hot take. No spam.
            </p>
            <NewsletterForm />
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[#FAFAF8]/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#FAFAF8]/40">
            &copy; {new Date().getFullYear()} Carryish. All rights reserved.
          </p>
          <p className="text-xs text-[#FAFAF8]/40">
            Built in Brooklyn.
          </p>
        </div>
      </div>
    </footer>
  )
}

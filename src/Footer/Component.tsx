import Link from 'next/link'
import React from 'react'

import { Logo } from '@/components/Logo/Logo'

export async function Footer() {
  return (
    <footer className="mt-auto bg-[#1A1A2E]">
      <div className="container py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <Link href="/" className="no-underline">
          <Logo invert />
        </Link>
        <p className="text-sm text-[#FAFAF8]/60">
          &copy; {new Date().getFullYear()} Carryish. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

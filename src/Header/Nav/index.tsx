'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import type { Header as HeaderType } from '@/payload-types'

export const HeaderNav: React.FC<{ data: HeaderType }> = () => {
  const pathname = usePathname()

  const links = [
    { href: '/bikes', label: 'Bikes' },
    { href: '/brands', label: 'Brands' },
    { href: '/posts', label: 'Blog' },
    { href: '/about', label: 'About' },
  ]

  return (
    <nav className="flex gap-5 items-center">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`text-sm font-medium no-underline transition-colors ${
            pathname?.startsWith(href)
              ? 'text-[#E85D3A]'
              : 'text-[#1A1A2E] hover:text-[#E85D3A]'
          }`}
        >
          {label}
        </Link>
      ))}
      <Link
        href="/quiz"
        className="text-sm font-medium no-underline px-4 py-2 bg-[#E85D3A] text-white rounded-lg hover:bg-[#d14e2d] transition-colors"
      >
        Find Your Bike
      </Link>
    </nav>
  )
}

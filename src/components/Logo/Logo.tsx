import React from 'react'
import clsx from 'clsx'

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
  invert?: boolean
}

export const Logo = (props: Props) => {
  const { className, invert } = props

  return (
    <span
      className={clsx(
        'font-[family-name:var(--font-fraunces)] text-2xl font-semibold tracking-tight select-none',
        className,
      )}
    >
      <span className={invert ? 'text-white' : 'text-[#1A1A2E]'}>carry</span>
      <span className="text-[#E85D3A]">ish</span>
    </span>
  )
}

import type { Metadata } from 'next'
import React from 'react'

export default function AboutPage() {
  return (
    <main className="bg-[#FAFAF8] min-h-screen">
      <div className="container max-w-3xl py-20 sm:py-28">
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-[#1A1A2E] tracking-tight leading-[1.15]">
          Cargo bikes are confusing.
          <br />
          We make it simple.
        </h1>

        <div className="mt-10 space-y-6 text-[#1A1A2E] text-[1.05rem] leading-[1.7]">
          <p>
            We&apos;re an independent, editorially driven platform. We test and research cargo bikes,
            strollers, trailers, and wagons so you don&apos;t have to.
          </p>

          <p>
            The cargo bike market has exploded. Dozens of brands, hundreds of models, specs that
            mean nothing without context. Most review sites regurgitate press releases. We don&apos;t.
          </p>

          <p>
            We ride the bikes. We name our biases instead of hiding them. When we prefer mid-drive
            motors over hub motors for hills, we tell you why. When a $1,500 bike gets surprisingly
            close to a $5,000 one, we say that too.
          </p>

          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E] pt-4">
            How we make money
          </h2>

          <p>
            We earn affiliate commissions when you buy through our links. It doesn&apos;t change what
            we recommend. We also connect riders with local dealers for test rides. That&apos;s it. No
            sponsored reviews, no pay-to-play rankings.
          </p>

          <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1A1A2E] pt-4">
            Who we are
          </h2>

          <p>
            Founded by people with 15+ years in the e-bike industry. We&apos;ve sold thousands of
            bikes, answered thousands of questions, and watched families go from skeptical to
            car-free. That experience shapes every recommendation.
          </p>

          <p>
            Carryish is an independent brand. We&apos;re not owned by a bike company, funded by a
            manufacturer, or beholden to any advertiser. Our opinions are ours.
          </p>

          <div className="bg-[#FAFAF8] border-l-[3px] border-[#E85D3A] pl-8 py-4 mt-8">
            <p className="text-[#7A7A8C] text-sm leading-relaxed">
              Full disclosure: if you buy through our links, we earn a small commission. It
              doesn&apos;t change what we recommend. We name our biases instead of hiding them.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

export const metadata: Metadata = {
  title: 'About | Carryish',
  description:
    'Independent cargo bike reviews and recommendations backed by 15+ years of e-bike expertise.',
}

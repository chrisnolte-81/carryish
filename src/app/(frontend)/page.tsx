import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

export default function HomePage() {
  return (
    <main className="flex-1 bg-[#FAFAF8]">
      {/* Hero */}
      <section className="py-24 sm:py-32 lg:py-40">
        <div className="container max-w-4xl">
          <h1 className="font-[family-name:var(--font-fraunces)] text-[2.75rem] sm:text-[3.5rem] lg:text-[4rem] font-semibold text-[#1A1A2E] tracking-tight leading-[1.1]">
            Cargo bikes are confusing.
            <br />
            <span className="text-[#7A7A8C]">We make it simple.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-[#7A7A8C] max-w-2xl leading-relaxed">
            Independent, opinionated recommendations for cargo bikes, strollers, and everything that
            carries your life. No press releases. No brand loyalty. Just honest picks backed by
            15+ years of e-bike expertise.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 items-center">
            <Link
              href="/bikes"
              className="inline-block px-8 py-4 bg-[#E85D3A] text-white text-lg font-medium rounded-lg hover:bg-[#d14e2d] transition-colors no-underline"
            >
              Browse Bikes
            </Link>
            <button
              className="inline-block px-8 py-4 border border-[#7A7A8C]/30 text-[#1A1A2E] text-lg font-medium rounded-lg hover:border-[#E85D3A] hover:text-[#E85D3A] transition-colors bg-transparent cursor-pointer"
              onClick={undefined}
              data-open-chat
            >
              Not sure where to start?
            </button>
          </div>
          <p className="mt-6 text-sm text-[#7A7A8C]">
            Independent recommendations backed by 15+ years of e-bike expertise.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 sm:py-24 border-t border-[#7A7A8C]/10">
        <div className="container max-w-5xl">
          <h2 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl font-semibold text-[#1A1A2E] mb-16">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
            <div>
              <span className="inline-block text-sm font-mono text-[#E85D3A] font-semibold mb-3">01</span>
              <h3 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#1A1A2E] mb-3">
                Tell us your life
              </h3>
              <p className="text-[#7A7A8C] leading-relaxed">
                Kids, hills, budget, commute distance. The stuff that actually matters for picking the right bike.
              </p>
            </div>
            <div>
              <span className="inline-block text-sm font-mono text-[#E85D3A] font-semibold mb-3">02</span>
              <h3 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#1A1A2E] mb-3">
                Get matched
              </h3>
              <p className="text-[#7A7A8C] leading-relaxed">
                Our AI recommends 2-3 bikes with honest tradeoffs. No hidden favorites, no sponsored picks.
              </p>
            </div>
            <div>
              <span className="inline-block text-sm font-mono text-[#E85D3A] font-semibold mb-3">03</span>
              <h3 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#1A1A2E] mb-3">
                Ride happy
              </h3>
              <p className="text-[#7A7A8C] leading-relaxed">
                Buy through our links or book a test ride at a local dealer. We earn a small commission either way.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Bikes */}
      <section className="py-20 sm:py-24 border-t border-[#7A7A8C]/10">
        <div className="container max-w-5xl">
          <div className="flex justify-between items-end mb-12">
            <h2 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl font-semibold text-[#1A1A2E]">
              Editor&apos;s picks
            </h2>
            <Link href="/bikes" className="text-sm text-[#3A8FE8] hover:text-[#2D72BA] no-underline font-medium">
              View all bikes &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
            <FeaturedBikeCard
              name="Tern GSD S10"
              slug="tern-gsd-s10"
              brand="Tern"
              price={5300}
              take="Fits in an elevator. Hauls two kids and a Costco run. The Bosch Cargo Line motor means hills with a full load aren't a problem."
              pick
            />
            <FeaturedBikeCard
              name="RadWagon 5"
              slug="radwagon-5"
              brand="Rad Power Bikes"
              price={2499}
              take="The Volvo wagon of cargo bikes. Not flashy, endlessly practical. At 88 pounds, plan on parking it where you ride it."
            />
            <FeaturedBikeCard
              name="Urban Arrow Family"
              slug="urban-arrow-family"
              brand="Urban Arrow"
              price={8000}
              take="Half of Amsterdam rides these for a reason. The front box fits two kids with seatbelts, or a week of groceries with room to spare."
              pick
            />
            <FeaturedBikeCard
              name="Lectric XPedition2"
              slug="lectric-xpedition2"
              brand="Lectric"
              price={1499}
              take="$1,499 for a cargo bike with a torque sensor and 450-pound capacity. Even fully loaded, it undercuts most competitors by a thousand dollars."
            />
          </div>
        </div>
      </section>
    </main>
  )
}

function FeaturedBikeCard({
  name,
  slug,
  brand,
  price,
  take,
  pick,
}: {
  name: string
  slug: string
  brand: string
  price: number
  take: string
  pick?: boolean
}) {
  return (
    <Link
      href={`/bikes/${slug}`}
      className="group block bg-[#FAFAF8] border border-[#7A7A8C]/15 rounded-[10px] overflow-hidden hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 no-underline"
    >
      {/* Image placeholder */}
      <div className="relative aspect-[4/3] w-full bg-[#E8E0D4] flex items-center justify-center">
        <div className="text-center px-4">
          <p className="font-[family-name:var(--font-fraunces)] text-lg text-[#1A1A2E]/60 font-medium">
            {brand}
          </p>
          <p className="font-[family-name:var(--font-fraunces)] text-sm text-[#1A1A2E]/40 mt-1">
            {name}
          </p>
        </div>
        {pick && (
          <span className="absolute top-3 left-3 bg-[#E85D3A] text-white text-xs font-semibold px-2.5 py-1 rounded-md">
            Our Pick
          </span>
        )}
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-[#1A1A2E] group-hover:text-[#E85D3A] transition-colors">
              {name}
            </h3>
            <p className="text-sm text-[#7A7A8C] mt-0.5">{brand}</p>
          </div>
          <span className="text-base font-semibold text-[#1A1A2E] whitespace-nowrap">
            ${price.toLocaleString()}
          </span>
        </div>
        <p className="mt-3 text-sm text-[#7A7A8C] leading-relaxed line-clamp-2">{take}</p>
      </div>
    </Link>
  )
}

export const metadata: Metadata = {
  title: 'Carryish — Cargo bikes are confusing. We make it simple.',
  description:
    'Independent, opinionated recommendations for cargo bikes, strollers, and everything that carries your life.',
}

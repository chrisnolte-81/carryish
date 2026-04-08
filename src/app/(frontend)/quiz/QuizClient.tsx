'use client'

import React, { useState } from 'react'
import Link from 'next/link'

type Step = {
  question: string
  options: { label: string; value: string }[]
}

const steps: Step[] = [
  {
    question: 'What are you carrying?',
    options: [
      { label: 'Kids', value: 'kids' },
      { label: 'Cargo', value: 'cargo' },
      { label: 'Both', value: 'both' },
    ],
  },
  {
    question: "What's your terrain?",
    options: [
      { label: 'Flat', value: 'flat' },
      { label: 'Some hills', value: 'moderate' },
      { label: 'Very hilly', value: 'hilly' },
    ],
  },
  {
    question: "What's your budget?",
    options: [
      { label: 'Under $2K', value: 'under-2k' },
      { label: '$2K–$4K', value: '2k-4k' },
      { label: '$4K–$6K', value: '4k-6k' },
      { label: '$6K+', value: '6k-plus' },
    ],
  },
  {
    question: 'Where will you store it?',
    options: [
      { label: 'Garage', value: 'garage' },
      { label: 'Apartment', value: 'apartment' },
      { label: 'Bike room', value: 'bike-room' },
    ],
  },
]

type Recommendation = {
  name: string
  slug: string
  price: number
  reason: string
}

function getRecommendations(answers: Record<number, string>): Recommendation[] {
  const carrying = answers[0]
  const terrain = answers[1]
  const budget = answers[2]
  const storage = answers[3]

  const recs: Recommendation[] = []

  // Budget picks
  if (budget === 'under-2k') {
    recs.push({
      name: 'Lectric XPedition2',
      slug: 'lectric-xpedition2',
      price: 1499,
      reason: 'Best value in cargo biking. Modular battery system, 450-pound capacity, and a torque sensor at $1,499.',
    })
    recs.push({
      name: 'Aventon Abound LR',
      slug: 'aventon-abound-lr',
      price: 1999,
      reason: 'GPS tracking and alarm system on a $2K cargo bike. Massive 921Wh battery for 60+ mile range.',
    })
  }

  if (budget === '2k-4k') {
    if (terrain === 'hilly') {
      recs.push({
        name: 'Yuba Kombi E5',
        slug: 'yuba-kombi-e5',
        price: 3299,
        reason: "Mid-drive Shimano motor handles hills better than hub motors. Yuba's accessory catalog is the best for families.",
      })
      recs.push({
        name: 'Specialized Globe Haul LT',
        slug: 'specialized-globe-haul-lt',
        price: 3800,
        reason: '3.5-inch tires float over anything. Mid-drive motor plus Specialized dealer network means easy service.',
      })
    } else {
      recs.push({
        name: 'RadWagon 5',
        slug: 'radwagon-5',
        price: 2499,
        reason: "The Volvo wagon of cargo bikes. Gen 5 torque sensor and SafeShield battery are big upgrades. Solid customer service.",
      })
      recs.push({
        name: 'Yuba Kombi E5',
        slug: 'yuba-kombi-e5',
        price: 3299,
        reason: "Yuba quality at an entry-level price. Great accessory system if you're hauling kids.",
      })
    }
  }

  if (budget === '4k-6k') {
    if (storage === 'apartment' || storage === 'bike-room') {
      recs.push({
        name: 'Tern GSD S10',
        slug: 'tern-gsd-s10',
        price: 5300,
        reason: "Fits in an elevator. Folds to save space. Bosch Cargo Line motor with 85Nm of torque. The best compact cargo bike.",
      })
      recs.push({
        name: 'Tern HSD P5i',
        slug: 'tern-hsd-p5i',
        price: 5300,
        reason: "Looks almost like a normal bike. 57 pounds, fits in standard bike parking. Internally geared hub means low maintenance.",
      })
    } else {
      recs.push({
        name: 'Tern GSD S10',
        slug: 'tern-gsd-s10',
        price: 5300,
        reason: "Bosch Cargo Line motor, deepest accessory system in the game. Hauls two kids and a Costco run without breaking a sweat.",
      })
      recs.push({
        name: 'Yuba Spicy Curry V3',
        slug: 'yuba-spicy-curry-v3',
        price: 5499,
        reason: "Low rear deck means kids step on and off without climbing. Best accessory catalog for longtails.",
      })
    }
  }

  if (budget === '6k-plus') {
    if (storage === 'garage' && (carrying === 'kids' || carrying === 'both')) {
      recs.push({
        name: 'Urban Arrow Family',
        slug: 'urban-arrow-family',
        price: 8000,
        reason: "Half of Amsterdam rides these. Front box fits two kids with seatbelts. Gates belt drive means zero chain maintenance.",
      })
      recs.push({
        name: 'Riese & Muller Load 75',
        slug: 'riese-muller-load-75',
        price: 9500,
        reason: "Full suspension cargo bike. Kids stay happy on rough roads. German-engineered and priced accordingly.",
      })
    } else {
      recs.push({
        name: 'Trek Fetch+ 4',
        slug: 'trek-fetch-plus-4',
        price: 6500,
        reason: "Belt drive and CVP hub shift smoothly under load. Biggest dealer network in the world for easy service.",
      })
      recs.push({
        name: 'Xtracycle Swoop',
        slug: 'xtracycle-swoop',
        price: 5999,
        reason: "The brand that invented longtail cargo bikes. Hooptie rails included. Bosch CX motor is the most powerful available.",
      })
    }
  }

  // Ensure we always have at least 2 recommendations
  if (recs.length === 0) {
    recs.push({
      name: 'Tern GSD S10',
      slug: 'tern-gsd-s10',
      price: 5300,
      reason: "Our default recommendation for most families. Fits anywhere, hauls everything, Bosch motor handles hills.",
    })
    recs.push({
      name: 'Lectric XPedition2',
      slug: 'lectric-xpedition2',
      price: 1499,
      reason: "Best value play. Start cheap, add accessories as you need them. $1,499 to test the cargo bike life.",
    })
  }

  return recs.slice(0, 3)
}

export function QuizClient() {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showResults, setShowResults] = useState(false)

  const handleAnswer = (value: string) => {
    const newAnswers = { ...answers, [currentStep]: value }
    setAnswers(newAnswers)

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setShowResults(true)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleRestart = () => {
    setCurrentStep(0)
    setAnswers({})
    setShowResults(false)
  }

  if (showResults) {
    const recommendations = getRecommendations(answers)

    return (
      <main className="bg-[#FAFAF8] min-h-screen">
        <div className="container max-w-3xl py-20 sm:py-28">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl font-semibold text-[#1A1A2E] tracking-tight">
            Your matches
          </h1>
          <p className="mt-3 text-[#7A7A8C] text-lg">
            Based on your answers, here are our top picks.
          </p>

          <div className="mt-10 space-y-6">
            {recommendations.map((rec, i) => (
              <Link
                key={rec.slug}
                href={`/bikes/${rec.slug}`}
                className="group block bg-[#FAFAF8] border border-[#7A7A8C]/15 rounded-[10px] p-6 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 no-underline"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-mono text-[#E85D3A] font-semibold">
                      #{i + 1}
                    </span>
                    <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#1A1A2E] mt-1 group-hover:text-[#E85D3A] transition-colors">
                      {rec.name}
                    </h2>
                    <p className="mt-2 text-[#7A7A8C] text-sm leading-relaxed">{rec.reason}</p>
                  </div>
                  <span className="text-lg font-semibold text-[#1A1A2E] whitespace-nowrap">
                    ${rec.price.toLocaleString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 flex gap-4 items-center">
            <button
              onClick={handleRestart}
              className="text-sm text-[#3A8FE8] hover:text-[#2D72BA] cursor-pointer bg-transparent border-none font-medium"
            >
              Start over
            </button>
            <Link
              href="/bikes"
              className="text-sm text-[#7A7A8C] hover:text-[#1A1A2E] no-underline"
            >
              Browse all bikes
            </Link>
          </div>

          <div className="mt-10 bg-[#FAFAF8] border-l-[3px] border-[#E85D3A] pl-6 py-4">
            <p className="text-sm text-[#7A7A8C] leading-relaxed">
              These are starting points, not final answers. Your best bet is always a test ride.
              If you buy through our links, we earn a small commission. It doesn&apos;t change what
              we recommend.
            </p>
          </div>
        </div>
      </main>
    )
  }

  const step = steps[currentStep]

  return (
    <main className="bg-[#FAFAF8] min-h-screen">
      <div className="container max-w-2xl py-20 sm:py-28">
        {/* Progress */}
        <div className="flex gap-2 mb-12">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= currentStep ? 'bg-[#E85D3A]' : 'bg-[#7A7A8C]/15'
              }`}
            />
          ))}
        </div>

        <p className="text-sm text-[#7A7A8C] font-medium mb-3">
          Question {currentStep + 1} of {steps.length}
        </p>

        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl font-semibold text-[#1A1A2E] tracking-tight">
          {step.question}
        </h1>

        <div className="mt-10 grid grid-cols-1 gap-3">
          {step.options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleAnswer(option.value)}
              className={`text-left px-6 py-5 border rounded-[10px] text-lg font-medium transition-all cursor-pointer ${
                answers[currentStep] === option.value
                  ? 'border-[#E85D3A] bg-[#E85D3A]/5 text-[#E85D3A]'
                  : 'border-[#7A7A8C]/15 bg-[#FAFAF8] text-[#1A1A2E] hover:border-[#E85D3A]/50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {currentStep > 0 && (
          <button
            onClick={handleBack}
            className="mt-8 text-sm text-[#7A7A8C] hover:text-[#1A1A2E] cursor-pointer bg-transparent border-none font-medium"
          >
            &larr; Back
          </button>
        )}
      </div>
    </main>
  )
}

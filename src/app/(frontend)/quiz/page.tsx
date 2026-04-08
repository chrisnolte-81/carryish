import type { Metadata } from 'next'
import { QuizClient } from './QuizClient'

export default function QuizPage() {
  return <QuizClient />
}

export const metadata: Metadata = {
  title: 'Find Your Bike | Carryish',
  description: 'Answer 4 quick questions and we\'ll match you with the right cargo bike.',
}

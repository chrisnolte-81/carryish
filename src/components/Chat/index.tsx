'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { MessageCircle, X, Send, ArrowRight } from 'lucide-react'
import Link from 'next/link'

type ProductCard = {
  name: string
  slug: string
  brand: string | null
  price: number | null
  carryishTake: string
  overallScore: number | null
  bestFor: string[]
  url: string
}

export const Chat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, sendMessage, status, error } = useChat()

  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  // Listen for data-open-chat clicks from other components
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-open-chat]')) {
        setIsOpen(true)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = inputValue.trim()
    if (!text || isLoading) return
    setInputValue('')
    await sendMessage({ text })
  }

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[26rem] h-[36rem] bg-white rounded-xl shadow-2xl border border-[#7A7A8C]/15 flex flex-col overflow-hidden animate-[slideUp_0.2s_ease-out]">
          {/* Header — Canvas background */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#FAFAF8] border-b border-[#7A7A8C]/15">
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--font-fraunces)] text-lg font-semibold">
                <span className="text-[#1A1A2E]">carry</span>
                <span className="text-[#E85D3A]">ish</span>
              </span>
              <span className="text-[#7A7A8C] text-sm">matchmaker</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-[#7A7A8C] hover:text-[#1A1A2E] hover:bg-[#1A1A2E]/5 transition-colors cursor-pointer bg-transparent border-none"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-[#1A1A2E] font-medium">What are you hauling?</p>
                <p className="text-[#7A7A8C] text-sm mt-1">
                  Tell me about your situation and I&apos;ll find you the right ride.
                </p>
              </div>
            )}
            {messages.map((message) => {
              // Extract text parts
              const textParts = message.parts
                ?.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
                .map((part) => part.text)
                .join('') || ''

              // Extract product card data from tool results (AI SDK v6 pattern)
              const productCards: ProductCard[] = []
              message.parts?.forEach((part) => {
                if (
                  part.type === 'tool-searchProducts' &&
                  (part as any).state === 'output-available'
                ) {
                  const output = (part as any).output
                  if (Array.isArray(output)) {
                    productCards.push(...output)
                  }
                }
              })

              const hasContent = textParts || productCards.length > 0

              if (!hasContent) return null

              return (
                <div key={message.id}>
                  {/* Text message */}
                  {textParts && (
                    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          message.role === 'user'
                            ? 'bg-[#E85D3A] text-white'
                            : 'bg-[#F0F0EC] text-[#1A1A2E]'
                        }`}
                      >
                        <MarkdownContent
                          content={textParts}
                          isUser={message.role === 'user'}
                        />
                      </div>
                    </div>
                  )}

                  {/* Product cards */}
                  {productCards.length > 0 && (
                    <div className="mt-3 space-y-2.5">
                      {productCards.slice(0, 5).map((product) => (
                        <ProductCardComponent key={product.slug} product={product} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {isLoading &&
              (messages.length === 0 || messages[messages.length - 1]?.role === 'user') && (
                <div className="flex justify-start">
                  <div className="bg-[#F0F0EC] text-[#7A7A8C] rounded-xl px-3.5 py-2.5 text-sm">
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                    </span>
                  </div>
                </div>
              )}
            {error && (
              <div className="text-center text-sm text-red-500 py-2">
                Something went wrong. Try again.
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input — styled with Coral Fire focus */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-[#7A7A8C]/10 bg-white">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Two kids, hilly neighborhood, $3K budget..."
              className="flex-1 text-sm bg-[#FAFAF8] text-[#1A1A2E] placeholder-[#7A7A8C] rounded-[10px] px-3.5 py-2.5 border border-[#7A7A8C]/20 outline-none focus:border-[#E85D3A] transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="p-2.5 bg-[#E85D3A] text-white rounded-[10px] hover:bg-[#d14e2d] transition-colors disabled:opacity-40 cursor-pointer border-none"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 sm:right-6 z-50 w-14 h-14 bg-[#E85D3A] text-white rounded-full shadow-lg hover:bg-[#d14e2d] transition-colors flex items-center justify-center cursor-pointer border-none"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </>
  )
}

// ─── Markdown renderer ───

function MarkdownContent({ content, isUser }: { content: string; isUser: boolean }) {
  // Split into lines for paragraph handling
  const paragraphs = content.split(/\n\n+/)

  return (
    <div className="space-y-2">
      {paragraphs.map((paragraph, i) => (
        <MarkdownParagraph key={i} text={paragraph} isUser={isUser} />
      ))}
    </div>
  )
}

function MarkdownParagraph({ text, isUser }: { text: string; isUser: boolean }) {
  // Check for unordered list
  const lines = text.split('\n')
  const isList = lines.every((line) => /^[-*•]\s/.test(line.trim()) || line.trim() === '')

  if (isList) {
    return (
      <ul className="space-y-1 ml-1">
        {lines
          .filter((line) => line.trim())
          .map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className={`shrink-0 mt-0.5 ${isUser ? 'text-white/60' : 'text-[#E85D3A]'}`}>•</span>
              <span><InlineMarkdown text={line.replace(/^[-*•]\s*/, '')} isUser={isUser} /></span>
            </li>
          ))}
      </ul>
    )
  }

  // Check for numbered list
  const isNumbered = lines.every((line) => /^\d+[.)]\s/.test(line.trim()) || line.trim() === '')

  if (isNumbered) {
    return (
      <ol className="space-y-1 ml-1">
        {lines
          .filter((line) => line.trim())
          .map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className={`shrink-0 text-xs font-semibold mt-0.5 ${isUser ? 'text-white/60' : 'text-[#7A7A8C]'}`}>
                {i + 1}.
              </span>
              <span><InlineMarkdown text={line.replace(/^\d+[.)]\s*/, '')} isUser={isUser} /></span>
            </li>
          ))}
      </ol>
    )
  }

  // Regular paragraph with line breaks
  return (
    <p>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          <InlineMarkdown text={line} isUser={isUser} />
        </React.Fragment>
      ))}
    </p>
  )
}

/** Renders inline markdown: **bold**, *italic*, [links](url), `code` */
function InlineMarkdown({ text, isUser }: { text: string; isUser: boolean }) {
  // Regex to match: **bold**, *italic*, [link](url), `code`
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g
  const parts = text.split(pattern)

  return (
    <>
      {parts.map((part, i) => {
        // Bold
        const boldMatch = part.match(/^\*\*(.+)\*\*$/)
        if (boldMatch) {
          return <strong key={i} className="font-semibold">{boldMatch[1]}</strong>
        }

        // Italic
        const italicMatch = part.match(/^\*(.+)\*$/)
        if (italicMatch) {
          return <em key={i}>{italicMatch[1]}</em>
        }

        // Link
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
        if (linkMatch) {
          const [, linkText, href] = linkMatch
          const isInternal = href.startsWith('/')
          return (
            <a
              key={i}
              href={href}
              className={`underline underline-offset-2 font-medium ${
                isUser ? 'text-white hover:text-white/80' : 'text-[#3A8FE8] hover:text-[#2D72BA]'
              } transition-colors`}
              target={isInternal ? undefined : '_blank'}
              rel={isInternal ? undefined : 'noopener noreferrer'}
            >
              {linkText}
            </a>
          )
        }

        // Code
        const codeMatch = part.match(/^`(.+)`$/)
        if (codeMatch) {
          return (
            <code
              key={i}
              className={`text-xs px-1.5 py-0.5 rounded ${
                isUser ? 'bg-white/15' : 'bg-[#1A1A2E]/8 text-[#1A1A2E]'
              }`}
            >
              {codeMatch[1]}
            </code>
          )
        }

        return <span key={i}>{part}</span>
      })}
    </>
  )
}

// ─── Product card ───

function ProductCardComponent({ product }: { product: ProductCard }) {
  const firstSentence = product.carryishTake
    ? product.carryishTake.split(/\.\s/)[0] + '.'
    : null

  return (
    <Link
      href={product.url}
      className="flex gap-3 p-3 bg-[#FAFAF8] border border-[#7A7A8C]/15 rounded-lg hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:-translate-y-px transition-all duration-200 no-underline group"
    >
      {/* Thumbnail placeholder */}
      <div className="w-20 h-20 bg-[#E8E0D4] rounded-lg shrink-0 flex items-center justify-center">
        <span className="font-[family-name:var(--font-fraunces)] text-[10px] text-[#1A1A2E]/40 text-center leading-tight px-1">
          {product.brand || product.name}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-fraunces)] text-sm font-semibold text-[#1A1A2E] group-hover:text-[#E85D3A] transition-colors truncate">
              {product.name}
            </p>
            {product.brand && (
              <p className="text-xs text-[#7A7A8C]">{product.brand}</p>
            )}
          </div>
          {product.price != null && (
            <span className="text-sm font-bold text-[#1A1A2E] shrink-0">
              ${product.price.toLocaleString()}
            </span>
          )}
        </div>

        {firstSentence && (
          <p className="text-xs text-[#7A7A8C] mt-1.5 line-clamp-2 leading-relaxed">
            {firstSentence}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1.5">
          {product.overallScore && (
            <span className="text-[10px] font-bold text-[#E85D3A] bg-[#E85D3A]/8 px-1.5 py-0.5 rounded">
              {product.overallScore}/10
            </span>
          )}
          <span className="text-xs text-[#3A8FE8] font-medium group-hover:underline flex items-center gap-0.5 ml-auto">
            View details <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  )
}

# CLAUDE.md — Carryish.ai

Read STYLE_GUIDE.md before writing any user-facing content. No exceptions.

---

## What This Is

Carryish.ai is an AI-powered discovery platform for cargo bikes, strollers, trailers, wagons, and carry-everything gear. Editorially driven — warm, opinionated, bias-transparent, never preachy. The brand voice sits at Tribe Called Quest meets Wirecutter.

Revenue model: affiliate commissions + dealer lead generation. Every product has an affiliate URL.

The founder is Chris Nolte. He also runs Propel Bikes (premium e-bike retailer in Brooklyn and Long Beach). Carryish is a standalone brand — not a Propel sub-brand. Neutrality is a core strategic asset.

---

## Tech Stack

- **Framework:** Next.js (App Router) + Payload CMS 3.x
- **Database:** Postgres (Neon via Vercel)
- **Media:** Vercel Blob storage
- **Styling:** Tailwind CSS + shadcn/ui
- **Deployment:** Vercel
- **Package manager:** pnpm

Future additions (not yet implemented):
- AI chat: Claude API via Vercel AI SDK
- Human handoff: Stream Chat
- Search: Meilisearch

---

## Brand Tokens

### Fonts
- **Headings/wordmark:** Fraunces (Google Fonts) — bouncy old-style serif, warm personality
- **Body text:** Inter (Google Fonts) — clean, readable, doesn't fight the serif
- **Specs/data:** JetBrains Mono or monospace fallback (future)

### Colors
- **Coral Fire** `#E85D3A` — primary accent, CTAs, the "ish" in the wordmark
- **Midnight** `#1A1A2E` — text, dark backgrounds, the "carry" in the wordmark
- **Open Sky** `#3A8FE8` — links, interactive elements, info
- **Canvas** `#FAFAF8` — page background
- **Slate** `#7A7A8C` — muted text, secondary content

### Wordmark
Text-based, not a logo image. "carry" in Midnight Fraunces, "ish" in Coral Fire Fraunces. The ".ai" is optional and always in Slate when used.

---

## Collections

### Brands
- name, slug, logo (upload), websiteUrl, description

### Products
- Tabs: Content (name, images, carryishTake richtext), Specs (price, weight, cargoCapacity, motorType, batteryRange), Meta (brand relationship, category select, affiliateUrl)
- Versions with drafts
- Categories: cargo-bike, stroller, trailer, wagon, accessory

### Categories
- title, slug, description, icon

### Pages, Posts, Media, Users
- Default Payload collections, mostly untouched

---

## Routes

- `/` — Homepage
- `/bikes` — Product listing with grid
- `/bikes/[slug]` — Product detail page
- `/admin` — Payload admin panel (don't restyle this)
- `/posts` — Blog (exists but not in nav yet)

---

## Patterns

- Follow existing Payload template patterns for server components, data fetching, and revalidation
- Product pages use `force-static` with revalidation hooks
- Access control: authenticated write, anyone read (except Users)
- The admin panel is Payload's default — don't customize its styling

---

## Content Rules

All user-facing content follows STYLE_GUIDE.md. Key points:

- Have opinions. Name biases. Be specific.
- No banned words (see the kill list in STYLE_GUIDE.md)
- Plain language first, explain jargon once
- The "Carryish Take" is 3-5 sentences: strength, limitation, who it's for
- Affiliate disclosure when relevant: "If you buy through our links, we earn a small commission. It doesn't change what we recommend."

---

## V1 MVP Scope

1. ✅ Payload CMS + Vercel deployment
2. ✅ Brands, Products, Categories collections
3. ✅ Product listing and detail pages
4. ⬜ Brand theming (fonts, colors, wordmark, homepage)
5. ⬜ Seed product data (14 bikes, 12 brands)
6. ⬜ AI chat matchmaker (Claude API + Vercel AI SDK)
7. ⬜ Affiliate link tracking
8. ⬜ Basic analytics

## V2

- Full multi-brand marketplace
- Brand and dealer self-service portals
- UGC reviews
- Meilisearch integration
- Commercial fleet support

---

## Commands

```bash
pnpm dev          # local dev server
pnpm build        # production build (run before pushing)
vercel --prod     # manual deploy
```

---

## Files That Matter

- `STYLE_GUIDE.md` — Writing voice and anti-AI content rules
- `CLAUDE.md` — This file. Project context.
- `src/payload.config.ts` — Collection registry
- `src/collections/` — All collection definitions
- `src/app/(frontend)/` — Frontend routes

# Carryish

Carryish is an ecommerce site for bags, luggage, and carry-on accessories built with Payload CMS + Next.js.

## Tech Stack
- **CMS**: Payload CMS 3.x (app-based config in `src/payload.config.ts`)
- **Frontend**: Next.js 15 (App Router) with React 19
- **Database**: Neon Postgres via `@payloadcms/db-postgres`
- **Storage**: Vercel Blob via `@payloadcms/storage-vercel-blob`
- **Styling**: Tailwind CSS
- **Package Manager**: pnpm

## Project Structure
- `src/collections/` – Payload collection configs
- `src/plugins/` – Payload plugin registrations
- `src/blocks/` – Payload block configs (used in rich layouts)
- `src/fields/` – Reusable Payload field configs
- `src/access/` – Access-control helpers (`authenticated`, `anyone`, etc.)
- `src/app/(frontend)/` – Next.js frontend routes
- `src/app/(payload)/` – Payload admin routes

## Conventions
- Collections go in `src/collections/` and are registered in `src/payload.config.ts`
- Plugins go in `src/plugins/index.ts`
- Use the existing access-control helpers in `src/access/`
- Follow the patterns already established in existing collections (Pages, Posts, Media, etc.)

## Writing & Content
- **ALWAYS read and follow `STYLE_GUIDE.md`** before writing any content for Carryish — product descriptions, Carryish Takes, editorial copy, metadata, chat responses, social posts, emails, everything.
- The style guide defines our voice, banned words/phrases, formatting rules, and anti-AI patterns. No exceptions.

## Commands
- `pnpm dev` – Start dev server
- `pnpm build` – Production build
- `pnpm generate:types` – Regenerate Payload types

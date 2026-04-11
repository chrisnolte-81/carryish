/**
 * Read-only DB inspector — checks migration state + relevant schema.
 * Runs through Payload so we reuse the adapter's connection + SSL config.
 * Usage: pnpm tsx scripts/db-inspect.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { sql } from '@payloadcms/db-postgres'

async function main() {
  const payload = await getPayload({ config: configPromise })
  const db = (payload.db as any).drizzle

  console.log('\n=== payload_migrations ===')
  const migs = await db.execute(
    sql`SELECT id, name, batch FROM payload_migrations ORDER BY id`,
  )
  for (const r of migs.rows || migs)
    console.log(`  ${String(r.id).padStart(3)}  batch=${r.batch}  ${r.name}`)

  console.log('\n=== lifestyle tables present? ===')
  const tables = await db.execute(
    sql`SELECT table_name FROM information_schema.tables
        WHERE table_schema='public' AND table_name LIKE '%lifestyle%'
        ORDER BY table_name`,
  )
  const trows = tables.rows || tables
  console.log(trows.length ? trows.map((t: any) => '  ' + t.table_name).join('\n') : '  (none)')

  console.log('\n=== products.power_type column? ===')
  const cols = await db.execute(
    sql`SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name='products' AND column_name='power_type'`,
  )
  const crows = cols.rows || cols
  console.log(crows.length ? '  ' + JSON.stringify(crows[0]) : '  (missing)')

  console.log('\n=== power_type enums ===')
  const enums = await db.execute(
    sql`SELECT typname FROM pg_type WHERE typname LIKE '%power_type%'`,
  )
  const erows = enums.rows || enums
  console.log(erows.length ? erows.map((e: any) => '  ' + e.typname).join('\n') : '  (none)')

  console.log('\n=== enrichment-era tables (sanity) ===')
  const enrich = await db.execute(
    sql`SELECT table_name FROM information_schema.tables
        WHERE table_schema='public'
          AND (table_name LIKE 'products_pros%'
            OR table_name LIKE 'products_cons%'
            OR table_name LIKE 'products_faq%'
            OR table_name LIKE 'products_competitors%')
        ORDER BY table_name`,
  )
  const rrows = enrich.rows || enrich
  console.log(rrows.length ? rrows.map((t: any) => '  ' + t.table_name).join('\n') : '  (none)')

  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

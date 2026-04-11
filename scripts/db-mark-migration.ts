/**
 * Mark a migration file as already-applied (batch=-1) in payload_migrations.
 * Used when the underlying DDL was previously pushed via `payload dev`.
 *
 * Usage: pnpm tsx scripts/db-mark-migration.ts <migration_name>
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { sql } from '@payloadcms/db-postgres'

async function main() {
  const name = process.argv[2]
  if (!name) {
    console.error('usage: pnpm tsx scripts/db-mark-migration.ts <migration_name>')
    process.exit(2)
  }

  const payload = await getPayload({ config: configPromise })
  const db = (payload.db as any).drizzle

  // Check the table schema once so we know which timestamp columns exist.
  const schema = await db.execute(
    sql`SELECT column_name FROM information_schema.columns
        WHERE table_name='payload_migrations'
        ORDER BY ordinal_position`,
  )
  const cols = (schema.rows || schema).map((r: any) => r.column_name)
  console.log('payload_migrations columns:', cols.join(', '))

  // Already present?
  const existing = await db.execute(
    sql`SELECT id, name, batch FROM payload_migrations WHERE name = ${name}`,
  )
  const erows = existing.rows || existing
  if (erows.length) {
    console.log(`\nAlready tracked: ${JSON.stringify(erows[0])}`)
    console.log('Nothing to do.')
    process.exit(0)
  }

  console.log(`\nInserting row: name='${name}', batch=-1 ...`)
  await db.execute(
    sql`INSERT INTO payload_migrations (name, batch, created_at, updated_at)
        VALUES (${name}, -1, NOW(), NOW())`,
  )
  console.log('Inserted.')

  const after = await db.execute(
    sql`SELECT id, name, batch FROM payload_migrations WHERE name = ${name}`,
  )
  console.log('Verified:', (after.rows || after)[0])

  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

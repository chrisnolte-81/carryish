/**
 * Clear dev-sentinel rows in payload_migrations.
 * ───────────────────────────────────────────────
 * When Payload is run in dev mode, the dev push inserts `batch = -1` rows
 * into `payload_migrations`. These rows trigger an interactive prompt on
 * subsequent `payload migrate` runs, which breaks non-TTY CI builds.
 *
 * This script UPDATEs all batch=-1 rows to batch=0, marking them as
 * applied without triggering the prompt. It is idempotent.
 *
 * Talks directly to Postgres via `pg` (no Payload bootstrap) so it does NOT
 * trigger Payload's dev-push schema sync, which would itself prompt.
 *
 * Usage: pnpm tsx scripts/db-clear-dev-sentinel.ts
 */
import 'dotenv/config'
// @ts-expect-error — pg is a transitive dep from @payloadcms/db-postgres
import pgPkg from '../node_modules/.pnpm/pg@8.16.3/node_modules/pg/lib/index.js'

const { Client } = pgPkg as { Client: new (opts: { connectionString: string }) => any }

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL not set')

  const client = new Client({ connectionString })
  await client.connect()

  try {
    const before = await client.query<{ id: number; name: string; batch: number }>(
      'SELECT id, name, batch FROM payload_migrations WHERE batch = -1 ORDER BY name',
    )
    console.log(`found ${before.rows.length} dev-sentinel row(s) with batch=-1`)
    for (const r of before.rows) console.log('  ', r)

    if (before.rows.length === 0) {
      console.log('nothing to do')
      return
    }

    const result = await client.query('UPDATE payload_migrations SET batch = 0 WHERE batch = -1')
    console.log(`updated ${result.rowCount} row(s): batch=-1 → batch=0`)
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

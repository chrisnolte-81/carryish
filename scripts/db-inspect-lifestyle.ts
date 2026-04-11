/**
 * One-shot diagnostic: check which lifestyle/gallery tables exist in prod
 * and how many rows each has. Read-only.
 */
import 'dotenv/config'
// @ts-expect-error — pg is transitive
import pgPkg from '../node_modules/.pnpm/pg@8.16.3/node_modules/pg/lib/index.js'

const { Client } = pgPkg as { Client: new (opts: { connectionString: string }) => any }

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL not set')
  const c = new Client({ connectionString })
  await c.connect()
  try {
    const tables = await c.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
         AND (table_name LIKE '%lifestyle%'
              OR table_name LIKE '%gallery%'
              OR table_name LIKE '%component_detail%')
       ORDER BY table_name`,
    )
    console.log('matching tables:')
    for (const r of tables.rows) console.log(' ', r.table_name)
    console.log('')

    const candidates = [
      'products_lifestyle_images',
      'products_gallery_lifestyle_images',
      'products_gallery_component_details',
      '_products_v_version_lifestyle_images',
      '_products_v_version_gallery_lifestyle_images',
      '_products_v_version_gallery_component_details',
    ]
    for (const t of candidates) {
      try {
        const r = await c.query(`SELECT COUNT(*)::int AS n FROM ${t}`)
        console.log(`${t}: ${r.rows[0].n} rows`)
      } catch {
        console.log(`${t}: DOES NOT EXIST`)
      }
    }

    const enums = await c.query(
      `SELECT t.typname FROM pg_type t
       JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE t.typtype = 'e' AND (t.typname LIKE '%lifestyle%' OR t.typname LIKE '%gallery%' OR t.typname LIKE '%component_detail%')
       ORDER BY t.typname`,
    )
    console.log('\nmatching enums:')
    for (const r of enums.rows) console.log(' ', r.typname)

    const migrations = await c.query(
      'SELECT id, name, batch FROM payload_migrations ORDER BY id',
    )
    console.log('\npayload_migrations:')
    for (const r of migrations.rows) console.log(' ', r)
  } finally {
    await c.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

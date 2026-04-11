/**
 * Fix broken per-color Tern images by uploading local media/ files to Vercel Blob.
 *
 * Root cause: scripts/scrape-tern-color-images.ts was run with .env loaded, which
 * had BLOB_READ_WRITE_TOKEN=<empty>. The vercelBlobStorage plugin silently fell
 * back to the local filesystem. DB records exist, but Blob storage doesn't.
 *
 * This script reads the real token from .env.vercel, then uploads each local file
 * to Blob using the same filename the plugin would have used.
 *
 * Usage:
 *   pnpm tsx scripts/upload-missing-tern-blobs.ts            # real upload
 *   pnpm tsx scripts/upload-missing-tern-blobs.ts --dry-run  # list, no upload
 */
import fs from 'fs'
import path from 'path'
import { put, head } from '@vercel/blob'

const DRY_RUN = process.argv.includes('--dry-run')

function loadEnvVercel(): string {
  const envPath = path.join(process.cwd(), '.env.vercel')
  if (!fs.existsSync(envPath)) throw new Error('.env.vercel not found')
  const text = fs.readFileSync(envPath, 'utf8')
  for (const line of text.split('\n')) {
    const m = line.match(/^BLOB_READ_WRITE_TOKEN=(.+)$/)
    if (m) {
      // Strip surrounding quotes if any
      return m[1].replace(/^["']|["']$/g, '').trim()
    }
  }
  throw new Error('BLOB_READ_WRITE_TOKEN not found in .env.vercel')
}

const PAYLOAD_URL = process.env.PAYLOAD_URL || 'https://carryish.ai'
const MEDIA_DIR = path.join(process.cwd(), 'media')

// Only fix per-color hero/angle images uploaded by scripts/scrape-tern-color-images.ts
const TARGET_PATTERN = /^tern-(gsd|hsd|quick-haul|nbd|short-haul|orox)-.+-(hero|angle)(-\d+)?\.webp$/
// Match the base filename as stored in the DB (not size variants like -300x200)
const SIZE_VARIANT = /-\d+x\d+\.webp$/

type MediaDoc = {
  id: number
  filename: string
  url: string
  sizes?: Record<
    string,
    { filename: string | null; url: string | null }
  >
}

async function fetchTernMediaDocs(): Promise<MediaDoc[]> {
  const out: MediaDoc[] = []
  let page = 1
  while (true) {
    const res = await fetch(
      `${PAYLOAD_URL}/api/media?where%5Bfilename%5D%5Blike%5D=tern&limit=100&page=${page}`,
    )
    if (!res.ok) throw new Error(`media fetch failed: ${res.status}`)
    const data: any = await res.json()
    for (const d of data.docs || []) {
      if (TARGET_PATTERN.test(d.filename)) out.push(d as MediaDoc)
    }
    if (!data.hasNextPage) break
    page += 1
  }
  return out
}

async function blobExists(filename: string, token: string): Promise<boolean> {
  try {
    // head() throws if not found
    await head(filename, { token })
    return true
  } catch {
    return false
  }
}

async function uploadOne(filename: string, token: string): Promise<'uploaded' | 'exists' | 'missing'> {
  const localPath = path.join(MEDIA_DIR, filename)
  if (!fs.existsSync(localPath)) return 'missing'
  const exists = await blobExists(filename, token)
  if (exists) return 'exists'
  if (DRY_RUN) return 'uploaded'
  const buffer = fs.readFileSync(localPath)
  await put(filename, buffer, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'image/webp',
    token,
  })
  return 'uploaded'
}

async function main() {
  const token = loadEnvVercel()
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Token loaded (len=${token.length})`)
  const docs = await fetchTernMediaDocs()
  console.log(`Found ${docs.length} tern hero/angle media records`)

  let uploaded = 0
  let existed = 0
  let missing = 0
  let errors = 0

  for (const doc of docs) {
    // Collect the base filename + every size variant
    const files: string[] = [doc.filename]
    if (doc.sizes) {
      for (const [, sz] of Object.entries(doc.sizes)) {
        if (sz?.filename) files.push(sz.filename)
      }
    }
    const deduped = Array.from(new Set(files))
    process.stdout.write(`#${doc.id} ${doc.filename} (${deduped.length} files) ... `)
    let u = 0
    let e = 0
    let m = 0
    for (const f of deduped) {
      try {
        const result = await uploadOne(f, token)
        if (result === 'uploaded') u++
        else if (result === 'exists') e++
        else m++
      } catch (err: any) {
        console.log(`\n   ✗ ${f}: ${err.message || err}`)
        errors++
      }
    }
    uploaded += u
    existed += e
    missing += m
    console.log(`↑${u} =${e} ?${m}`)
  }

  console.log()
  console.log(`Summary:`)
  console.log(`  records processed: ${docs.length}`)
  console.log(`  files uploaded:    ${uploaded}`)
  console.log(`  files already ok:  ${existed}`)
  console.log(`  files missing:     ${missing}`)
  console.log(`  errors:            ${errors}`)
  process.exit(errors > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('fatal', e)
  process.exit(1)
})

import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

/**
 * On-demand cache revalidation endpoint.
 *
 * Usage:
 *   GET /api/revalidate?path=/bikes/tern-gsd-s10&secret=<REVALIDATION_SECRET>
 *
 * Protected by the REVALIDATION_SECRET env var. Invalidates the Next.js
 * data cache + ISR output for a single path. Pair with a loop script to
 * refresh a batch of URLs at once.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const secret = url.searchParams.get('secret')
  const path = url.searchParams.get('path')

  if (!process.env.REVALIDATION_SECRET) {
    return NextResponse.json(
      { revalidated: false, error: 'REVALIDATION_SECRET not configured' },
      { status: 500 },
    )
  }

  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json(
      { revalidated: false, error: 'Invalid secret' },
      { status: 401 },
    )
  }

  if (!path || !path.startsWith('/')) {
    return NextResponse.json(
      { revalidated: false, error: 'Missing or invalid path parameter' },
      { status: 400 },
    )
  }

  try {
    revalidatePath(path)
    return NextResponse.json({ revalidated: true, path, now: Date.now() })
  } catch (err) {
    console.error('[revalidate] failed', { path, err })
    return NextResponse.json(
      {
        revalidated: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

import configPromise from '@payload-config'
import { getPayload } from 'payload'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return Response.json({ error: 'Valid email required' }, { status: 400 })
    }

    const payload = await getPayload({ config: configPromise })

    await payload.create({
      collection: 'subscribers',
      data: { email },
    })

    return Response.json({ success: true })
  } catch (error: any) {
    if (error?.message?.includes('unique') || error?.message?.includes('duplicate')) {
      return Response.json({ success: true })
    }
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

import { runTrumpWatchPipeline } from '@/lib/trump/pipeline'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET() {
  // For production, optionally add:
  // if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) return new Response('Unauthorized', { status: 401 })
  try {
    const result = await runTrumpWatchPipeline()
    return Response.json({ success: true, ...result })
  } catch (err) {
    return Response.json({ success: false, error: String(err) }, { status: 500 })
  }
}

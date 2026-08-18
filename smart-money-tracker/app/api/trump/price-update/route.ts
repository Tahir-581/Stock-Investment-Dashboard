import { updatePastPriceReactions } from '@/lib/trump/priceEnricher'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const updated = await updatePastPriceReactions()
    return Response.json({ updated })
  } catch (err) {
    return Response.json({ updated: 0, error: String(err) })
  }
}

import { NextResponse } from 'next/server'

/**
 * Cache / function warmer cron.
 *
 * Vercel serverless functions go cold after ~10-15 min idle; the next user
 * hitting the home page then pays ~500-1500 ms cold-start latency. This
 * route pings the common-case endpoints every minute to keep them hot:
 *
 *  1. `/api/home` (anonymous, no location) — the SSR home-page entry point.
 *  2. `/api/scores` — cached globally, but keeps the function warm.
 *
 * Configured in vercel.json under `crons`. Secured via CRON_SECRET.
 * Must respond < 30 s (default function maxDuration).
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.plantspack.com'
  const started = Date.now()

  // Fire-and-measure. Don't fail the cron if one warm-up errors — partial
  // is still better than none.
  const results = await Promise.allSettled([
    fetch(`${base}/api/home`, { cache: 'no-store' }),
    fetch(`${base}/api/scores`, { cache: 'no-store' }),
  ])

  const summary = results.map((r, i) => ({
    url: i === 0 ? '/api/home' : '/api/scores',
    ok: r.status === 'fulfilled' && (r as any).value.ok,
    status: r.status === 'fulfilled' ? (r as any).value.status : 'network',
  }))

  return NextResponse.json({
    success: true,
    elapsed_ms: Date.now() - started,
    warmed: summary,
  })
}

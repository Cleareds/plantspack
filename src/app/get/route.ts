import { NextRequest, NextResponse } from 'next/server'
import { appStoreUrl, campaignSlug, playUrl } from '@/lib/app-links'

// One tagged install link for social bios and videos:
//   https://www.plantspack.com/get?c=tiktok
// iPhone/iPad -> App Store, Android -> Google Play, both carrying the campaign
// so installs show per source in the store consoles. Desktop -> /app.
export const dynamic = 'force-dynamic'

export function GET(req: NextRequest) {
  const source = campaignSlug(req.nextUrl.searchParams.get('c'))
  const ua = req.headers.get('user-agent') || ''

  let target: string
  if (/iphone|ipad|ipod/i.test(ua)) target = appStoreUrl(source)
  else if (/android/i.test(ua)) target = playUrl(source, 'social')
  else target = new URL('/app', req.nextUrl.origin).toString()

  const res = NextResponse.redirect(target, 302)
  res.headers.set('Cache-Control', 'private, no-store')
  return res
}

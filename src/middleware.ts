import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { stripDiacritics } from '@/lib/slug'
import { sharedCookieDomain, SHARED_COOKIE_OPTIONS } from '@/lib/auth-cookie'

// Recipe pages removed for source violations (Minimalist Baker et al. per
// content policy). Listed explicitly because they are one-off deletions.
const GONE_RECIPES = new Set([
  '/recipe/spicy-garlicky-sesame-tofu-30-minutes',
  '/recipe/perfect-roasted-green-beans',
  '/recipe/the-ultimate-vegan-burrito-crunchwrap-inspired',
  '/recipe/chocolate-peanut-butter-ice-cream-bars-vegan',
])

function goneResponse() {
  return new NextResponse('Gone - this content has been permanently removed.', {
    status: 410,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

const NON_ASCII = /[-￿]/
const ASCII_ONLY = /^[ -~]+$/

// Paths that never need a logged-in user state to render. Skipping
// supabase.auth.getUser() here removes one round-trip per request to the
// Supabase auth server on the busiest part of the site (homepage, directory,
// place pages, blog, marketing). Sessions still refresh as soon as the user
// navigates to anything outside this set, because the refresh token is
// long-lived.
const PUBLIC_READONLY_PREFIXES = [
  '/vegan-places',
  '/place/',
  '/city-ranks',
  '/map',
  '/blog',
  '/recipe/',
  '/about',
  '/legal',
  '/contact',
  '/sitemap',
  '/robots.txt',
  '/manifest',
  '/api/scores',
  '/api/home',
  '/api/places/directory',
  '/api/cities/',
  '/api/stats',
  '/api/health',
]

function isPublicReadOnly(pathname: string): boolean {
  if (pathname === '/') return true
  for (const p of PUBLIC_READONLY_PREFIXES) {
    if (pathname === p || pathname.startsWith(p)) return true
  }
  return false
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Apex -> www 301 redirect. Without this, Google indexes both
  // plantspack.com/X and www.plantspack.com/X as separate URLs and we
  // bleed crawl budget: GSC 2026-05-14 export showed 80 "crawled-not-
  // indexed" and 128 "404" errors were apex-domain URLs that should
  // have redirected. One single fix collapses 208 reported errors.
  //
  // Exception: paths that mobile App Links / Universal Links verifiers
  // must reach on the apex without any redirect. Google's Android App
  // Links and Apple's iOS Universal Links both REFUSE to follow any
  // redirect when fetching their verification files. They also fetch
  // the actual deep-link URL itself (e.g. plantspack.com/vegan) and
  // expect 200 there — hence /vegan and the well-known files all
  // bypass the apex redirect on the apex host.
  const host = request.headers.get('host') || ''
  const isAppLinksPath =
    pathname.startsWith('/.well-known/') ||
    pathname === '/vegan' ||
    pathname.startsWith('/vegan/')
  if (host === 'plantspack.com' && !isAppLinksPath) {
    const url = request.nextUrl.clone()
    url.host = 'www.plantspack.com'
    url.protocol = 'https:'
    return NextResponse.redirect(url, 301)
  }

  // Serve 410 before auth logic runs - cheaper, and we don't need session
  // state for a gone page.
  if (GONE_RECIPES.has(pathname)) {
    return goneResponse()
  }

  // City/country slugs are stored as ASCII (e.g. "dusseldorf"), but legacy
  // links and external sites sometimes use the accented form
  // ("/vegan-places/germany/dusseldorf" with u-umlaut, encoded as %C3%BC).
  // Redirect any path containing non-ASCII chars to its canonical ASCII
  // form so those URLs resolve instead of 404ing.
  if (NON_ASCII.test(pathname)) {
    const canonical = stripDiacritics(pathname).toLowerCase()
    if (canonical !== pathname && ASCII_ONLY.test(canonical)) {
      const url = request.nextUrl.clone()
      url.pathname = canonical
      return NextResponse.redirect(url, 301)
    }
  }

  // Skip the Supabase auth round-trip entirely for public read-only paths.
  // The bulk of traffic (guests, bots, RSC prefetches) hits these.
  if (isPublicReadOnly(pathname)) {
    const res = NextResponse.next({ request: { headers: request.headers } })

    // 2026-06-11: Vercel edge-request anomaly traced to `/` returning
    // x-vercel-cache: MISS for every visit. The homepage server component
    // calls cookies() + supabase.auth.getUser() unconditionally, which
    // makes Next mark the route dynamic and override the
    // `public, max-age=10, swr=59` header we configured for it.
    //
    // Crawlers (Googlebot, GPTBot, ClaudeBot, Bing, etc.) hammer `/`,
    // /vegan-places/*, /place/* — these have no per-user content for
    // anonymous visitors, so it's safe to serve them from Vercel's CDN.
    //
    // `Vercel-CDN-Cache-Control` is Vercel-specific and is honoured even
    // on dynamic routes (overrides Next's no-store). It only applies to
    // the Vercel edge — browsers still see whatever Cache-Control the
    // page sets, so signed-in users won't get stale renders cached in
    // their own browser.
    //
    // Anonymous = no Supabase session cookie (sb-*-auth-token). Cookied
    // requests still go through the dynamic path unchanged.
    let hasAuthCookie = false
    for (const c of request.cookies.getAll()) {
      if (c.name.startsWith('sb-') && c.name.includes('auth-token')) {
        hasAuthCookie = true
        break
      }
    }
    if (!hasAuthCookie) {
      // 5 min fresh + 1 h stale-while-revalidate. Mutation paths
      // (add-place, review, etc.) already call revalidatePath('/') /
      // revalidatePath('/vegan-places/...') so fresh content still
      // appears within seconds of an update for repeat visitors.
      res.headers.set(
        'Vercel-CDN-Cache-Control',
        'public, s-maxage=300, stale-while-revalidate=3600',
      )
      return res
    }

    // Signed-in request to the homepage. The CDN cache key does NOT vary on
    // cookies, so once any guest visit primes the "/" entry (above), a
    // freshly signed-in user is served the cached GUEST render for up to
    // s-maxage + SWR - "homepage stays guest after Google login"
    // (2026-07-12). Middleware runs BEFORE the CDN cache, so rewriting
    // cookied "/" requests to a distinct key guarantees they reach the
    // dynamic per-user render. The browser URL stays "/" (rewrite, not
    // redirect); the variant is never CDN-cached because no CDN header is
    // set here and the page is cookies()-dynamic. Only "/" needs this: it
    // is the one public path that server-renders per-user content (pinned
    // cities etc.) - place/city pages personalize client-side.
    if (pathname === '/' && !request.nextUrl.searchParams.has('_authed')) {
      const url = request.nextUrl.clone()
      url.searchParams.set('_authed', '1')
      return NextResponse.rewrite(url, { request: { headers: request.headers } })
    }
    return res
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Supabase environment variables are missing in middleware.')
  }

  // auth cookies are scoped to .plantspack.com so play.plantspack.com shares
  // the session (host-scoped on localhost / preview hosts)
  const cookieDomain = sharedCookieDomain(request.headers.get('host'))
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: { ...SHARED_COOKIE_OPTIONS, ...(cookieDomain ? { domain: cookieDomain } : {}) },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          // purge the LEGACY host-scoped variants: a stale host-only cookie
          // with the same name would shadow the new .plantspack.com cookie
          // (browsers send both; the older one tends to win), leaving users
          // pinned to an expired session. Host-only delete kills only it.
          if (cookieDomain) {
            for (const { name } of cookiesToSet) {
              if (name.startsWith('sb-')) {
                response.headers.append(
                  'Set-Cookie',
                  `${name}=deleted; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0`
                )
              }
            }
          }
        },
      },
    }
  )

  // This will refresh session if expired - required for Server Components
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/stripe/webhooks (Stripe webhooks - no auth needed)
     * - api/health (health check endpoint)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/stripe/webhooks|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

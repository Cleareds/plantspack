import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Chain restaurants and supermarkets are banned per project rules (CLAUDE.md).
// Any /place/{chain}-* URL refers to a row that was deliberately removed —
// return 410 Gone so Google drops it quickly (404s get retried for weeks).
const CHAIN_PLACE_PATTERN = /^\/place\/(chipotle|subway|starbucks|aldi|lidl|mcdonald|burger-king|kfc|dominos|pizza-hut|walmart|costco|tesco|sainsburys|asda|waitrose|morrisons|carrefour|auchan|edeka|rewe|kaufland|penny|netto|dm|rossmann|greggs|pret|nandos|wagamama|five-guys|taco-bell|wendys|dunkin|tim-hortons|cafe-leonardo)-/i

// Recipe pages removed for source violations (Minimalist Baker et al. per
// content policy). Listed explicitly because they are one-off deletions.
const GONE_RECIPES = new Set([
  '/recipe/spicy-garlicky-sesame-tofu-30-minutes',
  '/recipe/perfect-roasted-green-beans',
  '/recipe/the-ultimate-vegan-burrito-crunchwrap-inspired',
  '/recipe/chocolate-peanut-butter-ice-cream-bars-vegan',
])

function goneResponse() {
  return new NextResponse('Gone — this content has been permanently removed.', {
    status: 410,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

export async function middleware(request: NextRequest) {
  // Serve 410 before auth logic runs — cheaper, and we don't need session
  // state for a gone page.
  const pathname = request.nextUrl.pathname
  if (CHAIN_PLACE_PATTERN.test(pathname) || GONE_RECIPES.has(pathname)) {
    return goneResponse()
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

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
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
// Shared auth cookie scope: sessions live on `.plantspack.com` so the game at
// play.plantspack.com sees the same login (same Supabase project). On any
// other host (localhost, vercel.app previews) we fall back to host-scoped
// cookies - a `.plantspack.com` cookie would be rejected by the browser there.

export function sharedCookieDomain(host: string | null | undefined): string | undefined {
  if (!host) return undefined
  const bare = host.split(':')[0].toLowerCase()
  return bare === 'plantspack.com' || bare.endsWith('.plantspack.com') ? '.plantspack.com' : undefined
}

export const SHARED_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  secure: true,
  // supabase-js manages expiry itself; a year keeps the refresh token cookie alive
  maxAge: 60 * 60 * 24 * 365,
}

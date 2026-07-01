// Server-side Cloudflare Turnstile verification for the web signup route.
//
// We verify the token here (in our own /api/auth/signup) rather than enabling
// Supabase's built-in captcha, because that setting is GLOBAL — it would force
// a captcha token on every email/password/OTP/reset call including the mobile
// app, breaking mobile auth. Verifying in our route scopes bot-protection to
// the web signup endpoint (the actual abuse surface) and leaves mobile alone.
//
// Gated on TURNSTILE_SECRET_KEY: when it's unset (e.g. before the keys are
// configured), verification is skipped so nothing breaks. Once set, a valid
// token is required.
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyTurnstile(
  token: string | null | undefined,
  remoteip?: string | null,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true // captcha not configured yet — don't block signups
  if (!token) return false

  try {
    const body = new URLSearchParams({ secret, response: token })
    if (remoteip) body.set('remoteip', remoteip)
    const res = await fetch(SITEVERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    // Fail closed: if a token was supplied but we can't verify it, treat as
    // untrusted rather than letting it through.
    return false
  }
}

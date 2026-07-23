import { NextResponse } from 'next/server'

/**
 * Remote feature flags for the PlantsPack MOBILE app.
 *
 * The mobile app fetches this at startup and fails safe (treats every flag as
 * false) if it's unreachable. Flipping a value here + a web redeploy changes
 * mobile behaviour WITHOUT an App Store / Play Store resubmit — so it doubles
 * as a kill switch. Keep it tiny, public, and cacheable.
 */
export const dynamic = 'force-static'
export const revalidate = 300 // ~5 min; flips propagate after a redeploy + cache TTL

export async function GET() {
  return NextResponse.json({
    // Show the "Support PlantsPack" row on iOS (opens the Buy Me a Coffee
    // donation page in the external browser). Post-2025 anti-steering, external
    // support links are permitted; this is the kill switch — set false to hide
    // it instantly if Apple ever objects. Default false so a fresh build ships
    // with no iOS support surface; flip true once the build is live.
    iosSupportEnabled: false,
  })
}

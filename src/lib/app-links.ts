// Store links for the Plants Pack mobile apps (live iOS + Android).
// App Store id from eas.json (ascAppId); Android package plantspack.app.
export const APPSTORE_URL = 'https://apps.apple.com/app/apple-store/id6779618901'
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=plantspack.app'

// App Store Connect provider token ("pt"). Apple only attributes a campaign
// link when both pt and ct are present; without pt the ct is ignored but
// harmless. Value: App Store Connect -> Analytics -> Acquisition -> Campaigns.
const APPLE_PROVIDER_TOKEN = '129022916'

// Campaign names are free text in our own links but untrusted on /get, so
// every entry point goes through the same sanitiser.
export function campaignSlug(raw: string | null | undefined, fallback = 'link'): string {
  const s = (raw || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40)
  return s || fallback
}

// Install attribution, visible per source in App Store Connect (Campaigns)
// and Play Console (Acquisition reports -> UTM). `source` is where the click
// came from (tiktok, instagram, web-footer, ...).
export function appStoreUrl(source: string): string {
  const params = new URLSearchParams({ ct: campaignSlug(source), mt: '8' })
  if (APPLE_PROVIDER_TOKEN) params.set('pt', APPLE_PROVIDER_TOKEN)
  return `${APPSTORE_URL}?${params}`
}

export function playUrl(source: string, medium = 'referral'): string {
  const referrer = new URLSearchParams({
    utm_source: campaignSlug(source),
    utm_medium: campaignSlug(medium, 'referral'),
  }).toString()
  return `${PLAY_URL}&referrer=${encodeURIComponent(referrer)}`
}

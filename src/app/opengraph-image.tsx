import { ImageResponse } from 'next/og'

// Auto-generated OG / social-share image for the homepage and any page
// that doesn't override its own. Mirrors the TopBar composition:
//   [logo SVG] Plants Pack
//              VEGAN SYNDICATE
// Renders at 1200×630 (the spec all major social platforms target).
//
// Replaces the older static /public/og-image.png so we don't have to
// hand-author a PNG when the brand mark changes - it pulls the SVG
// directly from /plantspack-logo-real.svg, which is the same file the
// TopBar renders.
export const runtime = 'edge'
export const alt = 'PlantsPack — vegan places, ranked by the community'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  // Fetch the brand SVG at render time. Edge runtime cannot read fs;
  // since the file ships in /public it's always reachable at the same
  // origin we're being rendered for. Fall back to absolute prod URL
  // during preview builds.
  const logoUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/plantspack-logo-real.svg`
    : 'https://www.plantspack.com/plantspack-logo-real.svg'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f5f9f4 0%, #e8f0e6 100%)',
          padding: 80,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
          <img src={logoUrl} alt="" width={220} height={220} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 132,
                fontWeight: 800,
                color: '#1f6f3a',
                letterSpacing: '-0.04em',
                lineHeight: 1,
              }}
            >
              Plants Pack
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: '#5a6b5e',
                letterSpacing: '0.32em',
                marginTop: 12,
                opacity: 0.7,
              }}
            >
              VEGAN SYNDICATE
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 32,
            color: '#3a4a3d',
            textAlign: 'center',
            maxWidth: 900,
            lineHeight: 1.3,
          }}
        >
          The world&apos;s vegan places, ranked by the community.
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 22,
            color: '#7a8a7e',
            letterSpacing: '0.08em',
          }}
        >
          plantspack.com  ·  free  ·  ad-free
        </div>
      </div>
    ),
    { ...size }
  )
}

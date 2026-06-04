import { ImageResponse } from 'next/og'

// Auto-generated OG / social-share image for the homepage and any page
// that doesn't override its own. Composes the brand's full pre-rendered
// logo PNG (animals + wordmark + tagline) onto a 1200x630 canvas - the
// spec all major social platforms target. Replaces the older Satori-
// rendered version that approximated the typography but didn't match.
//
// To update the brand mark: replace /public/og-logo.png. The OG endpoint
// and all downstream social previews will pick it up on next deploy.
export const runtime = 'edge'
export const alt = 'PlantsPack: free vegan tools and verified plant-based places worldwide'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  // Edge runtime can't read fs; the file ships in /public and is reachable
  // at the same origin we're being rendered for. Fall back to absolute
  // prod URL during preview builds where the host might differ.
  const logoUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/og-logo.png`
    : 'https://www.plantspack.com/og-logo.png'

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
        {/* Logo: 516 x 133 native; scaled to 900 x 232 to fill the canvas
            without cropping. Maintains the brand's exact typography. */}
        <img src={logoUrl} alt="" width={900} height={232} />
        <div
          style={{
            marginTop: 56,
            fontSize: 36,
            color: '#2a3a2d',
            textAlign: 'center',
            maxWidth: 960,
            lineHeight: 1.3,
          }}
        >
          Free vegan tools, verified places, honest answers.
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 22,
            color: '#5b6b5f',
            textAlign: 'center',
            maxWidth: 960,
            lineHeight: 1.4,
          }}
        >
          Barcode scanner  ·  Baking calculator  ·  Menu translator  ·  50K+ places
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 22,
            color: '#7a8a7e',
            letterSpacing: '0.08em',
          }}
        >
          plantspack.com  ·  ad-free  ·  no tracking
        </div>
      </div>
    ),
    { ...size }
  )
}

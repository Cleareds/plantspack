import { ImageResponse } from 'next/og'

// Default / FALLBACK OG image. Next uses this only for routes that don't set
// their own openGraph.images - place pages with photos, blog posts with heroes,
// events with images, etc. set their own and are unaffected. Image-less pages
// fall back to the brand banner shipped at /public/og-default.png.
export const runtime = 'edge'
export const alt = 'Plants Pack: free vegan tools and vegan & vegan-friendly places worldwide'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const bannerUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/og-default.png`
    : 'https://www.plantspack.com/og-default.png'

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bannerUrl}
          width={1200}
          height={630}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    ),
    { ...size }
  )
}

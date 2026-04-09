import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'PlantsPack — Vegan Community Platform'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#fafaf7',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://www.plantspack.com/plantspack9.png"
          width={140}
          height={140}
          style={{ marginBottom: 32 }}
        />
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: '#1b4332',
            marginBottom: 12,
            letterSpacing: '-2px',
          }}
        >
          PlantsPack
        </div>
        <div
          style={{
            fontSize: 18,
            color: '#6b7280',
            marginBottom: 36,
            letterSpacing: '4px',
            textTransform: 'uppercase',
          }}
        >
          vegan community platform
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#2d6a4f',
            textAlign: 'center',
            maxWidth: 800,
            lineHeight: 1.5,
          }}
        >
          Vegan places · Recipes · Events · Packs
        </div>
        <div
          style={{
            fontSize: 20,
            color: '#9ca3af',
            marginTop: 28,
          }}
        >
          Free · No ads · Community-driven
        </div>
      </div>
    ),
    { ...size }
  )
}

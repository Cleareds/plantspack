import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'PlantsPack — Vegan Community Platform for Europe'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 50%, #40916c 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: 'white',
            marginBottom: 16,
            letterSpacing: '-2px',
          }}
        >
          PlantsPack
        </div>
        <div
          style={{
            fontSize: 20,
            color: 'rgba(255,255,255,0.7)',
            marginBottom: 40,
            letterSpacing: '4px',
            textTransform: 'uppercase',
          }}
        >
          vegan syndicate
        </div>
        <div
          style={{
            fontSize: 32,
            color: 'white',
            textAlign: 'center',
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          2,700+ vegan places · 29 countries · Recipes · Events
        </div>
        <div
          style={{
            fontSize: 22,
            color: 'rgba(255,255,255,0.6)',
            marginTop: 30,
          }}
        >
          Free · No ads · Community-driven
        </div>
      </div>
    ),
    { ...size }
  )
}

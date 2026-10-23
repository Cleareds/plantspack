/**
 * Generates static brand files from the current wordmark (public/plantspack.svg):
 *   public/badges/find-us-on-plantspack-{light,dark}.svg  (website badge, 200x56)
 *   public/brand/plantspack-wordmark-green.png            (emails + structured data; Gmail does not show SVG)
 *   public/brand/plantspack-wordmark-white.png            (app supporter card)
 * Run: npx tsx scripts/generate-brand-assets.tsx
 */
import React from 'react'
;(globalThis as any).React = React
import { mkdirSync, writeFileSync } from 'fs'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'
import { WordmarkShapes } from '../src/components/brand/Wordmark'
import { WORDMARK_VIEWBOX } from '../src/components/brand/wordmark-data'

const GREEN = '#0A6A1D'
const FOREST = '#08361A'

function Badge({ dark }: { dark: boolean }) {
  const wmWidth = 172
  const wmHeight = (wmWidth * WORDMARK_VIEWBOX.height) / WORDMARK_VIEWBOX.width
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="56" viewBox="0 0 200 56" role="img" aria-label="Find us on PlantsPack">
      <title>Find us on PlantsPack</title>
      <rect x="0.75" y="0.75" width="198.5" height="54.5" rx="10" fill={dark ? GREEN : '#FFFFFF'} stroke={GREEN} strokeWidth="1.5" />
      <text x="14" y="20" fontFamily="Helvetica, Arial, sans-serif" fontSize="10.5" fontWeight="600" fill={dark ? '#D9F2C2' : FOREST}>Find us on</text>
      <svg x="14" y={27} width={wmWidth} height={wmHeight} viewBox={`0 0 ${WORDMARK_VIEWBOX.width} ${WORDMARK_VIEWBOX.height}`}>
        <WordmarkShapes color={dark ? '#FFFFFF' : GREEN} />
      </svg>
    </svg>
  )
}

function WordmarkFile({ color }: { color: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={WORDMARK_VIEWBOX.width} height={WORDMARK_VIEWBOX.height} viewBox={`0 0 ${WORDMARK_VIEWBOX.width} ${WORDMARK_VIEWBOX.height}`}>
      <WordmarkShapes color={color} />
    </svg>
  )
}

async function main() {
  mkdirSync('public/badges', { recursive: true })
  mkdirSync('public/brand', { recursive: true })
  for (const dark of [false, true]) {
    writeFileSync(`public/badges/find-us-on-plantspack-${dark ? 'dark' : 'light'}.svg`, renderToStaticMarkup(<Badge dark={dark} />) + '\n')
  }
  const wm = renderToStaticMarkup(<WordmarkFile color={GREEN} />)
  await sharp(Buffer.from(wm)).resize(1200).png().toFile('public/brand/plantspack-wordmark-green.png')
  const wmWhite = renderToStaticMarkup(<WordmarkFile color="#FFFFFF" />)
  await sharp(Buffer.from(wmWhite)).resize(1200).png().toFile('public/brand/plantspack-wordmark-white.png')
  console.log('written')
}
main()

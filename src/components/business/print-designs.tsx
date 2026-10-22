import QRCode from 'qrcode'
import Wordmark, { WordmarkShapes } from '@/components/brand/Wordmark'
import { WORDMARK_PARTS, WORDMARK_VIEWBOX } from '@/components/brand/wordmark-data'

/**
 * Print designs for the owner print kit (window sticker, table card).
 * No font loading here so the designs can also be rendered outside Next.
 */
// Print palette. The green is the logo's own; everything else supports it.
const C = {
  pack: '#0A6A1D',   // logo green, the sticker field
  forest: '#08361A', // text and QR modules on light grounds
  sprout: '#B9E36E', // the one bright accent, used sparingly
  paper: '#F1F7E8',  // table card ground
  white: '#FFFFFF',
}

export interface PlaceInfo { id: string; slug: string | null; name: string; city: string | null }
export type Format = 'sticker' | 'card' | 'sheet'

export const FORMATS: Array<{ id: Format; label: string; hint: string }> = [
  { id: 'sticker', label: 'Window sticker', hint: 'One round sticker, 8 cm across. Print on sticker paper and cut along the edge.' },
  { id: 'card', label: 'Table card', hint: 'A6 card for tables or the counter. Print on thick paper.' },
  { id: 'sheet', label: 'Sheet of 6 stickers', hint: 'Six 8 cm stickers on one A4 sticker sheet.' },
]

// www avoids the apex redirect; UTM tags make scans visible in analytics.
// Place pages ignore query strings, so the cached page is served.
export function qrTarget(place: PlaceInfo) {
  return `https://www.plantspack.com/place/${place.slug || place.id}?utm_source=qr&utm_medium=sticker`
}

/** QR modules as one SVG path, drawn in a size x size box. */
export function qrPath(text: string): { d: string; n: number } {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const n = qr.modules.size
  let d = ''
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (qr.modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`
    }
  }
  return { d, n }
}

/** Wordmark part placed inside another SVG at (x, y) with a given width. */
function WordmarkInSvg({ part, x, y, width, color }: { part: 'plants' | 'pack' | 'full'; x: number; y: number; width: number; color: string }) {
  const [x0, x1] = WORDMARK_PARTS[part]
  const w = x1 - x0
  const height = (width * WORDMARK_VIEWBOX.height) / w
  return (
    <svg x={x} y={y} width={width} height={height} viewBox={`${x0} 0 ${w} ${WORDMARK_VIEWBOX.height}`}>
      <WordmarkShapes color={color} />
    </svg>
  )
}

/**
 * Round window sticker, drawn as one SVG at 0.1 mm per unit (800 = 80 mm).
 * A solid green seal: the venue's name curves along the top edge, the
 * stacked wordmark and a white QR plate sit in the middle.
 */
/** Shorten at a word boundary so the name stays on the top half of the seal. */
function fitArcName(name: string, max: number): string {
  if (name.length <= max) return name
  const cut = name.slice(0, max + 1).replace(/\s+\S*$/, '')
  return (cut.length >= 8 ? cut : name.slice(0, max)).trim()
}

export function Sticker({ place, qr, uid, fontFamily }: { place: PlaceInfo; qr: { d: string; n: number }; uid: string; fontFamily: string }) {
  const name = fitArcName(place.name, 26)
  const nameSize = name.length > 20 ? 38 : name.length > 14 ? 44 : 48
  const plate = 300
  const qrSize = 262
  const plateX = 400 - plate / 2
  const plateY = 314
  return (
    <svg className="pk-sticker" viewBox="0 0 800 800" width="80mm" height="80mm" role="img" aria-label={`${place.name} on PlantsPack: scan for the page`}>
      <defs>
        {/* Top arc reads left to right over the top; bottom arc reads left to right under the bottom. */}
        <path id={`${uid}-top`} d="M 76 400 A 324 324 0 0 1 724 400" />
        <path id={`${uid}-bottom`} d="M 70 400 A 330 330 0 0 0 730 400" />
      </defs>
      <circle cx="400" cy="400" r="400" fill={C.pack} />
      <circle cx="400" cy="400" r="376" fill="none" stroke={C.sprout} strokeWidth="5" />
      <text fill={C.white} fontFamily={fontFamily} fontWeight={800} fontSize={nameSize} letterSpacing="1">
        <textPath href={`#${uid}-top`} startOffset="50%" textAnchor="middle">{name}</textPath>
      </text>
      <WordmarkInSvg part="plants" x={248} y={162} width={304} color={C.white} />
      <WordmarkInSvg part="pack" x={301.5} y={232} width={197} color={C.white} />
      <rect x={plateX} y={plateY} width={plate} height={plate} rx="28" fill={C.white} />
      <svg x={400 - qrSize / 2} y={plateY + (plate - qrSize) / 2} width={qrSize} height={qrSize} viewBox={`0 0 ${qr.n} ${qr.n}`} shapeRendering="crispEdges">
        <path d={qr.d} fill={C.forest} />
      </svg>
      <text fill={C.white} fontFamily={fontFamily} fontWeight={600} fontSize="34" letterSpacing="0.5">
        <textPath href={`#${uid}-bottom`} startOffset="50%" textAnchor="middle" dominantBaseline="hanging">Scan for our menu and reviews</textPath>
      </text>
    </svg>
  )
}

/** A6 table card in HTML (names wrap), QR inline. */
export function TableCard({ place, qr, fontClass }: { place: PlaceInfo; qr: { d: string; n: number }; fontClass: string }) {
  return (
    <div className={`pk-card ${fontClass}`}>
      <div className="pk-card-body">
        <div className={`pk-card-name${place.name.length > 26 ? ' pk-card-name-long' : ''}`}>{place.name}</div>
        <div className="pk-card-sub">is on PlantsPack</div>
        <div className="pk-card-plate">
          <svg viewBox={`0 0 ${qr.n} ${qr.n}`} shapeRendering="crispEdges" className="pk-card-qr" aria-label="QR code to our PlantsPack page">
            <path d={qr.d} fill={C.forest} />
          </svg>
        </div>
        <p className="pk-card-text">Scan for our menu, opening hours and reviews.</p>
        <p className="pk-card-text pk-card-quiet">Enjoyed your visit? A short review helps other vegans find us.</p>
      </div>
      <div className="pk-card-band">
        <Wordmark color={C.white} className="pk-card-wordmark" />
      </div>
    </div>
  )
}

export const PRINT_CSS = `
.pk-preview { background: #E7EDE2; border-radius: 16px; padding: 28px; overflow-x: auto; }
.print-area { margin: 0 auto; }
.print-area.pk-sticker { width: 80mm; }
.print-area.pk-sheet { width: 186mm; display: grid; grid-template-columns: 80mm 80mm; gap: 10mm 14mm; justify-content: center; }
.pk-sticker { display: block; }

.print-area.pk-card { width: 105mm; }
.pk-card { width: 105mm; height: 148mm; box-sizing: border-box; background: ${C.paper}; color: ${C.forest};
  display: flex; flex-direction: column; overflow: hidden; }
.pk-card-body { flex: 1; padding: 9mm 9mm 0; display: flex; flex-direction: column; }
.pk-card-name { font-size: 21pt; font-weight: 800; line-height: 1.05; letter-spacing: -0.01em; }
.pk-card-name-long { font-size: 16pt; }
.pk-card-sub { font-size: 11pt; font-weight: 400; margin-top: 1.5mm; }
.pk-card-plate { align-self: center; background: ${C.white}; border-radius: 3mm; padding: 4mm; margin: 6mm 0 5mm;
  box-shadow: inset 0 0 0 0.5mm ${C.sprout}; }
.pk-card-qr { display: block; width: 50mm; height: 50mm; }
.pk-card-text { font-size: 10.5pt; line-height: 1.35; margin: 0 0 2mm; max-width: 78mm; }
.pk-card-quiet { color: ${C.pack}; }
.pk-card-band { background: ${C.pack}; height: 20mm; display: flex; align-items: center; justify-content: center; }
.pk-card-wordmark { width: 72mm; height: auto; display: block; }

@media print {
  @page { size: A4; margin: 10mm; }
  body * { visibility: hidden !important; }
  .print-area, .print-area * { visibility: visible !important; }
  .print-area { position: absolute; left: 0; top: 0; }
  .pk-preview { background: none; padding: 0; }
  .no-print { display: none !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`

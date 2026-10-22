import { WORDMARK_PARTS, WORDMARK_PATHS, WORDMARK_SHIFTED_PATHS, WORDMARK_SHIFT_TRANSFORM, WORDMARK_TRANSFORM, WORDMARK_VIEWBOX } from './wordmark-data'

type Part = keyof typeof WORDMARK_PARTS

/**
 * The PlantsPack wordmark as inline SVG, in any colour. `part` crops the same
 * artwork to "PLANTS" or "PACK" so it can be stacked in tight spaces (round
 * stickers). Inline so it prints and recolours without loading a file.
 */
export default function Wordmark({ part = 'full', color = '#0a6a1d', className, title = 'PlantsPack' }: {
  part?: Part
  color?: string
  className?: string
  title?: string
}) {
  const [x0, x1] = WORDMARK_PARTS[part]
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${x0} 0 ${x1 - x0} ${WORDMARK_VIEWBOX.height}`}
      className={className}
      role="img"
      aria-label={title}
      preserveAspectRatio="xMidYMid meet"
    >
      <WordmarkShapes color={color} />
    </svg>
  )
}

/** The wordmark shapes in viewBox units, for embedding inside another SVG. */
export function WordmarkShapes({ color }: { color: string }) {
  return (
    <g transform={WORDMARK_TRANSFORM} fill={color}>
      {WORDMARK_PATHS.map((d, i) => <path key={i} d={d} />)}
      <g transform={WORDMARK_SHIFT_TRANSFORM}>
        {WORDMARK_SHIFTED_PATHS.map((d, i) => <path key={i} d={d} />)}
      </g>
    </g>
  )
}

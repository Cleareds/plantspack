// Stylised cluster of mature trees with a count badge. Used in
// leaderboards/cards to indicate the user has at least one matured tree.
// ViewBox 240x320 to match TreeStageSvg.

const TRUNK = '#7c4a1e'
const LEAF_DARK = '#047857'
const LEAF_MID = '#10b981'
const LEAF_LIGHT = '#6ee7b7'
const GRASS = '#65a30d'
const GRASS_DARK = '#3f6212'

function MiniTree({ cx, scale = 1, hue = 0 }: { cx: number; scale?: number; hue?: number }) {
  // Each tree is drawn relative to ground line y=296.
  const baseY = 296
  const topY = baseY - 90 * scale
  const branchY = baseY - 45 * scale
  const half = 4 * scale
  const cradle = (r: number) => r * scale
  return (
    <g transform={`translate(${cx} 0)`}>
      {/* trunk */}
      <path d={`M ${-half} ${baseY} L 0 ${topY} L ${half} ${baseY} Z`} fill={TRUNK} />
      <path d={`M 0 ${topY} L 0 ${baseY} L ${half} ${baseY} Z`} fill="#5b3514" opacity="0.35" />
      {/* simple branches */}
      <path d={`M 0 ${branchY} Q ${-12 * scale} ${branchY - 15 * scale} ${-22 * scale} ${branchY - 18 * scale}`}
        stroke={TRUNK} strokeWidth={1.6} fill="none" />
      <path d={`M 0 ${branchY} Q ${12 * scale} ${branchY - 15 * scale} ${22 * scale} ${branchY - 18 * scale}`}
        stroke={TRUNK} strokeWidth={1.6} fill="none" />
      {/* canopy */}
      <ellipse cx={0} cy={topY + 8 * scale} rx={cradle(28)} ry={cradle(22)} fill={LEAF_DARK} />
      <ellipse cx={-cradle(16)} cy={topY + cradle(14)} rx={cradle(14)} ry={cradle(11)} fill={LEAF_MID} />
      <ellipse cx={cradle(16)} cy={topY + cradle(14)} rx={cradle(14)} ry={cradle(11)} fill={LEAF_MID} />
      <ellipse cx={-cradle(8)} cy={topY - cradle(8)} rx={cradle(10)} ry={cradle(7)} fill={LEAF_LIGHT} opacity="0.9" />
      {hue ? <ellipse cx={cradle(6)} cy={topY + cradle(4)} rx={cradle(6)} ry={cradle(4)} fill={LEAF_LIGHT} opacity="0.7" /> : null}
    </g>
  )
}

export default function ForestPreview({
  count, size = 120, showBadge = true,
}: { count: number; size?: number; showBadge?: boolean }) {
  const aspectH = (size * 320) / 240
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" width={size} height={aspectH} role="img" aria-label={`Forest of ${count} trees`}>
      {/* ground */}
      <ellipse cx="120" cy="306" rx="120" ry="9" fill={GRASS_DARK} opacity="0.25" />
      <rect x="0" y="296" width="240" height="20" fill={GRASS} />
      {[15, 50, 90, 140, 190, 225].map((x, i) => (
        <path key={i} d={`M${x} 296 Q${x + 1} 290 ${x + 3} 296`} stroke={GRASS_DARK} strokeWidth="1.5" fill="none" />
      ))}
      {/* back row (smaller, slightly desaturated by being layered first) */}
      <MiniTree cx={50} scale={0.7} />
      <MiniTree cx={195} scale={0.75} hue={1} />
      {/* mid */}
      <MiniTree cx={90} scale={0.9} hue={1} />
      <MiniTree cx={158} scale={0.85} />
      {/* front centre */}
      <MiniTree cx={120} scale={1.0} hue={1} />

      {showBadge && count > 0 && (
        <g transform="translate(168 28)">
          <rect x="0" y="0" rx="14" ry="14" width="64" height="28" fill="#fffbeb" stroke="#a16207" strokeWidth="1.5" />
          <text x="32" y="19" textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif" fontSize="14" fontWeight="700" fill="#78350f">
            x{count}
          </text>
        </g>
      )}
    </svg>
  )
}

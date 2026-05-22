// Eight tree stages rendered as inline SVG. Each stage shares a common
// 200x240 viewBox so they line up across sizes. Colours are chosen to
// match the PlantsPack emerald palette; pot is a warm terracotta.
//
//   0  Empty plot         (terracotta pot, soil, nothing planted)
//   1  Seedling            (single sprout with two cotyledons)
//   2  Sapling             (short trunk + small leafy crown)
//   3  Young tree          (taller trunk, fuller crown)
//   4  Mature tree         (large layered canopy)
//   5  Flowering tree      (canopy + pink/white blossoms)
//   6  Heritage tree       (thick trunk, very wide canopy)
//   7  Ancient grove       (three connected trees on the soil)

type Props = { stage: number; className?: string; size?: number }

const POT = '#b45309'         // amber-700
const POT_DARK = '#78350f'    // amber-900
const POT_LIGHT = '#d97706'   // amber-600
const SOIL = '#3f2a14'
const LEAF = '#10b981'        // emerald-500
const LEAF_DARK = '#047857'   // emerald-700
const LEAF_LIGHT = '#34d399'  // emerald-400
const TRUNK = '#7c4a1e'
const TRUNK_DARK = '#4a2c0f'
const BLOSSOM_A = '#fbcfe8'   // pink-200
const BLOSSOM_B = '#f9a8d4'   // pink-300
const STEM = '#22c55e'

function Pot({ y = 168 }: { y?: number }) {
  // Pot is a trapezoid + rim. y is the top edge of the rim.
  return (
    <g>
      {/* rim */}
      <rect x="42" y={y} width="116" height="10" rx="3" fill={POT_DARK} />
      {/* body */}
      <path d={`M50 ${y + 10} L150 ${y + 10} L138 ${y + 62} L62 ${y + 62} Z`} fill={POT} />
      {/* highlight */}
      <path d={`M62 ${y + 12} L70 ${y + 60}`} stroke={POT_LIGHT} strokeWidth="3" strokeLinecap="round" />
      {/* soil oval */}
      <ellipse cx="100" cy={y + 8} rx="54" ry="4" fill={SOIL} />
    </g>
  )
}

function Leaf({ cx, cy, rx = 12, ry = 18, rot = 0, fill = LEAF }: { cx: number; cy: number; rx?: number; ry?: number; rot?: number; fill?: string }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} fill={fill} />
}

function StageContent({ stage }: { stage: number }) {
  switch (stage) {
    case 0:
      return <Pot />
    case 1:
      // Seedling: stem + two small cotyledons
      return (
        <g>
          <Pot />
          <path d="M100 175 L100 145" stroke={STEM} strokeWidth="3" strokeLinecap="round" />
          <Leaf cx={92} cy={150} rx={9} ry={6} rot={-30} fill={LEAF_LIGHT} />
          <Leaf cx={108} cy={150} rx={9} ry={6} rot={30} fill={LEAF_LIGHT} />
          {/* tiny tip */}
          <circle cx="100" cy="142" r="2" fill={LEAF} />
        </g>
      )
    case 2:
      // Sapling: short trunk + small layered crown
      return (
        <g>
          <Pot />
          <rect x="96" y="120" width="8" height="58" rx="3" fill={TRUNK} />
          <Leaf cx={100} cy={110} rx={26} ry={20} fill={LEAF} />
          <Leaf cx={88} cy={118} rx={14} ry={10} rot={-20} fill={LEAF_DARK} />
          <Leaf cx={112} cy={118} rx={14} ry={10} rot={20} fill={LEAF_DARK} />
        </g>
      )
    case 3:
      // Young tree: taller trunk, fuller crown
      return (
        <g>
          <Pot />
          <path d="M96 178 L100 100 L104 178 Z" fill={TRUNK} />
          <rect x="98" y="90" width="4" height="20" fill={TRUNK_DARK} opacity="0.4" />
          <circle cx="100" cy="90" r="34" fill={LEAF} />
          <circle cx="80" cy="100" r="20" fill={LEAF_DARK} />
          <circle cx="120" cy="100" r="20" fill={LEAF_DARK} />
          <circle cx="100" cy="76" r="18" fill={LEAF_LIGHT} />
        </g>
      )
    case 4:
      // Mature tree: large layered canopy
      return (
        <g>
          <Pot />
          <path d="M93 178 L100 70 L107 178 Z" fill={TRUNK} />
          <path d="M100 100 L70 130 M100 100 L130 130" stroke={TRUNK} strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="70" r="46" fill={LEAF_DARK} />
          <circle cx="70" cy="86" r="28" fill={LEAF} />
          <circle cx="130" cy="86" r="28" fill={LEAF} />
          <circle cx="100" cy="50" r="26" fill={LEAF_LIGHT} />
          <circle cx="84" cy="62" r="14" fill={LEAF_LIGHT} />
          <circle cx="116" cy="62" r="14" fill={LEAF_LIGHT} />
        </g>
      )
    case 5:
      // Flowering tree
      return (
        <g>
          <Pot />
          <path d="M92 178 L100 64 L108 178 Z" fill={TRUNK} />
          <path d="M100 100 L66 132 M100 100 L134 132" stroke={TRUNK} strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="64" r="48" fill={LEAF_DARK} />
          <circle cx="66" cy="82" r="30" fill={LEAF} />
          <circle cx="134" cy="82" r="30" fill={LEAF} />
          <circle cx="100" cy="42" r="28" fill={LEAF} />
          {/* blossoms */}
          {[
            [70, 70], [92, 50], [120, 56], [142, 76], [110, 40], [62, 94],
            [128, 96], [82, 64], [104, 80], [144, 98], [80, 102], [120, 80],
          ].map(([cx, cy], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r="4" fill={i % 2 === 0 ? BLOSSOM_A : BLOSSOM_B} />
              <circle cx={cx} cy={cy} r="1.5" fill="#fef3c7" />
            </g>
          ))}
        </g>
      )
    case 6:
      // Heritage tree: thick trunk + wide canopy, fruits
      return (
        <g>
          <Pot />
          <path d="M86 178 L100 56 L114 178 Z" fill={TRUNK} />
          <path d="M100 90 L60 124 M100 90 L140 124 M100 110 L78 144 M100 110 L122 144" stroke={TRUNK} strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="100" cy="58" rx="64" ry="44" fill={LEAF_DARK} />
          <circle cx="58" cy="74" r="28" fill={LEAF} />
          <circle cx="142" cy="74" r="28" fill={LEAF} />
          <circle cx="100" cy="32" r="30" fill={LEAF} />
          <circle cx="76" cy="46" r="16" fill={LEAF_LIGHT} />
          <circle cx="124" cy="46" r="16" fill={LEAF_LIGHT} />
          {/* fruits */}
          {[[72, 76], [128, 70], [100, 60], [88, 88], [114, 88]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="3.5" fill="#dc2626" />
          ))}
        </g>
      )
    case 7: {
      // Ancient grove: three trees side by side, no pot — they live in earth.
      const ground = (
        <g>
          <ellipse cx="100" cy="220" rx="92" ry="10" fill="#3f6212" opacity="0.25" />
          <rect x="6" y="218" width="188" height="14" rx="6" fill="#65a30d" />
        </g>
      )
      const tree = (cx: number, scale: number, hueShift = 0) => (
        <g transform={`translate(${cx} 0) scale(${scale})`}>
          <path d={`M-6 220 L0 ${110 + hueShift} L6 220 Z`} fill={TRUNK} />
          <circle cx={0} cy={110 + hueShift} r={34} fill={LEAF_DARK} />
          <circle cx={-18} cy={120 + hueShift} r={18} fill={LEAF} />
          <circle cx={18} cy={120 + hueShift} r={18} fill={LEAF} />
          <circle cx={0} cy={92 + hueShift} r={18} fill={LEAF_LIGHT} />
        </g>
      )
      return (
        <g>
          {ground}
          {tree(38, 0.85, 10)}
          {tree(100, 1.0, 0)}
          {tree(162, 0.9, 6)}
        </g>
      )
    }
    default:
      return <Pot />
  }
}

export default function TreeStageSvg({ stage, className = '', size = 120 }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 240"
      width={size}
      height={(size * 240) / 200}
      className={className}
      role="img"
      aria-label={`Tree stage ${stage}`}
    >
      <StageContent stage={stage} />
    </svg>
  )
}

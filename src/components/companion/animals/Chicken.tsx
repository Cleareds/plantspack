/**
 * Hand-drawn SVG chicken for the companion POC.
 *
 * Animation is pure CSS (defined in CompanionClient.module.css):
 *   - body: gentle vertical bob
 *   - head: independent slow bob
 *   - eye: occasional blink (scaleY)
 *   - tail: subtle wag
 *
 * Stays close to the logo's organic single-color silhouette aesthetic
 * but with a creamy body fill so the animal reads as a character, not
 * a logo glyph.
 */
export default function Chicken() {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label="Chicken companion"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      <g className="companion-body">
        {/* legs */}
        <g stroke="#0a6b1e" strokeWidth="3" strokeLinecap="round">
          <line x1="85" y1="160" x2="83" y2="180" />
          <line x1="115" y1="160" x2="117" y2="180" />
          <path d="M77 180 L83 180 L80 184 Z" fill="#fc0" stroke="none" />
          <path d="M113 180 L119 180 L116 184 Z" fill="#fc0" stroke="none" />
        </g>
        {/* tail feathers */}
        <g className="companion-tail" style={{ transformOrigin: '60px 130px' }}>
          <path d="M62 130 Q40 110 45 95 Q55 105 65 120 Z" fill="#fefdf8" stroke="#0a6b1e" strokeWidth="2" />
        </g>
        {/* body */}
        <ellipse cx="100" cy="130" rx="46" ry="38" fill="#fefdf8" stroke="#0a6b1e" strokeWidth="2.5" />
        {/* wing */}
        <path d="M95 115 Q120 125 105 152 Q88 142 95 115 Z" fill="#f7f4ea" stroke="#0a6b1e" strokeWidth="2" />
      </g>
      <g className="companion-head" style={{ transformOrigin: '135px 95px' }}>
        {/* head */}
        <circle cx="135" cy="90" r="28" fill="#fefdf8" stroke="#0a6b1e" strokeWidth="2.5" />
        {/* comb */}
        <path
          d="M124 62 Q128 50 132 60 Q136 50 140 60 Q144 50 148 62 Z"
          fill="#e74c3c"
          stroke="#0a6b1e"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* wattle */}
        <path d="M148 100 Q156 104 150 112 Z" fill="#e74c3c" stroke="#0a6b1e" strokeWidth="1.5" />
        {/* beak */}
        <polygon
          points="160,88 172,90 160,94"
          fill="#fc0"
          stroke="#0a6b1e"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* eye — animation target */}
        <g className="companion-eye" style={{ transformOrigin: '141px 84px' }}>
          <circle cx="141" cy="84" r="3.5" fill="#0a6b1e" />
          <circle cx="142" cy="83" r="1" fill="#fefdf8" />
        </g>
      </g>
    </svg>
  )
}

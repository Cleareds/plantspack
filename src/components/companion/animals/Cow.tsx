/**
 * Hand-drawn SVG cow companion. White body with soft black spots,
 * a tail tuft that swishes, ears that flick.
 */
export default function Cow() {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label="Cow companion"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      <g className="companion-body">
        {/* legs */}
        <g fill="#fefdf8" stroke="#0a6b1e" strokeWidth="2">
          <rect x="72" y="152" width="11" height="26" rx="2" />
          <rect x="118" y="152" width="11" height="26" rx="2" />
        </g>
        {/* hooves */}
        <g fill="#2c2118" stroke="none">
          <rect x="71" y="176" width="13" height="4" rx="1" />
          <rect x="117" y="176" width="13" height="4" rx="1" />
        </g>
        {/* tail */}
        <g className="companion-tail" style={{ transformOrigin: '50px 130px' }}>
          <line x1="50" y1="130" x2="38" y2="148" stroke="#0a6b1e" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="36" cy="151" rx="5" ry="6" fill="#fefdf8" stroke="#0a6b1e" strokeWidth="2" />
        </g>
        {/* body */}
        <ellipse cx="100" cy="130" rx="50" ry="32" fill="#fefdf8" stroke="#0a6b1e" strokeWidth="2.5" />
        {/* spots */}
        <ellipse cx="85" cy="120" rx="10" ry="7" fill="#2c2118" />
        <ellipse cx="120" cy="138" rx="12" ry="8" fill="#2c2118" />
        <ellipse cx="105" cy="148" rx="6" ry="4" fill="#2c2118" />
      </g>
      <g className="companion-head" style={{ transformOrigin: '150px 105px' }}>
        {/* head */}
        <ellipse cx="150" cy="105" rx="26" ry="28" fill="#fefdf8" stroke="#0a6b1e" strokeWidth="2.5" />
        {/* ears */}
        <ellipse cx="128" cy="92" rx="6" ry="9" fill="#fefdf8" stroke="#0a6b1e" strokeWidth="2" transform="rotate(-25 128 92)" />
        <ellipse cx="172" cy="92" rx="6" ry="9" fill="#fefdf8" stroke="#0a6b1e" strokeWidth="2" transform="rotate(25 172 92)" />
        {/* horns */}
        <path d="M134 84 Q132 78 136 76" fill="none" stroke="#0a6b1e" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M166 84 Q168 78 164 76" fill="none" stroke="#0a6b1e" strokeWidth="2.5" strokeLinecap="round" />
        {/* snout (muzzle area) */}
        <ellipse cx="150" cy="118" rx="16" ry="11" fill="#f5b7c4" stroke="#0a6b1e" strokeWidth="2" opacity="0.75" />
        <circle cx="144" cy="118" r="1.5" fill="#0a6b1e" />
        <circle cx="156" cy="118" r="1.5" fill="#0a6b1e" />
        {/* eyes */}
        <g className="companion-eye" style={{ transformOrigin: '143px 100px' }}>
          <circle cx="143" cy="100" r="3" fill="#0a6b1e" />
          <circle cx="144" cy="99" r="1" fill="#fefdf8" />
        </g>
        <g className="companion-eye" style={{ transformOrigin: '157px 100px' }}>
          <circle cx="157" cy="100" r="3" fill="#0a6b1e" />
          <circle cx="158" cy="99" r="1" fill="#fefdf8" />
        </g>
        {/* forehead tuft */}
        <path d="M148 82 q2 -6 4 0" fill="none" stroke="#0a6b1e" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

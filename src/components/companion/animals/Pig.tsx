/**
 * Hand-drawn SVG pig companion. Soft pink body, friendly snout.
 * Animated body breathing + curly tail wiggle + occasional blink.
 */
export default function Pig() {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label="Pig companion"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      <g className="companion-body">
        {/* legs */}
        <g fill="#f5b7c4" stroke="#0a6b1e" strokeWidth="2">
          <rect x="75" y="155" width="11" height="22" rx="3" />
          <rect x="114" y="155" width="11" height="22" rx="3" />
        </g>
        {/* tail (curly) */}
        <g className="companion-tail" style={{ transformOrigin: '55px 125px' }}>
          <path
            d="M55 125 q-10 -4 -8 -12 q4 -8 12 -4 q6 4 0 10"
            fill="none"
            stroke="#0a6b1e"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
        {/* body */}
        <ellipse cx="105" cy="130" rx="50" ry="32" fill="#f5b7c4" stroke="#0a6b1e" strokeWidth="2.5" />
        {/* belly tone */}
        <ellipse cx="108" cy="142" rx="28" ry="12" fill="#fbd4dc" opacity="0.7" />
      </g>
      <g className="companion-head" style={{ transformOrigin: '150px 110px' }}>
        {/* head */}
        <circle cx="150" cy="115" r="30" fill="#f5b7c4" stroke="#0a6b1e" strokeWidth="2.5" />
        {/* ears */}
        <path d="M132 92 Q132 80 142 86 Z" fill="#f5b7c4" stroke="#0a6b1e" strokeWidth="2" strokeLinejoin="round" />
        <path d="M168 92 Q168 80 158 86 Z" fill="#f5b7c4" stroke="#0a6b1e" strokeWidth="2" strokeLinejoin="round" />
        {/* snout */}
        <ellipse cx="166" cy="120" rx="11" ry="8" fill="#e89aaa" stroke="#0a6b1e" strokeWidth="2" />
        <circle cx="163" cy="120" r="1.5" fill="#0a6b1e" />
        <circle cx="170" cy="120" r="1.5" fill="#0a6b1e" />
        {/* eye */}
        <g className="companion-eye" style={{ transformOrigin: '146px 108px' }}>
          <circle cx="146" cy="108" r="3" fill="#0a6b1e" />
          <circle cx="147" cy="107" r="1" fill="#fefdf8" />
        </g>
      </g>
    </svg>
  )
}

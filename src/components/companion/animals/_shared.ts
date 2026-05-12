/**
 * Shared SVG attributes for all companion line drawings.
 *
 * Style target: thin continuous green outline (#0a6b1e to match the
 * brand logo), white fill, side-profile facing right, minimal interior
 * detail. Reference: hand-drawn lamb the user shared — but with the
 * wool scribbles dropped per "less detail like the logo".
 */

export const VIEW_BOX = '0 0 240 200'

// Attribute bundle for outlined SVG primitives. We rely on React's
// loose attribute typing when spread onto <path>, <ellipse>, <circle>
// etc., so use a permissive Record to avoid having to maintain one
// typed constant per primitive.
export const LINE: Record<string, string | number> = {
  fill: 'none',
  stroke: '#0a6b1e',
  strokeWidth: 2.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const FILL_GREEN: Record<string, string | number> = {
  fill: '#0a6b1e',
  stroke: 'none',
}

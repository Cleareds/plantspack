/**
 * Inline SVG brand icons.
 *
 * Lucide v1 dropped brand logos (per their brand-logo statement: maintainers
 * can't reliably keep dozens of third-party trademarks current). We only
 * need Facebook, X (Twitter), and Instagram for social-share buttons on
 * post and pack pages, so a few hand-rolled SVGs are cheaper than pulling
 * in a brands-only icon package.
 *
 * Each component matches the lucide API surface we relied on:
 *   <Facebook className="h-5 w-5 text-..."/>
 *
 * Sizing is driven by the parent's font-size via 1em; classes provide the
 * tailwind sizing and color via currentColor. aria-hidden by default to
 * match Lucide v1's accessibility behavior.
 */

import { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const baseProps = (props: IconProps): IconProps => ({
  xmlns: 'http://www.w3.org/2000/svg',
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  'aria-hidden': true,
  ...props,
})

export function Facebook(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M22 12a10 10 0 1 0-11.563 9.879v-6.988H7.898V12h2.539V9.797c0-2.507 1.493-3.892 3.776-3.892 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.563V12h2.773l-.443 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  )
}

// Marked "Twitter" but renders the current X glyph for visual consistency
// with the platform; the surrounding code still calls the prop Twitter to
// avoid churn in the share handler names.
export function Twitter(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.452-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  )
}

export function Instagram(props: IconProps) {
  return (
    <svg
      {...baseProps({
        ...props,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2 as unknown as number,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      })}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

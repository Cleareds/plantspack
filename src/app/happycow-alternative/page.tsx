import { permanentRedirect } from 'next/navigation'

// ASO/SEO keyword URL -> canonical comparison page (308). Avoids duplicate
// content while capturing "happycow alternative" link equity.
export default function HappyCowAlternative() {
  permanentRedirect('/compare/happycow')
}

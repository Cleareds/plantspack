'use client'

import { useEffect } from 'react'

/**
 * After hydration, swap the Material Symbols stylesheet from media="print"
 * to media="all" so its rules apply to screen rendering. Browsers fetch
 * print stylesheets at low priority and skip render-blocking on them,
 * which is exactly what we want during the LCP window.
 *
 * Why this is a React effect, not an inline <script>: doing the swap via
 * a synchronous inline script in <head> mutates the DOM before React
 * hydrates, triggering a hydration mismatch on the <link>'s `media`
 * attribute. That mismatch cascades into lazy-imported chunks failing
 * to instantiate. Running the swap inside a useEffect guarantees it
 * fires post-hydration.
 *
 * The user-perceptible cost of waiting one effect tick is negligible —
 * the stylesheet is already fetched (priority Low) by the time React
 * commits.
 */
export default function MaterialSymbolsSwap() {
  useEffect(() => {
    const l = document.getElementById('msym-stylesheet') as HTMLLinkElement | null
    if (l && l.media === 'print') l.media = 'all'
  }, [])
  return null
}

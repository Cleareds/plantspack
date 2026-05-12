/**
 * postinstall: empty Next.js's hardcoded polyfill-module.js
 *
 * Next 16 ships node_modules/next/dist/build/polyfills/polyfill-module.js
 * (plus the .map and esm/ copy) as a hardcoded ~1.4KB file that's bundled
 * into every page. It polyfills:
 *   String.trimStart / trimEnd
 *   Symbol.description
 *   Array.flat / flatMap / at
 *   Promise.finally
 *   Object.fromEntries / hasOwn
 *   URL.canParse
 *
 * Lighthouse audits the resulting ~13 KiB chunk as legacy polyfills. All
 * methods are native in our browserslist targets (Chrome 113+, Safari
 * 16.4+, Firefox 117+) so the polyfills are dead weight.
 *
 * Next.js has no config option to opt out, and browserslist doesn't
 * influence this file. Cleanest fix: overwrite the file at install time
 * with an empty no-op. Safe because every supported browser already has
 * these methods native; the polyfill IIFE was a no-op runtime-wise anyway.
 *
 * Runs automatically via npm's `postinstall` lifecycle, so it works on
 * Vercel builds (which run `npm install` then `next build`).
 */
const fs = require('fs')
const path = require('path')

const TARGETS = [
  'node_modules/next/dist/build/polyfills/polyfill-module.js',
  'node_modules/next/dist/esm/build/polyfills/polyfill-module.js',
]

const EMPTY = '/* polyfills stripped at install time - see scripts/strip-next-polyfills.js */\n'

let stripped = 0
for (const rel of TARGETS) {
  const p = path.resolve(rel)
  try {
    if (!fs.existsSync(p)) continue
    const current = fs.readFileSync(p, 'utf8')
    if (current === EMPTY) continue
    fs.writeFileSync(p, EMPTY)
    stripped++
  } catch (e) {
    console.warn(`[strip-polyfills] could not write ${rel}: ${e.message}`)
  }
}

if (stripped > 0) {
  console.log(`[strip-polyfills] emptied ${stripped} Next.js polyfill file(s)`)
}

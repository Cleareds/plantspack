import { readFileSync, writeFileSync } from 'node:fs'
const raw = readFileSync('/Users/antonkravchuk/.claude/projects/-Users-antonkravchuk-sidep-Cleareds-plantspack/b325823c-579c-478c-ace3-ff00247fe415/tool-results/mcp-chrome-devtools-evaluate_script-1778847505365.txt','utf8')
// File contains JSON with { len, c1, c2, c3 }
// Strip wrapping if any
const start = raw.indexOf('{')
const end = raw.lastIndexOf('}')
const obj = JSON.parse(raw.slice(start, end + 1))
const b64 = (obj.c1 || '') + (obj.c2 || '') + (obj.c3 || '')
const json = Buffer.from(b64, 'base64').toString('utf8')
const items = JSON.parse(json)
console.log('Decoded images:', items.length)
writeFileSync('scripts/seo-out/berlin-import-2026-05-15/images.json', JSON.stringify(items, null, 2))
console.log('Saved images.json')

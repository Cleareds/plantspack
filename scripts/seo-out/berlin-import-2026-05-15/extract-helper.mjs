// Helper to fetch + save the extracted Berlin list from the running browser.
// Designed to be re-runnable. Output: extracted.json
import { writeFileSync } from 'node:fs'
const ITEMS = process.argv[2] ? JSON.parse(process.argv[2]) : null
if (ITEMS) writeFileSync('scripts/seo-out/berlin-import-2026-05-15/extracted.json', JSON.stringify(ITEMS, null, 2))
console.log('Saved.')

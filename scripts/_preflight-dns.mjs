import { readFileSync, writeFileSync } from 'node:fs'
import { promises as dns } from 'node:dns'
const queue = JSON.parse(readFileSync('scripts/seo-out/summer-hub-audit-2026-05-15/chromedt-queue.json','utf8'))
const alive = []
const dead = []
for (const q of queue) {
  try {
    const host = new URL(q.website).hostname
    await dns.lookup(host)
    alive.push(q)
  } catch (e) {
    dead.push({ ...q, dnsError: e.code || e.message })
  }
}
console.log(`Alive: ${alive.length}`)
console.log(`Dead (DNS fail): ${dead.length}`)
dead.forEach(d => console.log(`  ${d.name} (${d.city}) — ${d.website} [${d.dnsError}]`))
writeFileSync('scripts/seo-out/summer-hub-audit-2026-05-15/chromedt-queue.json', JSON.stringify(alive, null, 2))
writeFileSync('scripts/seo-out/summer-hub-audit-2026-05-15/chromedt-dead.json', JSON.stringify(dead, null, 2))

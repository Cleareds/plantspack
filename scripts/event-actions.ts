#!/usr/bin/env tsx
/**
 * Mechanics for the update-events skill (weekly light / monthly deep events
 * routine). The skill does the judgment (WebSearch discovery, organizer-page
 * verification); this CLI does the DB work.
 *
 * Subcommands:
 *   status                       JSON: upcoming/past counts, events in the
 *                                next 30 days, countries with upcoming events,
 *                                horizon. Cheap orientation + cron guard.
 *   list [--window next30|next90|past|all]
 *                                Event posts as JSON (default next90).
 *   add --file <json>            Insert new events from a JSON array shaped
 *                                like import-events.ts EventPost. Dedupes by
 *                                slug AND by same-city date overlap + title
 *                                token match. Never overwrites.
 *   update <slug> [--start ISO] [--end ISO] [--ticket-url U] [--location L]
 *                [--free|--paid] [--cancelled] [--note "…"]
 *                                Patch event_data fields on an existing event.
 *                                NEVER updates title (posts has a slug-regen
 *                                trigger on title changes — the URL would
 *                                break). Cancelled events stay published with
 *                                event_data.cancelled=true; never deleted.
 *   digest --file <json>         Email the ops digest (same recipient as the
 *                                submissions digest).
 *
 * Never deletes anything (per CLAUDE.md data policy).
 */
import { config } from 'dotenv'
config({ path: '.env.local', quiet: true })

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { promises as dns } from 'dns'
import { sendEmail } from '@/lib/email'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ADMIN_USER_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const ADMIN_DIGEST_TO = 'anton.kravchuk@cleareds.com'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 && !process.argv[i + 1]?.startsWith('--') ? process.argv[i + 1] : undefined
}
function has(name: string): boolean { return process.argv.includes(name) }
function fail(msg: string): never { console.error(msg); process.exit(1) }

// ── Sourcing guard for `add` ──────────────────────────────────────────────
// An early import published 36 events whose dates were guessed "from annual
// pattern" with invented organizer URLs (21 dead domains, one hijacked by a
// gambling site). All were unpublished 2026-10-14. These checks run in code,
// so no run can publish such a row again, whatever the prompt says.
const GUESS_WORDS = /\b(estimat\w*|annual pattern|usually held|typically held|expected to (?:take place|return|be held)|projected|likely date|approximate date)\b/i
const PARKED = /\/lander\b|parked|domain (?:is )?for sale|buy this domain|sedoparking|hugedomains|dan\.com/i

async function fetchOrganizerPage(url: string): Promise<{ ok: true; text: string; finalUrl: string } | { ok: false; why: string }> {
  let host: string
  try { host = new URL(url).hostname } catch { return { ok: false, why: `not a URL: ${url}` } }
  try { await dns.lookup(host) } catch { return { ok: false, why: `DNS does not resolve: ${host}` } }
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15', Accept: 'text/html' } })
    if (!res.ok) return { ok: false, why: `HTTP ${res.status} at ${url}` }
    const finalUrl = res.url || url
    const text = (await res.text()).slice(0, 2_000_000)
    if (PARKED.test(finalUrl) || (PARKED.test(text) && text.length < 20000)) return { ok: false, why: `parked or for-sale domain: ${finalUrl}` }
    const fromHost = host.replace(/^www\./, ''), toHost = new URL(finalUrl).hostname.replace(/^www\./, '')
    if (fromHost !== toHost && !toHost.endsWith('.' + fromHost) && !fromHost.endsWith('.' + toHost)) {
      return { ok: false, why: `redirects off-site: ${host} -> ${toHost} (check it is still the organizer)` }
    }
    return { ok: true, text, finalUrl }
  } catch (e: any) { return { ok: false, why: `fetch failed for ${url}: ${e?.message || e}` } }
}

/** Returns null when the event may be published, else the reject reason. */
async function sourcingProblem(ev: any): Promise<string | null> {
  const ed = ev.event_data || {}
  if (ev.verified !== true) return 'not verified: set verified:true only after opening the organizer page and confirming date + venue'
  if (!ed.source_url) return 'missing event_data.source_url (the organizer page that states the date)'
  const words = [ev.title, ev.content, ed.title, ed.description, ed.update_note].filter(Boolean).join(' ')
  if (GUESS_WORDS.test(words)) return `text says the date is guessed ("${words.match(GUESS_WORDS)![0]}"); publish only organizer-stated dates`
  const start = new Date(ed.start_time)
  if (isNaN(start.getTime())) return `start_time is not a date: ${ed.start_time}`
  if (start.getTime() < Date.now() - 86400000) return `start_time is in the past: ${ed.start_time}`
  const page = await fetchOrganizerPage(ed.source_url)
  if (!page.ok) return `source_url failed: ${page.why}`
  const year = String(start.getUTCFullYear())
  if (!page.text.includes(year)) return `source_url never mentions ${year} - stale or wrong page (${page.finalUrl})`
  if (ed.ticket_url && ed.ticket_url !== ed.source_url) {
    const t = await fetchOrganizerPage(ed.ticket_url)
    if (!t.ok) return `ticket_url failed: ${t.why}`
  }
  return null
}

interface EventRow {
  id: string
  slug: string
  title: string | null
  content: string
  event_data: any
  created_at: string
  updated_at: string | null
}

async function fetchEvents(): Promise<EventRow[]> {
  const { data, error } = await sb
    .from('posts')
    .select('id, slug, title, content, event_data, created_at, updated_at')
    .eq('category', 'event')
    .eq('privacy', 'public')
    .is('deleted_at', null)
    .limit(1000)
  if (error) fail(`load failed: ${error.message}`)
  return (data || []) as EventRow[]
}

function endTime(e: EventRow): number {
  const ed = e.event_data || {}
  const iso = ed.end_time || ed.start_time
  return iso ? new Date(iso).getTime() : 0
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function titleTokens(t: string): Set<string> {
  return new Set(
    t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter(w => w.length > 3 && !['vegan', 'festival', 'fest', 'market', 'event', '2026', '2027'].includes(w)),
  )
}

async function cmdStatus() {
  const events = await fetchEvents()
  const now = Date.now()
  const upcoming = events.filter(e => endTime(e) >= now)
  const next30 = upcoming.filter(e => new Date(e.event_data?.start_time || 0).getTime() <= now + 30 * 864e5)
  const byCountry: Record<string, number> = {}
  let horizon = ''
  for (const e of upcoming) {
    const c = e.event_data?.country || '?'
    byCountry[c] = (byCountry[c] || 0) + 1
    const st = e.event_data?.start_time || ''
    if (st > horizon) horizon = st
  }
  console.log(JSON.stringify({
    total: events.length,
    upcoming: upcoming.length,
    past: events.length - upcoming.length,
    next30days: next30.map(e => ({
      slug: e.slug,
      title: e.event_data?.title || e.title,
      start: e.event_data?.start_time,
      end: e.event_data?.end_time,
      city: e.event_data?.city,
      country: e.event_data?.country,
      ticket_url: e.event_data?.ticket_url,
      cancelled: !!e.event_data?.cancelled,
    })),
    upcomingByCountry: byCountry,
    horizon,
  }, null, 1))
}

async function cmdList() {
  const events = await fetchEvents()
  const now = Date.now()
  const window = arg('--window') || 'next90'
  const filtered = events.filter(e => {
    const end = endTime(e)
    const start = new Date(e.event_data?.start_time || 0).getTime()
    if (window === 'past') return end < now
    if (window === 'all') return true
    if (window === 'next30') return end >= now && start <= now + 30 * 864e5
    return end >= now && start <= now + 90 * 864e5 // next90
  })
  filtered.sort((a, b) => (a.event_data?.start_time || '').localeCompare(b.event_data?.start_time || ''))
  console.log(JSON.stringify(filtered.map(e => ({
    slug: e.slug,
    title: e.event_data?.title || e.title,
    start: e.event_data?.start_time,
    end: e.event_data?.end_time,
    city: e.event_data?.city,
    country: e.event_data?.country,
    location: e.event_data?.location,
    ticket_url: e.event_data?.ticket_url,
    is_free: e.event_data?.is_free,
    cancelled: !!e.event_data?.cancelled,
  })), null, 1))
}

async function cmdAdd() {
  const file = arg('--file') || fail('add: --file required')
  const payload = JSON.parse(readFileSync(file, 'utf-8'))
  if (!Array.isArray(payload)) fail('add: file must be a JSON array')
  const existing = await fetchEvents()
  const results: any[] = []

  for (const ev of payload) {
    const ed = ev.event_data || {}
    // Hard requirements — an event we can't source or date is not publishable.
    if (!ev.title || !ev.content || !ed.title || !ed.start_time || !ed.city || !ed.country || !ed.ticket_url) {
      results.push({ title: ev.title || '(untitled)', outcome: 'rejected', note: 'missing required field (title/content/event_data.{title,start_time,city,country,ticket_url})' })
      continue
    }
    if (ed.country === 'Russia') {
      results.push({ title: ev.title, outcome: 'rejected', note: 'Russia excluded per policy' })
      continue
    }
    const problem = await sourcingProblem(ev)
    if (problem) {
      results.push({ title: ev.title, outcome: 'rejected', note: problem })
      continue
    }
    const slug = generateSlug(ev.title)
    // Dedupe 1: exact slug
    if (existing.some(e => e.slug === slug)) {
      results.push({ title: ev.title, outcome: 'duplicate', note: `slug ${slug} exists` })
      continue
    }
    // Dedupe 2: same city + overlapping dates + shared title tokens
    const newStart = new Date(ed.start_time).getTime()
    const newEnd = new Date(ed.end_time || ed.start_time).getTime()
    const newTokens = titleTokens(ev.title)
    const dupe = existing.find(e => {
      const xd = e.event_data || {}
      if ((xd.city || '').toLowerCase() !== ed.city.toLowerCase()) return false
      const xs = new Date(xd.start_time || 0).getTime()
      const xe = new Date(xd.end_time || xd.start_time || 0).getTime()
      if (xe < newStart || xs > newEnd) return false
      const xTokens = titleTokens(xd.title || e.title || '')
      let shared = 0
      for (const t of newTokens) if (xTokens.has(t)) shared++
      return shared >= 1 || newTokens.size === 0
    })
    if (dupe) {
      results.push({ title: ev.title, outcome: 'duplicate', note: `overlaps ${dupe.slug} in ${ed.city}` })
      continue
    }

    const { error } = await sb.from('posts').insert({
      user_id: ADMIN_USER_ID,
      title: ev.title,
      content: ev.content,
      slug,
      category: 'event',
      privacy: 'public',
      images: ev.images || [],
      image_url: (ev.images || [])[0] || null,
      event_data: ed,
      secondary_tags: ev.secondary_tags || [],
      // sourcingProblem() already required verified:true + a live organizer
      // source_url that mentions the event year.
      is_verified: true,
    })
    if (error) {
      results.push({ title: ev.title, outcome: 'failed', note: error.message })
    } else {
      results.push({ title: ev.title, outcome: 'added', slug, city: ed.city, country: ed.country, start: ed.start_time })
      existing.push({ id: '', slug, title: ev.title, content: ev.content, event_data: ed, created_at: '', updated_at: null })
    }
  }
  console.log(JSON.stringify(results, null, 1))
}

async function cmdUpdate(slug: string) {
  const { data: post, error } = await sb
    .from('posts')
    .select('id, slug, event_data')
    .eq('slug', slug)
    .eq('category', 'event')
    .single()
  if (error || !post) fail(`event not found: ${slug}`)
  const ed = { ...(post.event_data || {}) }
  const patch: Record<string, any> = {}
  // Setting explicit times means they were just verified — clear any stale
  // time_tbd flag so the event page stops hedging.
  if (arg('--start')) { ed.start_time = arg('--start'); ed.time_tbd = false }
  if (arg('--end')) { ed.end_time = arg('--end'); ed.time_tbd = false }
  if (arg('--ticket-url')) ed.ticket_url = arg('--ticket-url')
  if (arg('--location')) ed.location = arg('--location')
  if (has('--free')) ed.is_free = true
  if (has('--paid')) ed.is_free = false
  if (has('--cancelled')) ed.cancelled = true
  if (arg('--note')) ed.update_note = arg('--note')
  patch.event_data = ed
  const { error: upErr } = await sb.from('posts').update(patch).eq('id', post.id)
  if (upErr) fail(upErr.message)
  console.log(JSON.stringify({ ok: true, slug, event_data: ed }))
}

async function cmdDigest() {
  const file = arg('--file') || fail('digest: --file required')
  const items = JSON.parse(readFileSync(file, 'utf-8'))
  const rows = items.map((i: any) =>
    `<tr><td style="padding:4px 8px">${i.title || ''}</td><td style="padding:4px 8px">${i.city || ''}, ${i.country || ''}</td><td style="padding:4px 8px"><strong>${i.outcome}</strong></td><td style="padding:4px 8px">${i.note || ''}</td></tr>`,
  ).join('')
  const html = `<h2>Events routine digest</h2>
<p>${items.length} item(s) processed by the update-events routine.</p>
<table border="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">
<tr><th align="left" style="padding:4px 8px">Event</th><th align="left" style="padding:4px 8px">Where</th><th align="left" style="padding:4px 8px">Outcome</th><th align="left" style="padding:4px 8px">Note</th></tr>
${rows}</table>
<p><a href="https://www.plantspack.com/events">plantspack.com/events</a></p>`
  await sendEmail({ to: ADMIN_DIGEST_TO, subject: `[Plants Pack] Events routine: ${items.length} item(s)`, html, text: JSON.stringify(items, null, 2) })
  console.log(`digest emailed to ${ADMIN_DIGEST_TO}`)
}

async function main() {
  const cmd = process.argv[2]
  const id = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : undefined
  if (cmd === 'status') return cmdStatus()
  if (cmd === 'list') return cmdList()
  if (cmd === 'add') return cmdAdd()
  if (cmd === 'update') return cmdUpdate(id || fail('update: <slug> required'))
  if (cmd === 'digest') return cmdDigest()
  fail('Usage: event-actions.ts status|list|add|update|digest [args] — see header comment')
}

main().catch((e) => { console.error(e); process.exit(1) })

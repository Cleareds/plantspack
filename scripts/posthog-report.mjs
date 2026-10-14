// Read-only PostHog report for the mobile app (project 232987, EU cloud).
// Needs POSTHOG_PERSONAL_API_KEY (read-only, project-scoped) in .env.local.
// Usage: node scripts/posthog-report.mjs
import fs from 'node:fs'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const KEY = env.POSTHOG_PERSONAL_API_KEY
if (!KEY) { console.error('POSTHOG_PERSONAL_API_KEY missing in .env.local'); process.exit(1) }

async function q(query) {
  const r = await fetch('https://eu.posthog.com/api/projects/232987/query/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(JSON.stringify(d).slice(0, 400))
  return d.results
}
function table(title, cols, rows) {
  console.log(`\n## ${title}`)
  console.log(cols.join('\t'))
  for (const r of rows) console.log(r.join('\t'))
}

// Persons first seen per week, and how many came back in later weeks.
const FIRST = `
  select person_id, toStartOfWeek(min(timestamp), 1) as cohort
  from events where event = 'app_open' group by person_id`

const sections = [
  ['Weekly active users (app_open) by platform', ['week', 'platform', 'users', 'opens'], `
    select toStartOfWeek(timestamp, 1) w, properties.platform os, count(distinct person_id), count()
    from events where event = 'app_open' group by w, os order by w, os`],
  ['Retention by first-seen week (% of cohort active in week N)', ['cohort', 'size', 'w1%', 'w2%', 'w4%', 'w8%'], `
    with f as (${FIRST}),
    a as (select distinct person_id, toStartOfWeek(timestamp, 1) w from events where event = 'app_open')
    select f.cohort, count(distinct f.person_id) size,
      round(100 * countDistinctIf(a.person_id, dateDiff('week', f.cohort, a.w) = 1) / size, 1),
      round(100 * countDistinctIf(a.person_id, dateDiff('week', f.cohort, a.w) = 2) / size, 1),
      round(100 * countDistinctIf(a.person_id, dateDiff('week', f.cohort, a.w) = 4) / size, 1),
      round(100 * countDistinctIf(a.person_id, dateDiff('week', f.cohort, a.w) = 8) / size, 1)
    from f left join a on a.person_id = f.person_id
    group by f.cohort order by f.cohort`],
  ['Activation: share of all persons who ever did X', ['persons', 'viewed_place', 'saved', 'directions', 'tool', 'signed_up/in', 'suggested'], `
    select count(distinct person_id),
      countDistinctIf(person_id, event = 'place_viewed'),
      countDistinctIf(person_id, event = 'place_saved'),
      countDistinctIf(person_id, event = 'directions_opened'),
      countDistinctIf(person_id, event = 'tool_opened'),
      countDistinctIf(person_id, event in ('signed_up', 'signed_in')),
      countDistinctIf(person_id, event = 'suggest_place_submitted')
    from events`],
  ['Return rate by first-session behaviour (active on 2+ distinct days)', ['did_in_any_session', 'persons', 'returned%'], `
    with p as (
      select person_id,
        countDistinct(toDate(timestamp)) days,
        max(event = 'place_viewed') viewed, max(event = 'tool_opened') tool,
        max(event = 'place_saved') saved, max(event = 'directions_opened') dir,
        max(event = 'map_location_search') search
      from events group by person_id)
    select 'all', count(), round(100 * countIf(days >= 2) / count(), 1) from p
    union all select 'place_viewed', countIf(viewed), round(100 * countIf(viewed and days >= 2) / countIf(viewed), 1) from p
    union all select 'no place_viewed', countIf(not viewed), round(100 * countIf(not viewed and days >= 2) / countIf(not viewed), 1) from p
    union all select 'tool_opened', countIf(tool), round(100 * countIf(tool and days >= 2) / countIf(tool), 1) from p
    union all select 'map_location_search', countIf(search), round(100 * countIf(search and days >= 2) / countIf(search), 1) from p
    union all select 'place_saved', countIf(saved), round(100 * countIf(saved and days >= 2) / countIf(saved), 1) from p
    union all select 'directions_opened', countIf(dir), round(100 * countIf(dir and days >= 2) / countIf(dir), 1) from p`],
  ['Active users by country, last 30 days', ['country', 'users'], `
    select properties.$geoip_country_name c, count(distinct person_id) u
    from events where timestamp > now() - interval 30 day
    group by c order by u desc limit 15`],
  ['Tools opened (all time)', ['tool', 'opens', 'users'], `
    select properties.tool t, count(), count(distinct person_id)
    from events where event = 'tool_opened' group by t order by count() desc limit 15`],
  ['App version of last 14 days (OTA reach)', ['app_version', 'users'], `
    select properties.app_version v, count(distinct person_id)
    from events where timestamp > now() - interval 14 day group by v order by 2 desc limit 10`],
]

for (const [title, cols, sql] of sections) {
  try { table(title, cols, await q(sql)) }
  catch (e) { console.log(`\n## ${title}\nERROR ${e.message}`) }
}

// Draft listing for Vegan Life Live London 2027 (2026-10-22).
// Source: email from the organiser (Emma Meech, Marketing Executive, Prime Impact Events & Media) on 2026-10-14.
// Kept as DRAFT: event-actions.ts add requires an organiser web page that states 2027, which does not exist yet.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]}))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: dup } = await sb.from('posts').select('slug').eq('slug', 'vegan-life-live-london-2027')
if (dup.length) { console.log('exists already', dup); process.exit(0) }
const { data, error } = await sb.from('posts').insert({
  user_id: 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c',
  title: 'Vegan Life Live London 2027',
  slug: 'vegan-life-live-london-2027',
  category: 'event',
  privacy: 'draft',
  is_verified: false,
  images: [], image_url: null,
  content: 'Vegan Life Live London 2027\n\nVegan Life Live, the 100% vegan lifestyle show, returns to London from Friday 22 to Sunday 24 October 2027. The organiser has confirmed the dates. The venue, opening times and ticket prices will be announced on the organiser\'s website.',
  event_data: {
    title: 'Vegan Life Live London 2027',
    city: 'London', country: 'United Kingdom', location: 'London',
    start_time: '2027-10-22T10:00:00+01:00', end_time: '2027-10-24T17:00:00+01:00',
    is_free: false,
    ticket_url: 'https://london.veganlifelive.com/',
    description: '100% vegan lifestyle show in London, 22-24 October 2027. Venue, opening times and tickets to be announced.',
    update_note: 'dates from the organiser by email 2026-10-14; publish once london.veganlifelive.com states 2027 and the venue; times are placeholders',
  },
}).select('slug,privacy')
console.log(error?.message || JSON.stringify(data))

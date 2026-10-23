// Try Vegan stand by BE Vegan at Bio-Planet Saint-Gilles, 31 Oct 2026 (added 2026-10-23 at the user's request).
// Source: BE Vegan's own Facebook group post (volunteer call), pasted by the user; no organiser web page lists it.
// Venue address: Colruyt Group press release on the Saint-Gilles Bio-Planet store.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]}))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const slug = 'try-vegan-stand-bio-planet-saint-gilles-2026'
const { data: dup } = await sb.from('posts').select('slug').eq('slug', slug)
if (dup.length) { console.log('exists', dup); process.exit(0) }
const path = `events/${slug}.jpg`
const up = await sb.storage.from('post-images').upload(path, fs.readFileSync(process.argv[2]), { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' })
if (up.error) throw up.error
const img = sb.storage.from('post-images').getPublicUrl(path).data.publicUrl
const title = 'Try Vegan stand at Bio-Planet Saint-Gilles'
const { data, error } = await sb.from('posts').insert({
  user_id: 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c',
  title, slug, category: 'event', privacy: 'public', is_verified: false,
  images: [img], image_url: img,
  content: `Try Vegan stand at Bio-Planet Saint-Gilles\n\nBE Vegan, the Belgian vegan association, runs a Try Vegan stand at the Bio-Planet organic supermarket in Saint-Gilles (Sint-Gillis), Brussels, on Saturday 31 October 2026 from 1 pm to 5 pm.\n\nDrop by to taste free vegan samples, ask questions in Dutch or French, and sign up for Try Vegan, BE Vegan's free 30-day challenge to try plant-based eating.\n\nWant to help? BE Vegan is looking for volunteers for the stand, ideally people who speak both Dutch and French. A briefing is given beforehand, so no experience is needed. Contact BE Vegan to join.\n\nVenue: Bio-Planet, Waterloosesteenweg 71 / Chaussée de Waterloo 71, 1060 Saint-Gilles, Brussels.`,
  event_data: {
    title, city: 'Brussels', country: 'Belgium',
    location: 'Bio-Planet, Chaussée de Waterloo 71, 1060 Saint-Gilles',
    start_time: '2026-10-31T13:00:00+01:00', end_time: '2026-10-31T17:00:00+01:00',
    is_free: true,
    ticket_url: 'https://tryvegan.be/',
    image_url: img,
    source_url: 'https://www.facebook.com/groups/1601728796738916/permalink/4690199627891802/',
    description: 'BE Vegan info stand with free vegan samples and sign-ups for the free 30-day Try Vegan challenge. Sat 31 Oct, 1-5 pm. Volunteers (Dutch + French) welcome.',
    update_note: 'added 2026-10-23 from the organiser\'s own Facebook post (date, time, venue stated there); no organiser web page lists it',
  },
}).select('slug,privacy')
console.log(error?.message || JSON.stringify(data))

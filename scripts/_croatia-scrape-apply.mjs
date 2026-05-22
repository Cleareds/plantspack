import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'croatia-scrape-queue-2026-05-17'

const updates = [
  // Barakokula Split — confirmed FV
  { id: '09ea2232-785a-457d-ad4d-dc2df72d1d79', name: 'Barakokula', patch: {
    address: 'Ul. kralja Petra Krešimira IV 3, 21000 Split, Croatia',
    phone: '+385 98 448 476',
    opening_hours: 'Mo-Su 08:00-24:00',
    website: 'https://barakokula-plant-based.eatbu.com',
  } },
  // BioMania Zagreb — confirmed FV
  { id: '2350fbdf-72c6-4119-a601-d18096391a4d', name: 'BioMania', patch: {
    address: 'Ul. Ivana Tkalčića 65, 10000 Zagreb, Croatia',
    phone: '+385 91 936 2276',
    opening_hours: 'Mo-Sa 12:00-22:00; Su 10:00-13:00,12:00-22:00',
    website: 'https://biomania.hr/locations/biomania-zagreb/',
  } },
  // BioMania Street Food Bol — confirmed FV, seasonal
  { id: '27d5bf3c-4493-4f96-bd33-a1b67a6de158', name: 'Biomania Street Food', patch: {
    address: 'Put Zlatnog Rata, 21420 Bol, Croatia',
    phone: '+385 91 936 2276',
    opening_hours: 'May-Oct seasonal',
    website: 'https://biomania.hr/',
  } },
  // Pandora GreenBox Split — DOWNGRADE: not 100% vegan per scrape ("not all items vegan")
  { id: 'bf6f9298-f680-4577-8a5f-850198172677', name: 'Pandora Greenbox', patch: {
    address: 'Obrov 4, 21000 Split, Croatia',
    phone: '+385 21 236 120',
    website: 'https://pandoragreenbox.com/',
    vegan_level: 'mostly_vegan',
  } },
  // Simple Green Zagreb — confirmed FV
  { id: '43bc7fa7-e522-4f2b-986c-67a7aca8d471', name: 'Simple green', patch: {
    address: 'Sutlanska 1, 10000 Zagreb, Croatia',
    website: 'https://www.simplegreenbyjelena.com/',
  } },
  // The Botanist Zadar — confirmed FV
  { id: '6b4321b4-6f09-40a5-9d58-13f0d0c65c93', name: 'The Botanist', patch: {
    address: 'Ul. Mihovila Pavlinovića 4, 23000 Zadar, Croatia',
    phone: '+385 92 423 2296',
    opening_hours: 'Mo-Su 13:00-22:00',
    website: 'https://botanistzadar.com/en/',
  } },
  // VEG Split — confirmed FV (page says vegan)
  { id: 'df367b8e-adba-42ef-99f1-afca356ae10e', name: 'VEG', patch: {
    address: 'Ujevićeva Poljana 5, 21000 Split, Croatia',
    phone: '+385 99 344 4648',
    opening_hours: 'Mo-Su 10:00-22:00',
    website: 'https://veg-plant-based.eatbu.com/',
  } },
  // Vegehop Zagreb — confirmed FV, 25 years
  { id: 'b121f2fa-fdb2-428f-a1d0-06079ba760ca', name: 'Vegehop', patch: {
    address: 'Vlaška 79, 10000 Zagreb, Croatia',
    phone: '+385 1 464 9400',
    opening_hours: 'Mo-Su 12:00-20:00',
    website: 'https://www.vegehop.hr/',
  } },
  // Zrno Bio Bistro Zagreb — confirmed FV
  { id: 'faeab079-8d8a-40f8-80ff-1f33fc4407a3', name: 'Zrno bio bistro', patch: {
    address: 'Medulićeva 20, 10000 Zagreb, Croatia',
    phone: '+385 1 484 7540',
    opening_hours: 'Mo-Sa 12:00-23:00',
    website: 'https://zrnobiobistro.hr/',
  } },
  // OPG Natura škoj — REVIEW_NOT_RESTAURANT confirmed (under construction site, likely olive oil/farm). Downgrade.
  { id: '8755d72b-ed38-47b9-9d0a-49e7daee5e91', name: 'OPG Natura škoj', patch: {
    vegan_level: 'vegan_friendly',
  } },
  // Vegan Sailing — confirmed not a restaurant, it's an experience. Keep FV but tag as experience to exclude from restaurant count.
  { id: '201b9669-56d1-43ae-9aec-c5a4e03c6440', name: 'Vegan Sailing', patch: {
    website: 'https://www.vegansailing.eu',
    description: '100% vegan sailing experience along the Croatian Adriatic coast (Krk, Zadar, Split, Dubrovnik). Private vegan-chef yacht charters, May-Sep season, 7-14 day trips. Not a restaurant — exclude from FV restaurant count.',
    tags: ['experience', 'sailing', 'not_a_restaurant', 'seasonal'],
  } },
]

for (const u of updates) {
  u.patch.verification_method = TAG
  u.patch.last_verified_at = NOW
  const { error } = await sb.from('places').update(u.patch).eq('id', u.id)
  const fields = Object.keys(u.patch).filter(k => k !== 'verification_method' && k !== 'last_verified_at')
  console.log(`  ${error ? '✗' : '✓'} ${u.name}: ${fields.join(', ')}`)
  if (error) console.error('    ', error.message)
}

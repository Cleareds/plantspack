#!/usr/bin/env tsx
/**
 * Create a community post from the PlantsPack admin account welcoming
 * new users and summarizing recent platform updates.
 *
 * Usage:
 *   tsx scripts/post-community-update.ts              # dry-run (prints)
 *   tsx scripts/post-community-update.ts --commit     # insert
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const commit = process.argv.includes('--commit')

const content = `🌱 Welcome to PlantsPack — and a quick update!

If you just joined: PlantsPack is a community-first directory of 100% vegan and vegan-friendly places — restaurants, cafés, bakeries, stores, hotels and sanctuaries — plus recipes, trip packs, and the people who love them. Everything here is either submitted by community members or carefully sourced and verified.

A few things that landed this week you might like:

🗺️ Bigger, cleaner map
We switched to a free open-source map provider and added a legend, hover previews, and star ratings right on the pins so you can scan a city at a glance.

📍 37,000+ places worldwide
We've finished an import + verification sweep across Foursquare, OpenStreetMap and VegGuide. Ugly slug URLs have been fixed site-wide and your old bookmarks will still work — we redirect them automatically.

✅ "Yes, looks correct" button
Every place now has a community-verify prompt. If you've been, just tap "Yes, looks correct" and it becomes community-verified for everyone. Flag anything that's closed or wrong and it goes to our review queue.

🏙️ Smarter city pages
Oxford, UK no longer mysteriously redirects to Oxford, NZ 🙃 — same for a lot of cities that share a name. You can now get to any city by searching its country + name directly.

🏡 New retreat listings
La Grange des Rochers (Paley, France) and more fully-vegan stays have been added to the Hotels category.

Coming up soon:
• Vegan experience rating + "survival tips" for non-vegan cities
• Profile contributions page where you can edit/unpublish your own adds
• Date-night / fancy filter for restaurants
• Top vegan experiences worldwide — a curated list

Thanks for being here. If you notice something off, hit the flag button — it really helps us keep the data honest. And if you want to add your favourite place, the "+ Add place" button at the top is yours.

— The PlantsPack team 🌱`

async function main() {
  const { data: adminUser, error: uErr } = await supabase
    .from('users')
    .select('id, username')
    .eq('role', 'admin')
    .limit(1)
    .single()

  if (uErr || !adminUser) {
    console.error('No admin user found:', uErr?.message)
    process.exit(1)
  }

  console.log(`Posting as: ${adminUser.username} (${adminUser.id})`)
  console.log('\n--- CONTENT ---')
  console.log(content)
  console.log('--- END ---\n')

  if (!commit) {
    console.log(`(dry-run — ${content.length} chars — rerun with --commit)`)
    return
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: adminUser.id,
      content,
      category: 'general',
      privacy: 'public',
      images: [],
    })
    .select('id')
    .single()

  if (error) {
    console.error('Insert failed:', error.message)
    process.exit(1)
  }

  console.log(`✓ Posted. ID: ${data.id}`)
}

main().catch(e => { console.error(e); process.exit(1) })

#!/usr/bin/env tsx
/**
 * Seed the first few admin-authored city experiences so the section isn't
 * empty when users discover it. Idempotent — reuses the (user, city, country)
 * upsert constraint.
 *
 * Usage:
 *   tsx scripts/seed-city-experiences.ts              # dry-run
 *   tsx scripts/seed-city-experiences.ts --commit     # insert
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const commit = process.argv.includes('--commit')

function slug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

interface Seed {
  city: string
  country: string
  overall: number
  eating_out: number
  grocery: number
  summary: string
  tips: string[]
  best_neighborhoods?: string
  visited_period?: string
}

const SEEDS: Seed[] = [
  {
    city: 'Berlin', country: 'Germany',
    overall: 5, eating_out: 5, grocery: 5,
    summary: 'Berlin is a vegan paradise. Nearly every café has plant milk, restaurants from every cuisine have labeled vegan options, and the density of fully-vegan spots — especially in Friedrichshain, Neukölln, and Kreuzberg — is unmatched in Europe. Even Currywurst has a vegan cousin at basically every street corner.',
    tips: [
      'Most bakeries have vegan pastries — ask for "vegan" pastries and they\'ll point you to a separate tray.',
      'DM (drugstore) stocks a huge plant-milk + vegan-chocolate aisle, cheaper than supermarkets.',
      'Check "Peta Zwei" city guide or the @vegan_berlin Instagram for pop-ups and new openings.',
      'Döner is easy — ask for "vegan Döner" or look for Seitan / Soja options on the board.',
    ],
    best_neighborhoods: 'Friedrichshain, Neukölln, Kreuzberg, Prenzlauer Berg',
    visited_period: 'Lived 3+ years',
  },
  {
    city: 'Bangkok', country: 'Thailand',
    overall: 4, eating_out: 4, grocery: 3,
    summary: 'Bangkok is surprisingly easy if you know the language. Thai food is naturally plant-heavy but fish sauce and oyster sauce are everywhere — look for "jay" (เจ) restaurants, which are strictly plant-based (Buddhist tradition). Chatuchak weekend market has dozens of jay food stalls. Modern vegan-branded places have opened in Sukhumvit and Ari.',
    tips: [
      'Learn "kin jay" (กินเจ = I eat vegan) — shop owners instantly understand.',
      'Avoid fish sauce: ask "mai sai nam pla" (ไม่ใส่น้ำปลา).',
      'Jay stalls have yellow flags with red writing — they\'re everywhere once you spot them.',
      'Vegetarian Festival (Sep/Oct) turns the whole city into a vegan street-food fair.',
    ],
    best_neighborhoods: 'Sukhumvit Soi 33, Ari, Ratchathewi, Chatuchak',
    visited_period: 'Visited Feb 2026',
  },
  {
    city: 'Lisbon', country: 'Portugal',
    overall: 4, eating_out: 4, grocery: 4,
    summary: 'Lisbon has a growing vegan scene concentrated in the hip neighborhoods. Most restaurants now have a vegan option or full menu — especially brunch spots. Traditional tascas are harder (everything has fish, ham, or eggs), but the new wave is strong. Pingo Doce and Continente supermarkets have decent vegan aisles.',
    tips: [
      '"Vegano" is understood everywhere — say it clearly and double-check.',
      'Pastel de nata vegan is increasingly available at trendy bakeries — Fábrica da Nata does a good one.',
      'Skip ginjinha with cherries if they\'re suspect — but the liquor itself is usually vegan.',
      'Friday-Sunday brunch spots fill up fast — book ahead at Ao 26, Vegana Burgers, The Food Temple.',
    ],
    best_neighborhoods: 'Príncipe Real, Cais do Sodré, Alfama edges, Intendente',
    visited_period: 'Visited Mar 2026',
  },
  {
    city: 'Barcelona', country: 'Spain',
    overall: 4, eating_out: 4, grocery: 4,
    summary: 'Barcelona is friendlier than the rest of Spain for vegans. Gràcia has the highest density of vegan-labeled spots; El Born has the best brunch. Tapas bars usually have at least pan con tomate, patatas bravas (check the sauce), and escalivada. Bocadillo vegetal is your street-snack friend.',
    tips: [
      'Bravas sauce often contains egg — ask "sin huevo" to be safe.',
      'Patatas + pan + escalivada + olives = a full vegan tapas meal anywhere.',
      'Mercado de Sant Antoni has a full vegan stall on Sunday morning.',
      'Avoid tourist traps on La Rambla — walk 2 blocks into Raval or Born instead.',
    ],
    best_neighborhoods: 'Gràcia, El Born, Poble Sec, Sant Antoni',
    visited_period: 'Visited Jan 2026',
  },
  {
    city: 'Ciudad de Mexico', country: 'Mexico',
    overall: 4, eating_out: 4, grocery: 3,
    summary: 'CDMX has a surprising amount of vegan street food if you know where to look. Traditional dishes like frijoles, nopales, tlayuda (ask for no cheese), and quesadillas de hongos are easily made vegan. Roma Norte and Condesa have a booming new-wave vegan scene. Markets (like Mercado Medellín) have fresh fruit, nuts, dried chilies at great prices.',
    tips: [
      'Ask "sin crema y sin queso" at taco stands — most will oblige and the taco is still great.',
      'Tlacoyos de frijol + nopales = the most underrated vegan Mexican street food.',
      'Jugos verdes (green juices) are everywhere and dairy-free by default.',
      'Watch for manteca (lard) in tamales and frijoles — ask "sin manteca".',
    ],
    best_neighborhoods: 'Roma Norte, Condesa, Coyoacán, Juárez',
    visited_period: 'Visited Nov 2025',
  },
]

async function main() {
  console.log(`Mode: ${commit ? 'COMMIT' : 'DRY-RUN'} · ${SEEDS.length} seeds\n`)

  // Find admin user
  const { data: admin } = await supa
    .from('users')
    .select('id, username')
    .eq('role', 'admin')
    .limit(1)
    .single()

  if (!admin) {
    console.error('No admin user found')
    process.exit(1)
  }
  console.log(`Seeding as @${admin.username} (${admin.id})\n`)

  for (const s of SEEDS) {
    const citySlug = slug(s.city)
    const countrySlug = slug(s.country)
    console.log(`  ${s.city}, ${s.country}  →  /${countrySlug}/${citySlug}`)
    if (!commit) continue

    const { data: existing } = await supa
      .from('city_experiences')
      .select('id')
      .eq('user_id', admin.id)
      .eq('city_slug', citySlug)
      .eq('country_slug', countrySlug)
      .is('deleted_at', null)
      .maybeSingle()

    const payload = {
      user_id: admin.id,
      city: s.city,
      country: s.country,
      city_slug: citySlug,
      country_slug: countrySlug,
      overall_rating: s.overall,
      eating_out_rating: s.eating_out,
      grocery_rating: s.grocery,
      summary: s.summary,
      tips: s.tips,
      best_neighborhoods: s.best_neighborhoods ?? null,
      visited_period: s.visited_period ?? null,
    }

    if (existing) {
      const { error } = await supa.from('city_experiences').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', existing.id)
      if (error) console.error(`    ✗ ${error.message}`); else console.log(`    ↻ updated`)
    } else {
      const { error } = await supa.from('city_experiences').insert(payload)
      if (error) console.error(`    ✗ ${error.message}`); else console.log(`    ✓ inserted`)
    }
  }

  if (!commit) console.log('\n(dry-run — rerun with --commit to persist)')
}

main().catch(e => { console.error(e); process.exit(1) })

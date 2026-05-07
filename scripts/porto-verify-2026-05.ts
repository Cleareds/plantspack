/**
 * Apply WebSearch-verified address + description corrections to the
 * Porto bulk import (Phase 2). All corrections are sourced from
 * post-import web verification — every claim was cross-checked against
 * Tripadvisor, daTerra's own site, and HappyCow.
 *
 * Re-runnable.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

interface Patch {
  slug: string
  address?: string
  latitude?: number
  longitude?: number
  phone?: string
  description?: string
}

const PATCHES: Patch[] = [
  {
    slug: 'daterra-foz-do-douro-porto',
    address: 'Rua das Sobreiras 514, 4150-713 Porto',
    // Foz do Douro precise coords for Rua das Sobreiras
    latitude: 41.1531,
    longitude: -8.6717,
    phone: '+351 226 161 257',
    description: '100% vegan all-you-can-eat buffet in the Foz do Douro neighbourhood. Part of the daTerra plant-based buffet chain. Mon-Sat 12:00-16:00 & 19:00-23:00, Sun 12:00-16:00.',
  },
  {
    slug: 'daterra-campus-sao-joao-porto',
    address: 'Shopping Campus São João, Rua Dr. Plácido da Costa, loja 214-A, 4200-450 Porto',
    latitude: 41.1820,
    longitude: -8.6021,
    phone: '+351 220 133 377',
    description: '100% vegan restaurant inside Shopping Campus São João, near the hospital. Part of the daTerra plant-based chain. Has shifted from buffet to menu-based service per recent reports.',
  },
  {
    slug: 'capuchinho-verde-porto',
    address: 'Praceta Francisco Borges 31, Porto',
    description: '100% vegan artisanal bakery and patisserie. Traditional Portuguese pastries — including the famous bolas de Berlim — made without animal-origin ingredients. Online ordering and pickup; no public walk-in shop.',
  },
]

async function main() {
  let updated = 0
  for (const p of PATCHES) {
    const update: any = {}
    if (p.address) update.address = p.address
    if (p.latitude != null) update.latitude = p.latitude
    if (p.longitude != null) update.longitude = p.longitude
    if (p.phone) update.phone = p.phone
    if (p.description) update.description = p.description

    const { data, error } = await sb
      .from('places')
      .update(update)
      .eq('slug', p.slug)
      .select('id, slug, address')
      .maybeSingle()
    if (error) { console.warn(`  [fail] ${p.slug}: ${error.message}`); continue }
    if (!data) { console.warn(`  [not found] ${p.slug}`); continue }
    updated++
    console.log(`  [updated] ${p.slug} -> ${(data as any).address}`)
  }
  console.log('')
  console.log(`Updated: ${updated} / ${PATCHES.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })

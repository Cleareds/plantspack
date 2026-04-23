/**
 * One-off: soft-archive admin-added chain restaurants per the Platonic-
 * form-is-vegan policy (claude.md). Matches name exactly (or with
 * trailing apostrophe/variant) for each brand to avoid false positives
 * on independent places that happen to share a word (e.g. "Thai Chili"
 * must not match "Chili's").
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
const ADMIN_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const DRY_RUN = !process.argv.includes('--commit')

// Each entry: brand label + ILIKE pattern tuned to that brand.
// Goal: match exactly the chain locations, no independents.
const BRANDS: Array<{ label: string; patterns: string[]; expect: number }> = [
  { label: 'Bojangles',               patterns: ['Bojangles%'],              expect: 1  },
  { label: 'Blaze Pizza',             patterns: ['Blaze Pizza%'],            expect: 1  },
  { label: 'Cheesecake Factory',      patterns: ['The Cheesecake Factory%', 'Cheesecake Factory%'], expect: 3  },
  { label: "Chili's",                 patterns: ["Chili's%"],                expect: 4  },
  { label: 'Cracker Barrel',          patterns: ['Cracker Barrel%'],         expect: 2  },
  { label: "Culver's",                patterns: ["Culver's%", 'Culvers%'],   expect: 4  },
  { label: 'Gourmet Burger Kitchen',  patterns: ['Gourmet Burger Kitchen%', 'GBK%'], expect: 1  },
  { label: "Hardee's",                patterns: ["Hardee's%", 'Hardees%'],   expect: 1  },
  { label: "Jimmy John's",            patterns: ["Jimmy John's%"],           expect: 3  },
  { label: 'Kotipizza',               patterns: ['Kotipizza%'],              expect: 38 },
  { label: 'LongHorn Steakhouse',     patterns: ['LongHorn Steakhouse%'],    expect: 1  },
  { label: 'MOD Pizza',               patterns: ['MOD Pizza%'],              expect: 9  },
  { label: 'Panera Bread',            patterns: ['Panera Bread%'],           expect: 18 },
  { label: "Papa John's",             patterns: ["Papa John's%"],            expect: 5  },
  { label: 'Pizza Express',           patterns: ['Pizza Express%'],          expect: 2  },
  { label: 'Red Lobster',             patterns: ['Red Lobster%'],            expect: 1  },
  { label: 'Ruby Tuesday',            patterns: ['Ruby Tuesday %', 'Ruby Tuesday'], expect: 1 }, // exclude "Ruby Tuesdays Bakery" explicitly
  { label: 'Wetherspoon',             patterns: ['Wetherspoon%', 'JD Wetherspoon%'], expect: 1  },
  { label: 'White Castle',            patterns: ['White Castle%'],           expect: 1  },
]

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : '*** LIVE ***'}`)
  let totalToArchive = 0
  const ids = new Set<string>()
  const byBrand: Record<string, number> = {}

  for (const b of BRANDS) {
    const found = new Map<string, any>()
    for (const pat of b.patterns) {
      const { data, error } = await sb.from('places')
        .select('id, slug, name, city, country')
        .eq('category', 'eat')
        .eq('created_by', ADMIN_ID)
        .is('archived_at', null)
        .ilike('name', pat)
      if (error) { console.error(`  ${b.label} [${pat}]: ${error.message}`); continue }
      for (const r of (data || [])) found.set((r as any).id, r)
    }
    byBrand[b.label] = found.size
    for (const id of found.keys()) ids.add(id)
    const flag = found.size === b.expect ? '✓' : '⚠'
    console.log(`  ${flag} ${String(found.size).padStart(3)}/${String(b.expect).padStart(3)} ${b.label}`)
    if (found.size !== b.expect) {
      for (const r of found.values()) console.log(`       ${(r as any).slug.padEnd(45)} ${(r as any).name} (${(r as any).city})`)
    }
    totalToArchive += found.size
  }

  console.log(`\nTotal to archive: ${totalToArchive} (expected 97)`)
  if (DRY_RUN) {
    console.log('\nDry run — re-run with --commit to archive.')
    return
  }

  // Archive in batches of 50 (Supabase .in() caps around 100 items).
  const allIds = Array.from(ids)
  const nowIso = new Date().toISOString()
  let updated = 0
  for (let i = 0; i < allIds.length; i += 50) {
    const batch = allIds.slice(i, i + 50)
    const { error } = await sb.from('places').update({
      archived_at: nowIso,
      archived_reason: 'chain-restaurant-policy',
    }).in('id', batch)
    if (error) { console.error(`  batch ${i}: ${error.message}`); continue }
    updated += batch.length
  }
  console.log(`\narchived: ${updated}/${allIds.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })

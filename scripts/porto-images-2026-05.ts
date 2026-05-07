/**
 * Backfill main_image_url + images[] for the Porto bulk import (Phase 2).
 * Images extracted via Chrome DevTools from each official site (og:image
 * + first hero photo, filtered for >400px width and not a logo/icon).
 *
 * Re-runnable: only writes when a row currently has no main_image_url.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

interface Img {
  slug: string
  main_image_url: string
  // additional gallery shots (optional)
  images?: string[]
}

const IMAGES: Img[] = [
  {
    slug: 'venn-canteen-porto',
    main_image_url: 'https://venncanteen.com/images/hero.webp',
    images: [
      'https://venncanteen.com/images/hero.webp',
      'https://venncanteen.com/images/menu/leeks-1.webp',
      'https://venncanteen.com/images/menu/fermented-beans-1.webp',
      'https://venncanteen.com/images/menu/mushrooms-1.webp',
    ],
  },
  {
    slug: 'jardineiro-vegan-kitchen-porto',
    main_image_url: 'https://cdn.weasy.io/users/jardinsdoporto/other/ce207838-d0dd-4e02-9aae-9da1822c10d6.jpg',
    images: [
      'https://cdn.weasy.io/users/jardinsdoporto/other/ce207838-d0dd-4e02-9aae-9da1822c10d6.jpg',
      'https://cdn.weasy.io/users/jardinsdoporto/other/jardins_do_porto_iii___077.jpg',
      'https://cdn.weasy.io/users/jardinsdoporto/other/00_mesa_2_11zon.jpg',
    ],
  },
  {
    slug: 'capuchinho-verde-porto',
    main_image_url: 'https://capuchinhoverde.com/wp-content/uploads/sites/3/2015/12/12294891_547588668750179_7772500682321782119_n.jpg',
  },
  {
    slug: 'easygreen-vegan-foodstore-porto',
    main_image_url: 'https://www.easygreen.pt/wp-content/uploads/2019/09/foto-EG.jpg',
  },
  {
    slug: 'happy-food-porto',
    main_image_url: 'https://cdn.lojasonlinectt.pt/usercontent/happy-cookie/media/images/13e3de9-183244-happy-food_2.png',
  },
  {
    slug: 'baomerang-vila-nova-de-gaia',
    main_image_url: 'https://cdn.website.dish.co/media/f8/1f/7828364/Baomerang-Cozinha-a-Base-de-Plantas-IMG-4976-JPG.jpg',
    images: [
      'https://cdn.website.dish.co/media/f8/1f/7828364/Baomerang-Cozinha-a-Base-de-Plantas-IMG-4976-JPG.jpg',
      'https://cdn.website.dish.co/media/4d/bb/6972331/Baomerang-JamesTinocoFotografo-jpg.jpg',
      'https://cdn.website.dish.co/media/fd/57/6972396/Baomerang-JamesTinocoFotografo-13-jpg.jpg',
      'https://cdn.website.dish.co/media/dd/f1/6972357/Baomerang-JamesTinocoFotografo-6-jpg.jpg',
    ],
  },
  // All three daTerra branches share the same brand site; reuse the buffet hero.
  {
    slug: 'daterra-foz-do-douro-porto',
    main_image_url: 'https://www.daterra.pt/wp-content/uploads/2020/02/daterra5.jpg',
    images: ['https://www.daterra.pt/wp-content/uploads/2020/06/slide2.jpg'],
  },
  {
    slug: 'daterra-campus-sao-joao-porto',
    main_image_url: 'https://www.daterra.pt/wp-content/uploads/2020/02/daterra5.jpg',
    images: ['https://www.daterra.pt/wp-content/uploads/2020/06/slide2.jpg'],
  },
  {
    slug: 'jardins-do-porto-hotel',
    main_image_url: 'https://cdn.weasy.io/users/jardinsdoporto/galleries/jardins_do_porto_iii___008.webp',
    images: [
      'https://cdn.weasy.io/users/jardinsdoporto/galleries/jardins_do_porto_iii___008.webp',
      'https://cdn.weasy.io/users/jardinsdoporto/galleries/jardins_do_porto_iii___067.webp',
      'https://cdn.weasy.io/users/jardinsdoporto/galleries/jardins_do_porto_iii___071.webp',
      'https://cdn.weasy.io/users/jardinsdoporto/galleries/jardins_do_porto_iii___078.webp',
    ],
  },
  {
    slug: 'cafe-passaporte-porto',
    main_image_url: 'https://static.wixstatic.com/media/890870_92a95b08921f4745831877ec08fbe3e2~mv2.jpg/v1/fill/w_1957,h_1434,al_c,q_90,enc_avif,quality_auto/890870_92a95b08921f4745831877ec08fbe3e2~mv2.jpg',
  },
  {
    slug: 'porto-vegan-market',
    main_image_url: 'https://img.bndlyr.com/snmlouf5g8jmtqva/_assets/portoveganmarket-editado.jpg?fit=fill&w=1400',
  },
  // Fava Tonka, Porto Vegans, Porto Vegan have no usable hero from their pages
  // (logo only / Instagram & FB JS-rendered) — leave for follow-up.
]

async function main() {
  let updated = 0
  let skipped = 0
  for (const img of IMAGES) {
    const { data: row } = await sb
      .from('places')
      .select('id, main_image_url, images')
      .eq('slug', img.slug)
      .maybeSingle()
    if (!row) { console.log(`  [skip not-found] ${img.slug}`); skipped++; continue }
    if (row.main_image_url) { console.log(`  [skip already-has] ${img.slug}`); skipped++; continue }

    const update: any = { main_image_url: img.main_image_url }
    if (img.images && img.images.length) update.images = img.images
    const { error } = await sb.from('places').update(update).eq('id', row.id)
    if (error) { console.warn(`  [fail] ${img.slug}: ${error.message}`); continue }
    updated++
    console.log(`  [updated] ${img.slug}`)
  }
  console.log('')
  console.log(`Updated: ${updated} / ${IMAGES.length}`)
  console.log(`Skipped: ${skipped}`)
}

main().catch(e => { console.error(e); process.exit(1) })

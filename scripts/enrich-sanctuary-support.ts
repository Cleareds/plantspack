import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Data collected via Chrome DevTools from each sanctuary website
const enrichmentData: Record<string, { donateUrl: string; ogImage?: string }> = {
  // Rancho Compasion
  '8c2479f5-8790-4339-8286-14f86dd5378f': {
    donateUrl: 'https://www.ranchocompasion.org/donate',
  },
  // VINE Sanctuary
  '28394b08-959f-47fe-b41e-bc68b39bbe80': {
    donateUrl: 'https://vinesanctuary.org/donate/',
  },
  // Luvin Arms Animal Sanctuary
  '2cb7d89e-68b1-4ef1-ade7-b517928b7194': {
    donateUrl: 'https://luvinarms.org/donate/',
  },
  // Charlie's Acres Farm Animal Sanctuary
  '7982341b-cbe2-4bc9-b78f-623347dcdd6c': {
    donateUrl: 'https://secure.qgiv.com/for/charliesacres',
  },
  // SoulSpace Farm Sanctuary
  '75bd45d2-49e7-4875-b967-74e02d8e794e': {
    donateUrl: 'https://soulspacesanctuary.org/donate/',
  },
  // Dreamtime Sanctuary
  '6a32b228-32a2-48eb-b9e7-b286a3ead2a0': {
    donateUrl: 'https://dreamtimesanctuary.org/donate/',
  },
  // Where Pigs Fly Farm Sanctuary
  'de70d7d7-0651-4ccb-b151-b51df38e9343': {
    donateUrl: 'https://wherepigsfly.org/donate/',
  },
  // Goodheart Animal Sanctuaries
  '28f7e21d-944e-4338-9a17-5bffa520b3fb': {
    donateUrl: 'https://goodheart.beaconforms.com/form/3032a72f',
  },
  // Fundacion El Hogar Animal Sanctuary
  '24403b83-53aa-4184-8d9a-62d21094253c': {
    donateUrl: 'https://fundacionelhogar.org/donaciones/',
  },
  // The Black Sheep Animal Sanctuary
  'bee21c1e-24e7-4018-91fb-63cf70db6a40': {
    donateUrl: 'https://www.theblacksheep.org.nz/donatesponsor.html',
  },
  // The Animal Sanctuary NZ
  '01f63087-8735-4af1-84a9-441ad9b793d4': {
    donateUrl: 'https://www.animalsanctuary.co.nz/help',
  },
  // Franklin Farm Sanctuary
  '400ef501-bb6e-40fb-8296-2e67f0e092e5': {
    donateUrl: 'https://franklinfarmsanctuary.co.nz/donate/',
  },
  // Mino Valley Farm Sanctuary
  'f6fd96e7-efac-4b73-a0a5-50064061d711': {
    donateUrl: 'https://donorbox.org/minovalleydonate',
  },
  // El Refugio del Burrito
  'ac8c2bfd-46cf-42e2-9645-1729ad39d22d': {
    donateUrl: 'https://www.elrefugiodelburrito.org/ayudanos/donar',
    ogImage: 'https://www.elrefugiodelburrito.org/sites/espana/files/styles/open_graph_image/public/2025-04/brown-donkey-at-spain-sanctuary.jpg?h=97cc309c&itok=BLkaHZlP',
  },
  // Animal Rahat
  '10273d04-8241-44e1-bd0c-b41ca5a0e8d3': {
    donateUrl: 'https://www.animalrahat.com/sponsor-an-animal/',
    ogImage: 'https://www.animalrahat.com/wp-content/uploads/2022/08/Vitthal-saturated-for-homepage-straightened-scaled.jpg',
  },
  // Ironwood Pig Sanctuary
  '29142d57-02fc-428c-97db-e9faf86da69c': {
    donateUrl: 'https://www.ironwoodpigs.org/donate',
  },
  // The Gentle Barn - California (also used for Tennessee)
  'b34d9ea0-3272-476b-8e0f-6e0e6a18e798': {
    donateUrl: 'https://www.gentlebarn.org/donate/',
  },
  // The Gentle Barn - Tennessee
  '24a0e1a0-30f5-46fc-aaea-32af6e1d72c2': {
    donateUrl: 'https://www.gentlebarn.org/donate/',
  },
  // Farm Sanctuary - Orland
  'aa7dd621-9f8c-45ec-9498-da267c0447c2': {
    donateUrl: 'https://secure.farmsanctuary.org/donate',
  },
  // Farm Sanctuary - Acton
  '2d1e86cc-dfed-4393-a9fa-aa1c265011c4': {
    donateUrl: 'https://secure.farmsanctuary.org/donate',
  },
  // Farm Sanctuary - Watkins Glen
  '5714f3fa-5119-42ee-acfd-9983fc8971dc': {
    donateUrl: 'https://secure.farmsanctuary.org/donate',
  },
  // Catskill Animal Sanctuary
  'a5fac905-1020-4379-9c02-602fd3c4378f': {
    donateUrl: 'https://casanctuary.org/support/',
  },
  // Tamerlaine Sanctuary & Preserve
  'f13e64b3-8370-4044-921c-812e372fb920': {
    donateUrl: 'https://impact.tamerlaine.org/campaign/763271/donate',
  },
  // Iowa Farm Sanctuary
  '3b476566-222b-4fbe-bb12-de0816a02c68': {
    donateUrl: 'https://www.iowafarmsanctuary.org/donate',
  },
  // Woodstock Farm Sanctuary
  'de1d66ba-c15d-490b-a2aa-383636fd81e9': {
    donateUrl: 'https://woodstocksanctuary.org/donate',
  },
  // Poplar Spring Animal Sanctuary
  '7368d11e-3c76-41b0-9f05-536f9647ada2': {
    donateUrl: 'https://www.animalsanctuary.org/donate/',
  },
  // Indraloka Animal Sanctuary
  '9e7db889-cb33-4580-93f9-9614e5ca8b56': {
    donateUrl: 'https://indraloka.z2systems.com/np/clients/indraloka/donation.jsp',
  },
  // Wildwood Farm Sanctuary
  '7f6f5995-0b32-48ce-bd1e-aabbae0a71d5': {
    donateUrl: 'https://www.zeffy.com/en-US/donation-form/give-life-changing-care-to-rescued-animals',
  },
  // Peaceful Prairie Sanctuary
  '1d7b810e-a74f-426a-b2f1-d1afabb9bb08': {
    donateUrl: 'https://www.peacefulprairie.org/help.html',
  },
  // Edgar's Mission Farm Sanctuary
  'a8ca213e-0d04-437d-9ccc-5c04a000e695': {
    donateUrl: 'https://edgarsmission.org.au/donations/',
  },
  // Tower Hill Stables Animal Sanctuary
  '40d9e520-dcae-4c8d-bf66-a520190730ab': {
    donateUrl: 'https://www.towerhillstables.org/donate-1',
  },
  // Cedar Row Farm Sanctuary
  '3679dad4-e134-4ec8-a14e-6a0747b5e610': {
    donateUrl: 'https://www.canadahelps.org/en/charities/animal-outreach/',
  },
  // Happily Ever Esther Farm Sanctuary
  'db6aa76f-6a3d-4ea2-8754-40fb77baffdb': {
    donateUrl: 'https://www.happilyeveresther.ca/donate',
  },
  // Dean Farm Trust
  'e024f128-4e6e-4530-b3ce-f4cd5682da76': {
    donateUrl: 'https://deanfarmtrust.org.uk/campaigns/make-a-donation/',
  },
  // Tuulispaa Animal Sanctuary
  '5d735563-38b5-444d-ae8f-e48e37e0fc8c': {
    donateUrl: 'https://tuulispaa.org/lahjoita/',
  },
  // Rowdy Girl Sanctuary
  '7730792f-8e01-4ac9-a697-bf7cda2ee989': {
    donateUrl: 'https://rowdygirlsanctuary.org/donate-now/',
  },
  // Loving Farm Animal Sanctuary
  '9bfe1d5c-4db5-4d62-bce7-11511e1a8229': {
    donateUrl: 'https://www.lovingfarm.org/donate',
  },
  // Hof Butenland
  '867fe942-368a-47a9-b472-bc56ded623e7': {
    donateUrl: 'https://www.stiftung-fuer-tierschutz.de/spenden',
  },
  // Santuario Igualdad Interespecie
  'a848e7de-d7a9-48b8-98e4-428f0a965289': {
    donateUrl: 'https://santuarioigualdad.org/donation',
  },
  // Farmhouse Garden Animal Home
  '007cae53-770e-4a38-85bd-ddbd76309ec5': {
    donateUrl: 'https://www.farmhousegardenanimalhome.com/donate',
  },
  // Fundacion Santuario Gaia
  '37e47d1d-b99e-4d8c-98ff-1816a23c0ae8': {
    donateUrl: 'https://fundacionsantuariogaia.org/donativos/',
  },
  // Akka's Ganzenparadijs
  '673b2894-03be-45ff-87fc-7914d5616371': {
    donateUrl: 'https://www.ganzenparadijs.nl/sponsors',
  },
  // Surge Sanctuary
  '896babf6-6c30-4470-a3c0-c719cd8cab0b': {
    donateUrl: 'https://www.surgesanctuary.org/donate',
  },
  // Gut Aiderbichl
  '3967efad-17e7-4d36-9c6e-0b15777a8787': {
    donateUrl: 'https://www.gut-aiderbichl.com/en/help/',
  },
  // Erdlingshof
  '7d7b949d-23bf-4756-9ee8-520d050eda68': {
    donateUrl: 'https://www.erdlingshof.de/einzelspende/',
  },
  // Juliana's Animal Sanctuary
  'a05d53ad-b3a6-495e-b2dc-af6ff748ea39': {
    donateUrl: 'https://www.every.org/julianas-animal-sanctuary-inc?theme_color=f79900&utm_campaign=donate-link#/donate',
  },
  // Asher's Farm Sanctuary
  'e6ea1cd2-40ff-4879-bdaf-5663e029ec43': {
    donateUrl: 'https://www.ashersfarmsanctuary.org/donate',
  },
  // Greyton Farm Animal Sanctuary
  '19fba925-19e3-447f-8145-332ab71425c8': {
    donateUrl: 'https://greytonfarmsanctuary.org/donate/',
  },
  // Canterbury Tails Animal Rescue
  '383e6f7e-12fb-4157-86fd-f45ca7def7f3': {
    donateUrl: 'https://givealittle.co.nz/org/canterbury-tails-animal-rescue',
  },
};

async function main() {
  console.log(`Processing ${Object.keys(enrichmentData).length} sanctuaries...`);

  // Fetch current data for all places
  const { data: places, error } = await sb
    .from('places')
    .select('id, name, description, main_image_url')
    .eq('category', 'organisation');

  if (error || !places) {
    console.error('Failed to fetch places:', error);
    return;
  }

  let enrichedCount = 0;
  let imageUpdatedCount = 0;

  for (const place of places) {
    const data = enrichmentData[place.id];
    if (!data) continue;

    const updates: Record<string, string> = {};

    // Append Support URL to description if not already present
    if (data.donateUrl && !place.description?.includes('Support:')) {
      const newDesc = place.description
        ? `${place.description}\n\nSupport: ${data.donateUrl}`
        : `Support: ${data.donateUrl}`;
      updates.description = newDesc;
    }

    // Update main_image_url if missing and we have an og:image
    if (!place.main_image_url && data.ogImage) {
      updates.main_image_url = data.ogImage;
      imageUpdatedCount++;
    }

    if (Object.keys(updates).length === 0) continue;

    const { error: updateError } = await sb
      .from('places')
      .update(updates)
      .eq('id', place.id);

    if (updateError) {
      console.error(`  Failed to update ${place.name}:`, updateError.message);
    } else {
      enrichedCount++;
      const parts = [];
      if (updates.description) parts.push('donate link');
      if (updates.main_image_url) parts.push('image');
      console.log(`  Updated ${place.name}: ${parts.join(' + ')}`);
    }
  }

  console.log(`\nDone! Enriched ${enrichedCount} sanctuaries (${imageUpdatedCount} images updated).`);
}

main();

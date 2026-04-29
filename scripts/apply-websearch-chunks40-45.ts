import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const verdicts: Array<{ id: string; verdict: string }> = [
  // Chunk 40
  { id: '357230a0-b1d6-4810-98ad-f26835941e24', verdict: 'closed' }, // Folk and Soul Manchester
  { id: '357a0a7d-db33-4a91-a395-f06392319d35', verdict: 'closed' }, // The Happy Bamboo San Jose
  { id: '357c0055-7aa0-4986-b4d2-bd5e2cf28ef7', verdict: 'not_fully_vegan' }, // Δίκτυο Ελληνικής Σπιρουλίνας - supplement producer
  { id: '357fb822-c758-45c0-b019-5afb40b3a77a', verdict: 'fully_vegan' }, // CajuCaju Aguas De Sao Pedro
  { id: '35a79455-4197-415b-894b-264a7bc6f4f3', verdict: 'not_fully_vegan' }, // Gasthaus Schützen Götzis - traditional Austrian
  { id: '3609b215-5665-4ec5-a6cd-eecad4e4df24', verdict: 'fully_vegan' }, // Somos lo que comemos La Cuesta
  { id: '3653d8f1-5d65-47da-85b2-9e2117122f47', verdict: 'not_fully_vegan' }, // माय मराठी Kolhapur - vegetarian with dairy
  { id: '366e25ae-4219-49bf-becc-06938fdf99f3', verdict: 'fully_vegan' }, // Nuturella Ban Tai Koh Phangan
  { id: '3686353c-2d6d-4059-9250-555dfe47eab6', verdict: 'fully_vegan' }, // Forever Vegano Mexico City
  { id: '368e3288-21b9-4ce0-a2c3-953a33aaaf45', verdict: 'fully_vegan' }, // Crepe Hearts Olympic Valley
  // Chunk 41
  { id: '36ba4374-ff26-445a-940d-ab5318bd643c', verdict: 'fully_vegan' }, // Sunday C&C Eatery NY
  { id: '36ddd7b3-8795-432d-a703-d8d806149203', verdict: 'not_fully_vegan' }, // Restaurante Vegetariano Salud y Vida - dairy
  { id: '3728ff93-8027-49de-a99f-1609e800c22a', verdict: 'fully_vegan' }, // Shan Tou Hao Chi Chiang Mai
  { id: '37354df3-0ea3-4c49-85db-4f5584345d70', verdict: 'fully_vegan' }, // Coo Sweet Bun Penang
  { id: '3766e2ce-1cb4-4bd9-aa84-6fb0a9974712', verdict: 'not_fully_vegan' }, // Svenska Hamburgerköket Hägersten - meat burgers
  { id: '37678763-0779-4a53-93fa-89acdbb809c6', verdict: 'fully_vegan' }, // CAT & VEGAN neu. Osaka
  { id: '376ec383-e080-4287-b1d5-1b54c5cbd486', verdict: 'fully_vegan' }, // Fest Bistrô Santa Maria RS
  { id: '377fa1d2-9717-495c-95dd-2a06a2920e9f', verdict: 'not_fully_vegan' }, // mod's Hair Braunschweig - hair salon
  { id: '378e2db8-9b0a-477b-b3e7-912eb62ababd', verdict: 'closed' }, // 7 Vegan Market Garden Grove
  { id: '37d69481-2b8d-4b5c-9e8c-31df5f7274a3', verdict: 'not_fully_vegan' }, // Veganact Peristeri - food manufacturer
  // Chunk 42
  { id: '37d6dbf2-1ad6-4184-aeda-a4e624d63cf9', verdict: 'closed' }, // Noveno Elefante Monterrey
  { id: '37e44385-7c1e-4a00-ab65-514e9ff9bff8', verdict: 'fully_vegan' }, // Nature's Food Veganshop Hannover
  { id: '37e47d1d-b99e-4d8c-98ff-1816a23c0ae8', verdict: 'fully_vegan' }, // Fundacion Santuario Gaia
  { id: '382f7c7a-0a87-436e-bc75-c60c59a01c21', verdict: 'not_fully_vegan' }, // Changs Sushi Groß-Gerau - non-vegan sushi
  { id: '38328fbd-1388-44e3-927e-854ed0b7340d', verdict: 'closed' }, // Pepples Donuts SF
  { id: '387e4165-ee74-4022-b29e-4637034e9eaa', verdict: 'closed' }, // Nice Shoes Vancouver
  { id: '38bee261-b816-4015-8762-a6da7e7e0c1f', verdict: 'fully_vegan' }, // Hibiscus Cafe West Philadelphia
  { id: '38c28c83-055e-4ec0-851e-eca4d179e17e', verdict: 'fully_vegan' }, // Vegan Izakaya Masaka Shibuya
  { id: '38d5227d-b321-4685-bde3-3c5fe37fb092', verdict: 'fully_vegan' }, // Chiodi Latini New Food Turin
  { id: '38e95680-63e3-4d71-8363-be0ce50d6c59', verdict: 'closed' }, // Living Food Lab Canggu
  { id: '38ea4afd-daad-4158-a4ef-83130f7602bf', verdict: 'fully_vegan' }, // Yi Xin Vegetarian Food Singapore
  { id: '38eeffd0-793e-4021-b6e2-349fe04dc38e', verdict: 'fully_vegan' }, // Açaí Jungle Burbank
  { id: '38fafca4-c601-4c06-a182-5a677d6b37e3', verdict: 'fully_vegan' }, // Herbívora Oaxaca
  { id: '3937be9d-1d5a-46b5-b289-d31b57fd9bb3', verdict: 'fully_vegan' }, // Ginko Greenhouse Graz
  { id: '393a73c2-abc8-44ae-ac57-b399c2b183cd', verdict: 'fully_vegan' }, // Shala Nhà Chay Da Nang
  // Chunk 43
  { id: '3949296b-fc6b-4cde-931a-d4745cba1440', verdict: 'fully_vegan' }, // Govindas Restaurante Vegetariano
  { id: '3970b2b6-085e-4ba5-a4cb-21625d8df51a', verdict: 'fully_vegan' }, // Komu Hummus Gliwice
  { id: '398e50b9-abf4-4591-8205-d1da94b91b41', verdict: 'fully_vegan' }, // Çigköftem Amsterdam
  { id: '3996fd69-7b89-464b-8c62-7b449039247c', verdict: 'not_fully_vegan' }, // Paín et Gâteau Münster - dairy bakery
  { id: '39af3c1a-1f8c-4afe-ae23-2b52025a6da1', verdict: 'fully_vegan' }, // 菜道 Tokyo (Saido)
  { id: '3a181ef8-8f21-4fe4-9701-59a88db691f2', verdict: 'closed' }, // The Cosmic Coconut Memphis
  { id: '3a18703f-fbe9-4bcd-b081-2513dcc1f022', verdict: 'fully_vegan' }, // LYR Pécs
  { id: '3a1908b8-d384-4708-91c7-fcd3942aa4b2', verdict: 'fully_vegan' }, // Eetcafe Hagedis The Hague
  { id: '3a353d14-361d-4208-9faf-aa68ee932bc7', verdict: 'fully_vegan' }, // LuLu's Cafe Memphis
  { id: '3a54cdff-e00e-4fad-9eae-6829b2dcb17d', verdict: 'fully_vegan' }, // C-Organico Juice Bar Santo Domingo
  { id: '3a682fe0-314e-461c-9f9e-e4cd63bea097', verdict: 'fully_vegan' }, // 天慈素食 Taichung
  // Chunk 44
  { id: '3a88702d-d64c-46ba-b418-ceaf80b0d91d', verdict: 'not_fully_vegan' }, // Ammachi Vegetarian Colombo - dairy
  { id: '3a940b6e-a843-4480-8dda-b7415efc4a4f', verdict: 'fully_vegan' }, // Organic Smoothie Bowl Kathmandu
  { id: '3a9f8309-4d91-4bb4-b935-a4f8c5386fde', verdict: 'fully_vegan' }, // Lôc Vegan Kitchen Mainz
  { id: '3aa4b8d8-2325-4b30-94bb-2bfce0add965', verdict: 'not_fully_vegan' }, // 1900 Asia Fusion Hamburg - sushi/grill
  { id: '3aa884b3-2377-4b5b-a08d-00d1b196b43f', verdict: 'fully_vegan' }, // Albaspina Bioagriturismo
  { id: '3aaddbcf-7875-4e90-a022-747e7bc1bea8', verdict: 'closed' }, // Hibiscus Vegan Cafe Toronto
  { id: '3ab2b1bf-a2df-4841-9cbf-e177c4f7f18c', verdict: 'not_fully_vegan' }, // Cocos & Bodhi Erfurt - mixed menu
  { id: '3ab59f19-3e91-4ce1-9883-bdfdbe27b3fc', verdict: 'fully_vegan' }, // Vegan QuickBites New York
  { id: '3ab65d2b-0c31-4eeb-b241-b23544877638', verdict: 'not_fully_vegan' }, // Schloss Grill Bensberg - meat
  { id: '3af1260a-58ca-4a63-8795-3970eaad74ed', verdict: 'closed' }, // Malmö Valencia
  { id: '3af529fe-d14e-41c6-8b45-c1da3bf8fdc2', verdict: 'not_fully_vegan' }, // CSA Waldgarten Potsdam - CSA farm
  { id: '3af6a7bd-705c-4a80-98bd-4f69804242f5', verdict: 'fully_vegan' }, // VeganLand Cigköfte Bonn
  { id: '3b1817bd-19b9-473b-8081-fef9dcb5a5d1', verdict: 'fully_vegan' }, // Keep Bañana Munich
  { id: '3b231b9f-31a2-4d53-b547-32e7479b216a', verdict: 'closed' }, // Pressed Juicery Malibu
  // Chunk 45
  { id: '3b547af7-6f60-4175-83e4-cd3ada9d1694', verdict: 'closed' }, // True Earth Juicery North Hollywood
  { id: '3b98bee7-435c-47da-91bc-037ca2bcb649', verdict: 'fully_vegan' }, // Kingsland Vegetarian / Utopia Vegan Canberra
  { id: '3ba46938-074a-48c3-ac2a-dc4d12ecbabd', verdict: 'fully_vegan' }, // Nhà Hàng Chay Pháp Hoa
  { id: '3bacc2f4-99f6-4e72-b6dc-7e7979e7bdf7', verdict: 'fully_vegan' }, // Libres X Siempre Mexico City
  { id: '3bf48e2a-0325-4fca-8322-f88280de2727', verdict: 'fully_vegan' }, // Vegan Bistro Jangara Tokyo
  { id: '3bf8d672-a5c4-41ce-8f4c-4e2073840bdf', verdict: 'not_fully_vegan' }, // Mantras Veggie Cafe Costa Rica - cheese
  { id: '3bf966b9-9d84-4e94-9304-051798ab2473', verdict: 'not_fully_vegan' }, // ZAU Prague - mixed menu
  { id: '3c1baba8-c11a-41a8-9463-904f5f1d7c5d', verdict: 'fully_vegan' }, // Salvador Vegan Café Joinville
  { id: '3c3d5b88-1933-4832-aa3e-06e036d782db', verdict: 'closed' }, // Cussens Cottage Kilmallock
  { id: '3c74c5b8-af1a-4898-83a5-0114d7ce482c', verdict: 'fully_vegan' }, // Cảm Ơn Hamburg
];

async function main() {
  let confirmed = 0, flagged = 0, closed = 0;
  for (const { id, verdict } of verdicts) {
    const { data: place } = await sb.from('places').select('id, name, tags').eq('id', id).single();
    if (!place) { console.log(`Not found: ${id}`); continue; }
    const tags: string[] = [...(place.tags || [])];
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (verdict === 'fully_vegan') {
      if (!tags.includes('websearch_confirmed_vegan')) tags.push('websearch_confirmed_vegan');
      updates.tags = tags; updates.verification_status = 'scraping_verified'; confirmed++;
    } else if (verdict === 'not_fully_vegan') {
      if (!tags.includes('websearch_review_flag')) tags.push('websearch_review_flag');
      updates.tags = tags; flagged++;
    } else if (verdict === 'closed') {
      if (!tags.includes('websearch_confirmed_closed')) tags.push('websearch_confirmed_closed');
      updates.tags = tags; closed++;
    }
    const { error } = await sb.from('places').update(updates).eq('id', id);
    if (error) console.error(`Error ${place.name}: ${error.message}`);
    else process.stdout.write(verdict === 'fully_vegan' ? '✓' : verdict === 'closed' ? '✗' : '⚠');
  }
  console.log(`\nDone: ${confirmed} confirmed, ${flagged} flagged, ${closed} closed.`);
}
main().catch(console.error);

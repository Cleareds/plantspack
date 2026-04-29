import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false }});
async function main() {
  const { data: admin } = await sb.from('users').select('id').eq('role','admin').limit(1).single();
  if (!admin) { console.error('no admin'); return; }

  const slug = 'michelin-vegan-restaurants-world-bucket-list';
  const { data: existing } = await sb.from('posts').select('id').eq('slug', slug).maybeSingle();
  if (existing) { console.log('Already exists:', existing.id); return; }

  const title = "The World's Best Fully Vegan Restaurants: What the Michelin Guide Knows That Most People Still Don't";

  const content = `Let me be upfront about something: I haven't eaten at any of the restaurants in this article. Not one. This is a list built entirely from research — Michelin guides, chef interviews, travel journalism, and the kind of deep review-reading you do when you're building a platform about vegan food and want to understand what "the best" actually looks like.

I'm writing this because PlantsPack now tracks Michelin-recognized vegan restaurants as a dedicated pack, and going through that data was genuinely eye-opening. There are 9 restaurants in the world right now that are both fully vegan and Michelin-recognized. Nine. That's a tiny number. Each one has a story worth knowing.

This is my bucket list. If you've been to any of them, I'd love to hear about it.

— — —

DE NIEUWE WINKEL — Nijmegen, Netherlands
The world's only 2-Michelin-starred vegan restaurant. Full stop.

This is the one that changed the conversation. Chef Emile van der Staak holds 2 red Michelin stars and a Michelin Green Star — all for a zero animal product menu — and was named Gault&Millau Netherlands Chef of the Year 2024. Thirty guests, a 17th-century vaulted cellar, and an open kitchen. He calls his approach "botanical gastronomy" rooted in Ketelbroek, a self-sustaining food forest managed by his friend Wouter van Eck. The menu changes three times a year around micro-seasons.

His team makes a "butter" from sunflowers. They torched the fermented skin from kombucha — SCOBY — into an ultra-crispy tuile that apparently tastes uncannily of prawn, with no ocean anywhere in the recipe. I have no idea how that works. I intend to find out.

The dream: sitting in a centuries-old Dutch cellar while a 30-person kitchen performs fermentation alchemy and serves you something that tastes of the sea but contains none of it.

— — —

SEVEN SWANS — Frankfurt am Main, Germany
The world's first vegan Michelin-starred chef, in the city's narrowest building.

In 2019, Ricky Saward took over the historic Seven Swans — squeezed into Frankfurt's narrowest building, seven storeys tall, floor-to-ceiling windows over the River Main — and turned it entirely vegan. He became the first vegan Michelin-starred chef on the planet. Worth saying twice.

His restaurant maintains its own permaculture garden on a hectare in Bad Homburg, growing almost everything he uses. Dinner lasts about five hours. Saward personally explains each dish at the table, turning the meal into something closer to a guided conversation about how food grows and what it means. Reviewers call it "an incredible culinary journey with dishes rich in flavor."

The dream: a five-hour riverside dinner in a skinny medieval tower while a chef explains exactly how his garden grew what's on your plate. No rush.

— — —

HUMUS X HORTENSE — Brussels, Belgium
Botanical gastronomy inside a gilded Art Nouveau jewel box.

Chef Nicolas Decloedt and his partner Caroline Baerten (a former art historian, which explains a lot about the aesthetic experience here) coined the term "botanical gastronomy" in 2008 — long before it was fashionable. They won a Michelin Green Star in 2021 and a full Michelin Star in 2023. In 2019 they were named Best Vegan Restaurant in the World.

The menu follows 24 micro-seasons per year, entirely dependent on the harvest from their wild farm Le Monde des Mille Couleurs. Baerten also founded the Soilmates movement to promote botanical gastronomy globally, and designed all the handmade ceramic tableware. The dining room is a 19th-century street-corner space with Art Nouveau frescoes and gilded ceilings.

The dream: eating from hand-thrown ceramics under frescoed angels while a former art historian has designed your entire sensory experience around a single wild harvest. I don't know what else to say about that. I want to go.

— — —

KLE — Zurich, Switzerland
The youngest vegan Michelin-starred chef in the world.

Chef Zineb "Zizi" Hattab was 26 years old when she earned her Michelin star — making her Switzerland's first and youngest vegan Michelin-starred chef. KLE (named after Sauerklee, the German word for wood sorrel) holds both a red star and a Green Star. Forty seats. Four to six courses. The menu pulls from over 50 rotating seasonal ingredients and changes not just by day but table to table.

Her food blends Moroccan and Mexican sensibilities with Swiss precision. A smoky terrine in a sweet potato bun with spicy mustard rethinking the American hot dog. A kohlrabi aguachile with seaweed giving it the ghost of an ocean flavor, served "à la mezcal." Paired with biodynamic wines.

The dream: a hyperpersonal 6-course dinner where no two tables eat exactly the same meal, cooked by a chef who grew up between Morocco and Switzerland and channels both without apology.

— — —

LÉGUME — Seoul, South Korea
Asia's first Michelin-starred vegan restaurant.

Chef Sung Si-woo spent a decade as head chef at Seoul's acclaimed Soigne before opening Légume in 2023 and earning its Michelin star within two years — making it Asia's first ever Michelin-starred fully vegan restaurant. He is not vegan himself, which might be exactly why the food is so undefensive. Deep, satisfying, grounded in traditional Korean technique.

The menu is built around fermentation: guk (broth soups), jjigae (stews), clear broths from fermented vegetables using methods that go back centuries. You can pair it with wine or their house-made tea program. Course explanations read more like storytelling than service.

The dream: experiencing what happens when Korean fermentation tradition is channeled entirely through vegetables, in a city whose culinary scene is currently one of the most exciting on Earth. I am embarrassingly late to Seoul.

— — —

ARK — Copenhagen, Denmark
The first vegan Michelin Green Star in the Nordic countries.

In a city already synonymous with New Nordic cuisine and sustainability, Ark holds the distinction of being the first fully vegan restaurant in the Nordics to earn a Michelin Green Star. They marry local and foraged Nordic ingredients with Japanese sensibilities — mushrooms cultivated on their own farm, plant-based chawanmushi, tomato-and-kimchi courses sitting alongside coral tooth mushroom dishes.

A reviewer who visited in 2025 described it as "exceptional, delicious and very innovative, with flavors that dance in the mouth." Another simply said: "ARK is truly deserved of every star."

The dream: Copenhagen on a summer evening, 9 courses of foraged Nordic-Japanese fusion. The city alone would be worth the flight.

— — —

BONVIVANT COCKTAIL BISTRO — Berlin, Germany
The sixth vegan Michelin-starred restaurant on Earth. Born from a brunch revolution.

Bonvivant has been a Schöneberg institution since 2019, famous for weekend brunches that attract queues around the block. In January 2025, head chef Nikodemus Berger completed the restaurant's evolution to 100% vegan for dinner too — earning it a Michelin star and becoming the sixth fully vegan Michelin-starred restaurant on the planet.

His philosophy: "We cook vegan food, mainly with ingredients from Brandenburg, and adhere absolutely to the seasons, using everything from leaf to root." Cauliflower and beetroot with homemade herbal peanut sauce. A barbecue grill doing the work that umami-heavy animal fats usually do. Service described as "unfussy, personal, informative, and fun."

What I find interesting: Bonvivant didn't start vegan. It chose to become vegan. That's a different kind of commitment than a restaurant that launches that way.

The dream: Berlin's laidback energy meeting fine-dining precision, in a restaurant that decided vegan was the right direction and then went all the way.

— — —

MILLENNIUM — Oakland, California, USA
The godfather of American vegan fine dining.

While the others are all relatively recent arrivals, Millennium is a veteran. Chef Eric Tucker (author of The Artful Vegan) has been running this Oakland restaurant for decades, building a kitchen around global inspiration — Indian, Italian, Mexican, Japanese — all filtered through seasonal California produce and an almost evangelical commitment to mushrooms.

Michelin has awarded it a Bib Gourmand annually since 2016. That's the "exceptional food, great value" distinction. Which means it's extraordinary but won't empty your wallet the way some of the others will. Warm room, spacious patio on College Avenue.

The dream: the restaurant that has been quietly doing this for decades while the rest of the world catches up. An Oakland pilgrimage for anyone who wants to understand where American vegan fine dining came from.

— — —

DAR — Zurich, Switzerland
A Bib Gourmand love letter to a Moroccan mother's kitchen.

Also by Zineb Hattab — the same chef as KLE, two neighbourhoods away — DAR is her more personal project. Named after the Arabic word for "home." Where KLE is precise and fine-dining, DAR is comfort food and memory: roasted cauliflower with chermoula, muhammara, rosewater ice cream with lemon cookie dough. The cuisine of her Moroccan parents, made entirely vegan while keeping the communal, sharing spirit of North African table culture intact.

About 15 sharing dishes rotating with the season. Michelin gave it a Bib Gourmand. DAR also runs flat hierarchies, equal employment, and social inclusion as policy — treating the ethical kitchen as something that extends past the plate.

The dream: sharing a Moroccan-inspired feast in Zurich with a chef who's also running a Michelin-starred restaurant two neighborhoods away. Proof that vegan cooking can be both high art and home cooking, depending on what you need that day.

— — —

Nine restaurants. Nine cities. A short list that might be the most impressive concentration of culinary talent and ethical consistency anywhere in the world right now.

I haven't been to any of them. But I will. This list will get shorter, one country at a time.

If you've been to any of these places — I genuinely want to know. Leave a review on PlantsPack, or find me on @plantspackX. The personal experiences are the part I can't research my way into.`;

  const { data, error } = await sb.from('posts').insert({
    title,
    slug,
    content,
    category: 'article',
    privacy: 'friends',
    user_id: admin.id,
  }).select('id, slug').single();

  if (error) { console.error('Insert failed:', error.message); return; }
  console.log('✅ Blog post inserted!');
  console.log('URL: https://www.plantspack.com/blog/' + data.slug);
}
main().catch(console.error);

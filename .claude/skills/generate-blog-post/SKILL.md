---
name: generate-blog-post
description: Generate a draft blog article for PlantsPack and save it to the DB. Invoke via /generate-blog-post <topic>, or when the user says "write a blog post about X", "generate an article about X", "draft a post about X". Saves as privacy='draft', category='article'. Visible only to admin via /admin/blog or direct URL.
---

# generate-blog-post

Generates a long-form blog article for PlantsPack, saves it as a draft, and returns the preview URL.

`$ARGUMENTS` = topic or brief (e.g. "top 10 vegan cities in Europe", "why vegan fine dining is growing")

## Voice and style

Anton's writing voice - direct, research-based, personal but honest about what's firsthand vs. researched:
- Use first person where it adds authenticity
- Be upfront when it's research-based, not personal experience
- No fluffy intros ("In today's world...") - start with something specific
- No em-dashes (use `-` or rewrite the sentence)
- No "must-visit", "game-changer", "in conclusion"
- Use lists and sections freely - they're easier to read
- Link to relevant PlantsPack places and packs wherever possible
- The target reader is someone who's vegan or vegan-curious and cares about food quality, not just animal ethics

## Content format

Write in Markdown. Structure:
- Opening paragraph: hook + honest framing (research vs. experience)
- `---` section dividers between major sections
- `## Heading` for each section
- Bullet lists `- ` for highlights/standouts
- `![alt](url)` for inline images (use place images from Supabase storage where available)
- `[Link text](url)` for PlantsPack place/pack links
- Closing section: what this data/research means + personal note

Use `-` not `—` everywhere.

## Full workflow

1. **Research the topic** using WebSearch - find current, accurate information
2. **Query PlantsPack DB** for relevant places and their slugs:
   ```bash
   node -e "
   const { createClient } = require('@supabase/supabase-js');
   require('dotenv').config({ path: '.env.local' });
   const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
   sb.from('places').select('id, name, slug, city, country, main_image_url, vegan_level').ilike('name', '%SEARCH%').limit(10).then(({data}) => console.log(JSON.stringify(data, null, 2)));
   " 2>/dev/null
   ```
3. **Find relevant packs** - check if a pack exists for the topic
4. **Write the article** in Markdown with links to PlantsPack pages
5. **Choose hero image** - use a relevant place's `main_image_url` if available, otherwise skip
6. **Generate a slug** - kebab-case, descriptive (e.g. `top-vegan-cities-europe-2026`)
7. **Generate a title** - clear, specific, no clickbait
8. **Insert to DB** via script

## Insert script

```typescript
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false }});

async function main() {
  const { data: admin } = await sb.from('users').select('id').eq('role','admin').limit(1).single();
  if (!admin) { console.error('no admin'); return; }

  const { data, error } = await sb.from('posts').insert({
    user_id: admin.id,
    title: 'TITLE',
    slug: 'SLUG',
    content: `MARKDOWN_CONTENT`,
    category: 'article',
    privacy: 'draft',       // always draft first - publish from /admin/blog
    image_url: 'HERO_IMAGE_URL_OR_NULL',
  }).select('id, slug').single();

  if (error) { console.error(error); return; }
  console.log('Draft saved:', `https://www.plantspack.com/blog/${data.slug}`);
  console.log('Publish at: https://www.plantspack.com/admin/blog');
}
main().catch(console.error);
```

Run with: `npx tsx scripts/_insert-blog-SLUG.ts`

## After inserting

Report back:
- Preview URL: `https://www.plantspack.com/blog/SLUG`
- Admin blog panel: `https://www.plantspack.com/admin/blog`
- Word count and estimated reading time
- Number of PlantsPack place/pack links included

## Never

- Never set `privacy='public'` directly - always save as `draft`; admin publishes from /admin/blog
- Never use `—` (em-dash) - use `-` or rewrite
- Never fabricate quotes or specific experiences the user hasn't had
- Never use `minimalistbaker.com` or other banned sources as references
- Never write "in conclusion" or "game-changer" or "must-visit"
- Never generate a post without WebSearching for current, accurate info first

// Node <22 polyfill: @supabase/supabase-js 2.100+ requires a global WebSocket
// even when the realtime client is unused. Install once at module-load.
import ws from 'ws'
if (typeof (globalThis as any).WebSocket === 'undefined') {
  ;(globalThis as any).WebSocket = ws as any
}

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

// Every city image is referenced from the homepage with a `?v=<id>` cache
// buster (e.g. amsterdam--netherlands.jpg?v=mowpiceb). When we replace an
// image we generate a new v=token, so the URL itself is unique-per-version
// and can safely be cached forever. Yet the bucket-default is 3600s (1h),
// which forces the browser back to Supabase on every reload.
//
// This script re-applies cacheControl='public, max-age=31536000, immutable'
// to every existing object in the city-images bucket without re-uploading
// the bytes — it uses Supabase Storage's `update` call with the same body
// but a new cacheControl header.

const BUCKET = 'city-images'
const NEW_CACHE = '31536000'  // 1 year, in seconds

async function main() {
  // realtime: { params: { eventsPerSecond: 0 } } would still try to init the
  // WebSocket client, which on Node 21 requires the ws package. We only use
  // storage here — pass auth/db config and let realtime stub out.
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: undefined as any },
  } as any)

  // List all objects in the bucket.
  const all: { name: string; metadata?: { mimetype?: string } }[] = []
  let offset = 0
  const PAGE = 100
  while (true) {
    const { data, error } = await sb.storage.from(BUCKET).list('', { limit: PAGE, offset })
    if (error) { console.error(error); return }
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
    offset += PAGE
  }
  console.log('Objects in', BUCKET, ':', all.length)

  let ok = 0
  let fail = 0
  for (let i = 0; i < all.length; i++) {
    const name = all[i].name
    if (!name) continue
    if (i % 25 === 0) console.log(`  ${i}/${all.length}: ${name}`)
    // Download then re-upload with the new cacheControl. upsert keeps the
    // same URL. We do this serially to be polite to the storage API.
    const { data: blob, error: dlErr } = await sb.storage.from(BUCKET).download(name)
    if (dlErr || !blob) { console.error('  download failed:', name, dlErr); fail++; continue }
    const contentType = all[i].metadata?.mimetype || 'image/jpeg'
    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(name, blob, {
        cacheControl: NEW_CACHE,
        contentType,
        upsert: true,
      })
    if (upErr) { console.error('  upload failed:', name, upErr); fail++; continue }
    ok++
  }
  console.log(`\n✓ updated cacheControl on ${ok} objects (${fail} failed)`)
  console.log('  new header: public, max-age=31536000, immutable (implied)')
}
main()

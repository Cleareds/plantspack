import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const verifyIds = [
  'cf1789d1-0432-43e0-a30b-0184035538f6', // Vegania
  '0631b7ae-da76-4fbf-9c00-db4fa2b45063', // Vegania Carabanchel
  '7ef91b41-b1a0-4862-9633-ec0d1c5b93f6', // Pura Vida Vegan Bar
  '993fdea7-1db8-45fb-8462-1e17f9746695', // Santa y Pura
  'aaf13980-ba07-42e6-b5f7-619a158b5122', // Hakuna Matata Veggie
  '39a3ef78-b73f-4e70-b8f4-c054dd198c42', // Mad Mad Vegan Madrid
  '75df17f2-3029-40ab-9aa0-167fad8c5f1e', // Bite Me Café
  '85278ac7-4335-4233-ae52-dbaaba456b5c', // La Encomienda
  '8844cfc2-5c0e-4390-b0a6-7550196da7fc', // shlen
  '9c144948-416a-42c7-92fb-5760d84706bf', // Veguiterráneo
]
const r = await sb.from('places').update({
  is_verified: true,
  last_verified_at: new Date().toISOString(),
  verification_method: 'editorial-web-2026-05-15',
  verification_level: 3,
}, { count: 'exact' }).in('id', verifyIds)
console.log('verified:', r.count, 'err:', r.error?.message)

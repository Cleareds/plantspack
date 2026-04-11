import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// Vercel cron: runs daily at 3:17 AM UTC
export const runtime = 'nodejs'
export const maxDuration = 60

// Protect with cron secret
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const tables = ['places', 'posts', 'users', 'comments', 'recipe_reviews', 'place_reviews', 'packs', 'pack_members', 'event_responses']

  const backup: Record<string, any> = {
    timestamp: new Date().toISOString(),
    tables: {},
  }

  for (const table of tables) {
    let allRows: any[] = []
    let offset = 0
    while (true) {
      const { data, error } = await supabase.from(table).select('*').range(offset, offset + 999)
      if (error || !data || data.length === 0) break
      allRows.push(...data)
      offset += 1000
      if (data.length < 1000) break
    }
    backup.tables[table] = { count: allRows.length, data: allRows }
  }

  // Store backup in Supabase Storage
  const fileName = `backups/db-backup-${timestamp}.json`
  const { error: uploadError } = await supabase.storage
    .from('backups')
    .upload(fileName, JSON.stringify(backup), {
      contentType: 'application/json',
      upsert: true,
    })

  if (uploadError) {
    // If bucket doesn't exist, try creating it
    if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
      await supabase.storage.createBucket('backups', { public: false })
      const { error: retryError } = await supabase.storage
        .from('backups')
        .upload(fileName, JSON.stringify(backup), {
          contentType: 'application/json',
          upsert: true,
        })
      if (retryError) {
        return NextResponse.json({ error: `Backup upload failed: ${retryError.message}` }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: `Backup upload failed: ${uploadError.message}` }, { status: 500 })
    }
  }

  const summary: Record<string, number> = {}
  for (const [table, data] of Object.entries(backup.tables)) {
    summary[table] = (data as any).count
  }

  return NextResponse.json({
    success: true,
    timestamp,
    fileName,
    summary,
  })
}

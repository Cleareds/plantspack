import { createClient } from '@/lib/supabase-server'
import SupportClient from './SupportClient'

export const revalidate = 3600

async function fetchStats() {
  try {
    const supabase = await createClient()
    const [statsRes, membersRes] = await Promise.all([
      supabase
        .from('platform_stats')
        .select('total_places, countries')
        .single(),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_banned', false),
    ])
    return {
      places: statsRes.data?.total_places ?? 0,
      countries: statsRes.data?.countries ?? 0,
      members: membersRes.count ?? 0,
    }
  } catch (e) {
    console.error('[Support] stats fetch failed', e)
    return { places: 0, countries: 0, members: 0 }
  }
}

export default async function SupportPage() {
  const initialStats = await fetchStats()
  return <SupportClient initialStats={initialStats} />
}

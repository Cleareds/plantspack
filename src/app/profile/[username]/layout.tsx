import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params

  try {
    const { data: user } = await supabase
      .from('users')
      .select('username, first_name, last_name, bio')
      .eq('username', username)
      .eq('is_banned', false)
      .single()

    if (!user) {
      return { title: 'User Not Found - PlantsPack' }
    }

    const displayName = user.first_name
      ? `${user.first_name} ${user.last_name || ''}`.trim()
      : user.username

    return {
      title: `${displayName} (@${user.username}) - PlantsPack`,
      description: user.bio || `${displayName}'s profile on PlantsPack, the vegan community platform.`,
      alternates: {
        canonical: `https://plantspack.com/profile/${user.username}`,
      },
      openGraph: {
        title: `${displayName} (@${user.username})`,
        description: user.bio || `${displayName}'s profile on PlantsPack.`,
        type: 'profile',
        siteName: 'PlantsPack',
        url: `https://plantspack.com/profile/${user.username}`,
      },
    }
  } catch {
    return { title: 'Profile - PlantsPack' }
  }
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}

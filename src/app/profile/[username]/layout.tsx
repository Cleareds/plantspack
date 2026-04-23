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

export default async function ProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  // Person JSON-LD — fetched same way as metadata. Minor signal to Google
  // that this is a real profile, not a thin/spam page. No scary claims —
  // just name + profile URL.
  let personJsonLd: Record<string, unknown> | null = null
  try {
    const { data: u } = await supabase
      .from('users')
      .select('username, first_name, last_name, bio, avatar_url')
      .eq('username', username)
      .eq('is_banned', false)
      .single()
    if (u) {
      const displayName = u.first_name
        ? `${u.first_name} ${u.last_name || ''}`.trim()
        : u.username
      personJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: displayName,
        alternateName: u.username,
        url: `https://plantspack.com/profile/${u.username}`,
        ...(u.avatar_url ? { image: u.avatar_url } : {}),
        ...(u.bio ? { description: u.bio } : {}),
      }
    }
  } catch {}

  return (
    <>
      {personJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      )}
      {children}
    </>
  )
}

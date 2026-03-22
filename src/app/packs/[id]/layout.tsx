import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params

  try {
    const { data: pack } = await supabase
      .from('packs')
      .select('title, description')
      .eq('id', id)
      .eq('is_published', true)
      .single()

    if (!pack) {
      return { title: 'Pack Not Found - PlantsPack' }
    }

    return {
      title: `${pack.title} - PlantsPack`,
      description: pack.description || `Explore the ${pack.title} pack on PlantsPack.`,
      openGraph: {
        title: pack.title,
        description: pack.description || `Explore the ${pack.title} pack on PlantsPack.`,
        type: 'article',
        siteName: 'PlantsPack',
      },
    }
  } catch {
    return { title: 'Pack - PlantsPack' }
  }
}

export default function PackDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}

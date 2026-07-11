import { redirect } from 'next/navigation'

// The "forest" of seeded digital trees is retired: the grove now lives on the
// profile itself (VeganCityCard) and grows from FINISHED Vegan Cities in the
// game - with golden trees for real planted ones. Old links land on the profile.
export default async function ForestRedirect({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  redirect(`/profile/${encodeURIComponent(username)}`)
}

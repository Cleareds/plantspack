import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { veganLevelOrder, VEGAN_LEVEL_LABEL } from '@/lib/vegan-level'
import snapshot from '@/data/snapshots/belgium-dq.json'

export const dynamic = 'force-dynamic'

interface PlaceRow {
  id: string
  slug: string | null
  name: string
  city: string | null
  country: string
  vegan_level: string | null
  website: string | null
  description: string | null
  main_image_url: string | null
  images: string[] | null
  verification_level: number | null
  verification_method: string | null
  admin_notes: string | null
}

const veganOrderDesc = (a: string | null, b: string | null) => veganLevelOrder(b) - veganLevelOrder(a)

export default async function BelgiumSnapshot() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  const places = snapshot.places as PlaceRow[]
  const capturedAt = snapshot.captured_at

  const all = places.length
  const verified = places.filter(r => (r.verification_level ?? 0) >= 3).length
  const fv = places.filter(r => r.vegan_level === 'fully_vegan').length
  const fvVerified = places.filter(r => r.vegan_level === 'fully_vegan' && (r.verification_level ?? 0) >= 3).length
  const noWebsite = places.filter(r => !r.website).length
  const noImage = places.filter(r => !r.main_image_url && !(r.images && r.images.length > 0)).length

  const byCity = new Map<string, PlaceRow[]>()
  for (const r of places) {
    const c = r.city || '(no city)'
    if (!byCity.has(c)) byCity.set(c, [])
    byCity.get(c)!.push(r)
  }
  const cities = [...byCity.entries()].sort((a, b) => b[1].length - a[1].length).map(([city, list]) => ({
    city,
    list: list.sort((a, b) => veganOrderDesc(a.vegan_level, b.vegan_level) || a.name.localeCompare(b.name)),
  }))

  return (
    <div className="p-6 max-w-[120rem] mx-auto">
      <nav className="text-sm text-on-surface-variant mb-4">
        <Link href="/admin" className="hover:text-primary">Admin</Link>
        <span className="mx-2">/</span>
        <Link href="/admin/data-quality" className="hover:text-primary">Data Quality</Link>
        <span className="mx-2">/</span>
        <span className="font-medium">Belgium - Snapshot (read-only)</span>
      </nav>

      <h1 className="text-2xl font-bold mb-1">Belgium - Snapshot (before manual audit)</h1>
      <p className="text-sm text-on-surface-variant mb-4">
        Frozen at <strong>{new Date(capturedAt).toLocaleString()}</strong>.
        Compare against the <Link href="/admin/data-quality/belgium" className="text-primary underline">live Belgium page</Link>.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <Stat label="Total" value={all} />
        <Stat label="Fully vegan" value={fv} />
        <Stat label="Verified" value={verified} valueClass="text-emerald-600" />
        <Stat label="FV verified" value={`${fvVerified}/${fv}`} />
        <Stat label="No website" value={noWebsite} valueClass="text-amber-600" />
        <Stat label="No image" value={noImage} valueClass="text-amber-600" />
      </div>

      {cities.map(({ city, list }) => {
        const cityFv = list.filter(r => r.vegan_level === 'fully_vegan').length
        const cityVer = list.filter(r => (r.verification_level ?? 0) >= 3).length
        return (
          <section key={city} className="mb-8">
            <h2 className="text-lg font-semibold mb-2">
              {city} <span className="text-sm font-normal text-on-surface-variant">- {list.length} places - {cityFv} FV - {cityVer} verified</span>
            </h2>
            <div className="overflow-x-auto ghost-border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-container-low text-xs uppercase text-on-surface-variant">
                  <tr>
                    <th className="px-3 py-2 text-left">Place</th>
                    <th className="px-3 py-2 text-left">Level</th>
                    <th className="px-3 py-2 text-left">Verif.</th>
                    <th className="px-3 py-2 text-left">Website</th>
                    <th className="px-3 py-2 text-left">Image</th>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(p => (
                    <tr key={p.id} className="border-t border-outline-variant/30 align-top">
                      <td className="px-3 py-2">
                        <Link href={`/place/${p.slug}`} className="text-primary hover:underline" target="_blank">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-xs">{VEGAN_LEVEL_LABEL[p.vegan_level as keyof typeof VEGAN_LEVEL_LABEL] || p.vegan_level || '-'}</td>
                      <td className="px-3 py-2 text-xs">
                        L{p.verification_level ?? 0}
                        {p.verification_method ? <span className="text-on-surface-variant"> / {p.verification_method}</span> : null}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {p.website ? <a href={p.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">link</a> : <span className="text-amber-600">none</span>}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {p.main_image_url || (p.images && p.images.length > 0) ? 'yes' : <span className="text-amber-600">none</span>}
                      </td>
                      <td className="px-3 py-2 text-xs max-w-md">
                        <span className={(p.description || '').length < 120 ? 'text-amber-600' : ''}>
                          {(p.description || '').slice(0, 200) || <span className="text-amber-600">none</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs max-w-xs whitespace-pre-wrap">{p.admin_notes || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </div>
  )
}

function Stat({ label, value, valueClass }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="bg-surface-container-lowest ghost-border rounded-lg p-3">
      <div className="text-xs text-on-surface-variant">{label}</div>
      <div className={`text-xl font-bold ${valueClass || 'text-on-surface'}`}>{value}</div>
    </div>
  )
}

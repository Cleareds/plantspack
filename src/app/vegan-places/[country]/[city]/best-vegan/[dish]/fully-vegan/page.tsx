import type { Metadata } from 'next'
import { buildDishMetadata, renderDishPage, type RouteParams } from '../dish-page'

// /best-vegan/<dish>/fully-vegan - the dish page filtered to 100% vegan
// venues. A route segment instead of ?level=fully-vegan so the base page
// stays statically cacheable. Canonical stays on the unfiltered page and
// this variant is noindex: it is a view, not a second document.
export const revalidate = 86400

// ISR actually requires this. A dynamic segment WITHOUT generateStaticParams is
// rendered on every request and `revalidate` is ignored - the build table lists
// it as "ƒ (Dynamic)" and responses carry `cache-control: no-store`
// (verified on deployment e2939b4, 2026-10-01: still x-vercel-cache: MISS after
// the searchParams removal). Returning [] prerenders nothing at build time and
// lets every path be generated on first request, then cached for `revalidate`
// seconds - the same pattern as /place/[id].
export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const meta = await buildDishMetadata(await params)
  return { ...meta, robots: { index: false, follow: true } }
}

export default async function DishFullyVeganPage({ params }: { params: Promise<RouteParams> }) {
  return renderDishPage(await params, true)
}

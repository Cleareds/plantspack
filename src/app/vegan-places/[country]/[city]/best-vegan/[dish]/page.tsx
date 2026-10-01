import type { Metadata } from 'next'
import { buildDishMetadata, renderDishPage, type RouteParams } from './dish-page'

// ISR: the route is confirmed working, so cache aggressively (24h). Dish
// pages change rarely and force-dynamic was starving crawl budget — every
// hit re-ran the queries uncached, so Googlebot crawled these slowly and
// deprioritised them (they dominated the "Discovered – not indexed" pile).
// No searchParams here on purpose - they would make the page dynamic again.
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
  return buildDishMetadata(await params)
}

export default async function DishPage({ params }: { params: Promise<RouteParams> }) {
  return renderDishPage(await params, false)
}

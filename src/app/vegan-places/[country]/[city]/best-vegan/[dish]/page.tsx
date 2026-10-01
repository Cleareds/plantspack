import type { Metadata } from 'next'
import { buildDishMetadata, renderDishPage, type RouteParams } from './dish-page'

// ISR: the route is confirmed working, so cache aggressively (24h). Dish
// pages change rarely and force-dynamic was starving crawl budget — every
// hit re-ran the queries uncached, so Googlebot crawled these slowly and
// deprioritised them (they dominated the "Discovered – not indexed" pile).
// No searchParams here on purpose - they would make the page dynamic again.
export const revalidate = 86400

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  return buildDishMetadata(await params)
}

export default async function DishPage({ params }: { params: Promise<RouteParams> }) {
  return renderDishPage(await params, false)
}

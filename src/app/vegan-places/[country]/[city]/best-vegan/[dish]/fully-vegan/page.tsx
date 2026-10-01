import type { Metadata } from 'next'
import { buildDishMetadata, renderDishPage, type RouteParams } from '../dish-page'

// /best-vegan/<dish>/fully-vegan - the dish page filtered to 100% vegan
// venues. A route segment instead of ?level=fully-vegan so the base page
// stays statically cacheable. Canonical stays on the unfiltered page and
// this variant is noindex: it is a view, not a second document.
export const revalidate = 86400

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const meta = await buildDishMetadata(await params)
  return { ...meta, robots: { index: false, follow: true } }
}

export default async function DishFullyVeganPage({ params }: { params: Promise<RouteParams> }) {
  return renderDishPage(await params, true)
}

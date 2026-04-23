import { buildSitemap, xmlResponse } from '@/lib/sitemap/build'

export const dynamic = 'force-dynamic'

export async function GET() {
  const body = await buildSitemap('priority')
  return xmlResponse(body)
}

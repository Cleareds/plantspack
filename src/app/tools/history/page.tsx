import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ScanLine, UtensilsCrossed, Barcode, CheckCircle2, AlertCircle, HelpCircle, PackageX } from 'lucide-react'
import { createClient as createServerClient } from '@/lib/supabase-server'
import type { ScanResult } from '@/lib/tool-quota'

export const metadata: Metadata = {
  title: 'My scan history | Plants Pack',
  description: 'Your previous ingredient, menu, and barcode scans.',
  robots: { index: false, follow: false },
}

export default async function ScanHistoryPage() {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login?next=/tools/history')

  const { data: scans } = await sb
    .from('tool_scans')
    .select('id, tool, verdict, result, allergens, rejected, created_at')
    .eq('user_id', user.id)
    .eq('rejected', false)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
        <Link
          href="/tools"
          className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>All tools</span>
        </Link>

        <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight leading-[1.1] mb-3">
          My scan history
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed mb-8">
          Your last 50 ingredient, menu, and barcode scans. Only you can see this. Synced across devices when signed in.
        </p>

        {!scans || scans.length === 0 ? (
          <div className="rounded-2xl ghost-border bg-surface-container-lowest p-8 text-center text-on-surface-variant">
            No scans yet.{' '}
            <Link href="/tools/barcode" className="text-primary underline">Try the barcode scanner</Link>,{' '}
            <Link href="/tools/ingredient-scanner" className="text-primary underline">ingredient scanner</Link>, or{' '}
            <Link href="/tools/menu-scanner" className="text-primary underline">menu scanner</Link>.
          </div>
        ) : (
          <div className="space-y-3">
            {scans.map((s) => (
              <ScanRow key={s.id} scan={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Barcode scans extend the standard ScanResult with product fields the
// barcode API writes into the result jsonb. Loose typing so this stays a
// drop-in render without a separate row type.
interface BarcodeScanResult {
  summary?: string
  barcode?: string
  productName?: string | null
  brand?: string | null
  imageUrl?: string | null
  allergenHits?: string[]
}

interface ScanRowData {
  id: string
  tool: string
  verdict: string | null
  result: (ScanResult & BarcodeScanResult) | null
  allergens: string[] | null
  created_at: string
}

function ScanRow({ scan }: { scan: ScanRowData }) {
  const isBarcode = scan.tool === 'barcode'
  const ToolIcon = scan.tool === 'menu' ? UtensilsCrossed : isBarcode ? Barcode : ScanLine
  const verdict = scan.verdict ?? 'unclear'
  const theme = {
    vegan: { Icon: CheckCircle2, text: 'text-success', label: 'Vegan' },
    not_vegan: { Icon: AlertCircle, text: 'text-error', label: 'Not vegan' },
    uncertain: { Icon: HelpCircle, text: 'text-warning', label: 'Uncertain' },
    unclear: { Icon: HelpCircle, text: 'text-on-surface-variant', label: 'Unclear' },
    invalid_image: { Icon: AlertCircle, text: 'text-error', label: 'Invalid' },
    not_found: { Icon: PackageX, text: 'text-on-surface-variant', label: 'Not in DB' },
  }[verdict as 'vegan' | 'not_vegan' | 'uncertain' | 'unclear' | 'invalid_image' | 'not_found'] ?? {
    Icon: HelpCircle, text: 'text-on-surface-variant', label: verdict,
  }

  const date = new Date(scan.created_at)
  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  const r = scan.result
  const headline = isBarcode
    ? (r?.productName ?? (r?.barcode ? `Barcode ${r.barcode}` : 'Barcode scan'))
    : `${scan.tool[0].toUpperCase() + scan.tool.slice(1)} scan`
  const subhead = isBarcode ? r?.brand ?? null : null
  const description = isBarcode
    ? r?.summary ?? null
    : r?.summary ?? null

  return (
    <div className="rounded-xl ghost-border bg-surface-container-lowest p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <ToolIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <theme.Icon className={`h-4 w-4 ${theme.text} flex-shrink-0`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>{theme.label}</span>
            <span className="text-xs text-on-surface-variant ml-auto">{dateStr}</span>
          </div>
          <div className="text-sm font-semibold text-on-surface mb-0.5 truncate">{headline}</div>
          {subhead && <div className="text-xs text-on-surface-variant mb-1 truncate">{subhead}</div>}
          {description && (
            <div className="text-sm text-on-surface-variant leading-relaxed mt-1">{description}</div>
          )}
          {isBarcode && r?.allergenHits && r.allergenHits.length > 0 && (
            <div className="text-xs text-warning mt-2">
              Allergen match: {r.allergenHits.join(', ')}
            </div>
          )}
          {scan.allergens && scan.allergens.length > 0 && (
            <div className="text-xs text-on-surface-variant mt-2">
              Filtered for: {scan.allergens.join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

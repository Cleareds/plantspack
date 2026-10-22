import Link from 'next/link'
import type { ReactNode } from 'react'

/** Page frame for a single business tool, with a way back to the place's dashboard. */
export default function ToolPageShell({ placeId, children }: { placeId: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href={`/business/places/${placeId}`} className="text-sm font-medium text-primary hover:underline">&larr; Back to the dashboard</Link>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

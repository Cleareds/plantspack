import { Metadata } from 'next'
import Link from 'next/link'
import BusinessDashboard from '@/components/business/BusinessDashboard'
import AdminPreviewGate from '@/components/business/AdminPreviewGate'

// The shell is static; everything user-specific loads in the browser.
export const metadata: Metadata = {
  title: 'Business dashboard | PlantsPack',
  robots: { index: false, follow: false },
}

export default function BusinessDashboardPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
          <div>
            <h1 className="font-headline font-extrabold text-3xl text-on-surface">Business dashboard</h1>
            <p className="text-on-surface-variant mt-1">Free tools for the places you manage on PlantsPack.</p>
          </div>
          <Link href="/business" className="text-sm font-medium text-primary hover:underline">How it works</Link>
        </div>
        <AdminPreviewGate allowPilotOwners fallback={<p className="text-on-surface-variant">Owner tools are coming soon.</p>}>
          <BusinessDashboard />
        </AdminPreviewGate>
      </div>
    </div>
  )
}

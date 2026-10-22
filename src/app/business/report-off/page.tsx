import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Monthly report switched off | PlantsPack',
  robots: { index: false, follow: false },
}

export default function ReportOffPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="font-headline font-extrabold text-3xl text-on-surface mb-3">Monthly report switched off</h1>
        <p className="text-on-surface-variant mb-6">
          We will not send you the monthly summary for your place any more. Your numbers stay on your business dashboard,
          and you can switch the email back on there.
        </p>
        <Link href="/business/dashboard" className="inline-flex px-5 py-2.5 rounded-xl bg-primary text-on-primary-btn font-medium">
          Open your business dashboard
        </Link>
      </div>
    </div>
  )
}

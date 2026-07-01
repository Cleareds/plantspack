import { redirect } from 'next/navigation'

// User corrections are managed under Data Quality → User Corrections (a single
// implementation). This standalone page duplicated that queue; we keep the URL
// working by redirecting to the canonical tab.
export default function AdminCorrectionsRedirect() {
  redirect('/admin/data-quality?tab=corrections')
}

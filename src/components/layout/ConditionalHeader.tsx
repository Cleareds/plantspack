'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'
import BetaBanner from './BetaBanner'

export default function ConditionalHeader() {
  const pathname = usePathname()

  // Hide header and banner on admin pages
  const isAdminPage = pathname?.startsWith('/admin')

  if (isAdminPage) {
    return null
  }

  return (
    <>
      <Header />
      <BetaBanner />
    </>
  )
}

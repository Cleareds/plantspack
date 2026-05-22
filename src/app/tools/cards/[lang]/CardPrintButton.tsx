'use client'

import { Printer } from 'lucide-react'

export default function CardPrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90"
    >
      <Printer className="h-4 w-4" />
      Print / Save PDF
    </button>
  )
}

'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sprout, Loader2 } from 'lucide-react'

export default function SeedTreeButton({ balance, amount }: { balance: number; amount: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const disabled = busy || balance < amount

  async function seed() {
    setBusy(true); setMsg(null)
    try {
      const r = await fetch('/api/sprouts/seed', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const j = await r.json()
      if (!r.ok || !j.ok) setMsg(j.reason || 'failed')
      else { setMsg(`Seeded ${amount}`); router.refresh() }
    } catch { setMsg('error') }
    finally { setBusy(false) }
  }

  return (
    <button
      onClick={seed}
      disabled={disabled}
      className="px-4 py-2 rounded-lg border-2 border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-semibold"
      title={balance < amount ? 'Not enough balance' : ''}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sprout className="w-4 h-4" />}
      Seed {amount}{msg ? ` - ${msg}` : ''}
    </button>
  )
}

'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Plus } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'
const AddPlaceModal = dynamic(() => import('./AddPlaceModal'), { ssr: false })

interface GlobalAddPlaceButtonProps {
  className?: string
  children?: React.ReactNode
}

export default function GlobalAddPlaceButton({ className, children }: GlobalAddPlaceButtonProps) {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)

  if (!user) {
    return (
      <Link href="/auth" className={className}>
        {children || <><Plus className="h-4 w-4" /> Add a Place</>}
      </Link>
    )
  }

  return (
    <>
      <button onClick={() => setShowModal(true)} className={className}>
        {children || <><Plus className="h-4 w-4" /> Add a Place</>}
      </button>
      {showModal && (
        <AddPlaceModal
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

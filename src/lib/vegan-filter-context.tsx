'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { safeStorage } from './safe-storage'

type VeganFilter = 'all' | 'fully_vegan'

interface VeganFilterContextType {
  veganFilter: VeganFilter
  setVeganFilter: (filter: VeganFilter) => void
  isFullyVeganOnly: boolean
}

const VeganFilterContext = createContext<VeganFilterContextType>({
  veganFilter: 'all',
  setVeganFilter: () => {},
  isFullyVeganOnly: false,
})

export function VeganFilterProvider({ children }: { children: ReactNode }) {
  const [veganFilter, setVeganFilterState] = useState<VeganFilter>('all')

  // Load from localStorage on mount
  useEffect(() => {
    const saved = safeStorage.local.get('plantspack_vegan_filter')
    if (saved === 'fully_vegan') {
      setVeganFilterState('fully_vegan')
    }
  }, [])

  const setVeganFilter = (filter: VeganFilter) => {
    setVeganFilterState(filter)
    safeStorage.local.set('plantspack_vegan_filter', filter)
  }

  return (
    <VeganFilterContext.Provider value={{
      veganFilter,
      setVeganFilter,
      isFullyVeganOnly: veganFilter === 'fully_vegan',
    }}>
      {children}
    </VeganFilterContext.Provider>
  )
}

export function useVeganFilter() {
  return useContext(VeganFilterContext)
}

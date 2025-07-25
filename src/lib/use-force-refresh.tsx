'use client'

import { useState, useCallback } from 'react'

export function useForceRefresh() {
  const [refreshKey, setRefreshKey] = useState(0)

  const forceRefresh = useCallback(() => {
    console.log('🔄 Force refresh triggered')
    setRefreshKey(prev => prev + 1)
  }, [])

  return { refreshKey, forceRefresh }
}
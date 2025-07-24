// Performance monitoring utilities

export function measurePerformance<T>(
  name: string,
  fn: () => T
): T {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now()
    const result = fn()
    const end = performance.now()
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`)
    return result
  }
  return fn()
}

export async function measureAsyncPerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`)
    return result
  }
  return await fn()
}

export function createPerformanceMarker(name: string) {
  if (process.env.NODE_ENV === 'development' && typeof performance !== 'undefined') {
    performance.mark(`${name}-start`)
    
    return {
      end: () => {
        performance.mark(`${name}-end`)
        performance.measure(name, `${name}-start`, `${name}-end`)
        const measure = performance.getEntriesByName(name, 'measure')[0]
        console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`)
        
        // Clean up marks
        performance.clearMarks(`${name}-start`)
        performance.clearMarks(`${name}-end`)
        performance.clearMeasures(name)
      }
    }
  }
  
  return { end: () => {} }
}

// Memory usage monitoring (development only)
export function logMemoryUsage(label?: string) {
  if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
    const memory = (performance as any).memory
    const used = Math.round(memory.usedJSHeapSize / 1024 / 1024)
    const total = Math.round(memory.totalJSHeapSize / 1024 / 1024)
    const limit = Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
    
    console.log(
      `[Memory${label ? ` ${label}` : ''}] Used: ${used}MB, Total: ${total}MB, Limit: ${limit}MB`
    )
  }
}

// Detect memory leaks by monitoring component mount/unmount
export function createComponentTracker(componentName: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Component] ${componentName} mounted`)
    logMemoryUsage(`after ${componentName} mount`)
    
    return () => {
      console.log(`[Component] ${componentName} unmounted`)
      logMemoryUsage(`after ${componentName} unmount`)
    }
  }
  
  return () => {}
}

// Debounce function for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): T {
  let timeout: NodeJS.Timeout | null = null
  
  return ((...args: Parameters<T>) => {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    
    const callNow = immediate && !timeout
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    
    if (callNow) func(...args)
  }) as T
}

// Throttle function for performance optimization
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean
  
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }) as T
}
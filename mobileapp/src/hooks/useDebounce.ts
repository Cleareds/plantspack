import { useState, useEffect } from 'react';
import { constants } from '@/src/constants/theme';

/**
 * Hook to debounce a value
 */
export function useDebounce<T>(value: T, delay: number = constants.DEBOUNCE_DELAY): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

import { useEffect, useState } from 'react'

import { useThemeStore } from '@/stores/ThemeStore'

/**
 * Web-compatible colour scheme hook. Uses the CSS `prefers-color-scheme`
 * media query for system detection and respects the user's stored preference.
 */
export function useColorScheme(): 'light' | 'dark' {
  const preference = useThemeStore((s) => s.preference)
  // Match the static HTML first, then resolve this device's appearance.
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemScheme(mq.matches ? 'dark' : 'light')
    const handler = (e: MediaQueryListEvent) =>
      setSystemScheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (preference === 'light' || preference === 'dark') {
    return preference
  }
  return systemScheme
}

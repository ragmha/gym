import { useColorScheme as useRNColorScheme } from 'react-native'

import { useThemeStore } from '@/stores/ThemeStore'

/**
 * Returns the resolved colour scheme ('light' | 'dark') respecting the user's
 * stored preference. When preference is 'system', falls back to the OS setting.
 */
export function useColorScheme(): 'light' | 'dark' {
  const preference = useThemeStore((s) => s.preference)
  const systemScheme = useRNColorScheme()

  if (preference === 'light' || preference === 'dark') {
    return preference
  }

  return systemScheme === 'dark' ? 'dark' : 'light'
}

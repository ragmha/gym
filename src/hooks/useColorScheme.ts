import { useColorScheme as useRNColorScheme } from 'react-native'

/**
 * Wraps React Native's useColorScheme to return only 'light' | 'dark',
 * defaulting to 'light' when the system reports null or 'unspecified'.
 */
export function useColorScheme(): 'light' | 'dark' {
  const scheme = useRNColorScheme()
  return scheme === 'dark' ? 'dark' : 'light'
}

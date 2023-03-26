import type { Theme } from '@/theme/types'

import { useMemo } from 'react'

import { useColorScheme } from 'react-native'

import { darkTheme, lightTheme } from '@/theme'

export const useCurrentTheme = (): Theme => {
  const colorScheme = useColorScheme()

  const theme = useMemo(
    () => (colorScheme === 'dark' ? darkTheme : lightTheme),
    [colorScheme],
  )

  return theme
}

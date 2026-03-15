/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import {
  Colors,
  type ThemeColorKey,
  type ThemeColors,
} from '@/constants/Colors'
import { useColorScheme } from '@/hooks/useColorScheme'

/**
 * Returns the full resolved theme object (`Colors.light` or `Colors.dark`).
 * Prefer this when a component needs multiple tokens — avoids repeated hook
 * calls and throwaway `{}` objects.
 *
 * @example
 * const theme = useTheme()
 * <Text style={{ color: theme.text }}>…</Text>
 */
export function useTheme(): ThemeColors {
  const scheme = useColorScheme() ?? 'light'
  return Colors[scheme]
}

/**
 * Returns a single resolved colour value. Accepts optional per-scheme
 * overrides via `props`; falls back to the design-system token.
 *
 * @example
 * const color = useThemeColor({}, 'accent')
 * const custom = useThemeColor({ dark: '#fff' }, 'text')
 */
export function useThemeColor(
  props: { light?: string; dark?: string } = {},
  colorName: ThemeColorKey,
) {
  const scheme = useColorScheme() ?? 'light'
  return props[scheme] ?? Colors[scheme][colorName]
}

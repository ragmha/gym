import type { TextStyle, ViewStyle } from 'react-native'

export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const

export const Radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const

export const Typography = {
  displayLg: {
    fontSize: 52,
    lineHeight: 56,
    fontWeight: '800',
    letterSpacing: -1.8,
  },
  displayMd: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  headingXl: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  headingLg: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  headingMd: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  headingSm: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  headingXs: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  bodyLg: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '500',
  },
  bodyMd: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  bodySm: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  labelLg: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelMd: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  labelSm: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  numericLg: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  numericMd: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
} as const satisfies Record<string, TextStyle>

export const Elevation = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 14,
  },
} as const satisfies Record<string, ViewStyle>

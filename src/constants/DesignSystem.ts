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
  panel: 28,
  pill: 999,
} as const

export const Layout = {
  contentMaxWidth: 720,
  gutter: 24,
  controlSize: 48,
} as const

export const Typography = {
  /** Weight screen hero only; see DESIGN.md "Weight screen exception". */
  displayXl: {
    fontSize: 88,
    lineHeight: 96,
    fontWeight: '800',
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  },
  displayLg: {
    fontSize: 64,
    lineHeight: 72,
    fontWeight: '300',
    letterSpacing: -2,
  },
  displayMd: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '300',
    letterSpacing: -1.4,
  },
  headingXl: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
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
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  headingXs: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  bodyLg: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '400',
  },
  bodyMd: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '400',
  },
  bodySm: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
  },
  labelLg: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0,
  },
  labelMd: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0,
  },
  labelSm: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0,
  },
  numericLg: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '300',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  numericMd: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  },
} as const satisfies Record<string, TextStyle>

export const Elevation = {
  soft: {
    boxShadow: '0 6px 24px rgba(24, 29, 43, 0.06)',
  },
  floating: {
    boxShadow: '0 12px 36px rgba(24, 29, 43, 0.09)',
  },
} as const satisfies Record<string, ViewStyle>

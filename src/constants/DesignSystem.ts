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
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  panel: 16,
  pill: 999,
} as const

export const Layout = {
  contentMaxWidth: 720,
  gutter: 24,
  controlSize: 48,
} as const

export const Typography = {
  displayXl: {
    fontSize: 88,
    lineHeight: 96,
    fontWeight: '300',
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  },
  displayLg: {
    fontSize: 64,
    lineHeight: 72,
    fontWeight: '300',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  displayMd: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '300',
    letterSpacing: -1.4,
    fontVariant: ['tabular-nums'],
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
    fontFamily: 'SpaceMono',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  labelSm: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    fontFamily: 'SpaceMono',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
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
    boxShadow: 'none',
  },
  floating: {
    boxShadow: 'none',
  },
} as const satisfies Record<string, ViewStyle>

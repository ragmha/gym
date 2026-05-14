import type { Ionicons } from '@expo/vector-icons'

import type { ThemeColorKey } from '@/constants/Colors'

export const METRIC_IDS = [
  'recovery',
  'steps',
  'calories',
  'nutrition-intake',
  'sleep',
  'hydration',
  'heart-rate',
  'hrv',
  'resting-hr',
  'flights-climbed',
] as const

export type MetricId = (typeof METRIC_IDS)[number]
export type MetricRoute = '/steps' | '/hydration' | '/nutrition'
export type MetricStatus = 'empty' | 'progress' | 'reached' | 'over'
export type MetricIconName = keyof typeof Ionicons.glyphMap

export interface MetricPresentation {
  id: MetricId
  label: string
  value: string
  unit?: string
  subtitle: string
  iconName: MetricIconName
  accentColorToken: ThemeColorKey
  progress: number
  route?: MetricRoute
  status: MetricStatus
}

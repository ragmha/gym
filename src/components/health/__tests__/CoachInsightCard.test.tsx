import { render } from '@testing-library/react-native'
import React from 'react'

import type { CoachInsight } from '@/lib/validators'

import { CoachInsightCard } from '../CoachInsightCard'

jest.mock('@/hooks/useThemeColor', () => ({
  useTheme: () => ({
    text: '#0F172A',
    background: '#F8FAFC',
    cardBackground: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    tint: '#007AFF',
    icon: '#64748B',
    tabIconDefault: '#64748B',
    tabIconSelected: '#007AFF',
    shadow: '#0F172A',
    selectedCircle: '#16A34A',
    accent: '#007AFF',
    info: '#0EA5E9',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    border: '#E2E8F0',
    separator: 'rgba(100,116,139,0.16)',
    disabled: '#94A3B8',
    selectedText: '#FFFFFF',
    checkboxBackground: '#FFFFFF',
    badgeBackground: 'rgba(15,23,42,0.06)',
    accentInactive: 'rgba(0,122,255,0.12)',
    infoInactive: 'rgba(14,165,233,0.14)',
    successInactive: 'rgba(22,163,74,0.14)',
    skeleton: '#FFFFFF',
    skeletonElement: '#E2E8F0',
    videoBackground: '#020617',
    thumbnailContent: '#CBD5E1',
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    tabBarFloating: '#FFFFFF',
    cardSurface: '#F1F5F9',
    subtitleText: '#475569',
    metricSteps: '#2563EB',
    metricCalories: '#F97316',
    metricSleep: '#8B5CF6',
    metricHydration: '#0EA5E9',
    metricHeart: '#EF4444',
    metricHrv: '#10B981',
    metricRestingHr: '#F59E0B',
    metricFlights: '#6366F1',
    metricNutrition: '#22c55e',
  }),
}))

const insight: CoachInsight = {
  headline: 'Strong base for today',
  body: 'Recovery is 72/100. Steps are at 8000.',
  suggestion: 'Keep the first working set controlled.',
  tone: 'celebrate',
}

describe('CoachInsightCard', () => {
  it('renders the headline and suggestion', () => {
    const { getByText, getByTestId } = render(
      <CoachInsightCard insight={insight} status="ready" />,
    )

    expect(getByTestId('coach-insight-card')).toBeTruthy()
    expect(getByText('AI Coach')).toBeTruthy()
    expect(getByText('On-device')).toBeTruthy()
    expect(getByText('Strong base for today')).toBeTruthy()
    expect(getByText('Keep the first working set controlled.')).toBeTruthy()
  })

  it('renders nothing on error', () => {
    const { queryByTestId, toJSON } = render(
      <CoachInsightCard insight={insight} status="error" />,
    )

    expect(queryByTestId('coach-insight-card')).toBeNull()
    expect(toJSON()).toBeNull()
  })
})

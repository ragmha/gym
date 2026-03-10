import React, { act } from 'react'
import { Platform } from 'react-native'
import renderer from 'react-test-renderer'

import { HealthMetrics } from '../HealthMetrics'

// Mock dependencies
jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: () => '#000000',
}))

const defaultProps = {
  isAvailable: true,
  isAuthorized: true,
  isDemoMode: false,
  isLoading: false,
  calories: 345,
  workouts: [],
  onRequestAuth: jest.fn(),
  onRefresh: jest.fn(),
}

function renderToJSON(element: React.ReactElement) {
  let component: renderer.ReactTestRenderer
  act(() => {
    // @ts-expect-error -- @types/react-test-renderer depends on @types/react@18 while project uses @types/react@19; versions are compatible at runtime
    component = renderer.create(element)
  })
  return component!.toJSON()
}

describe('HealthMetrics', () => {
  const originalPlatform = Platform.OS

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform,
    })
    jest.clearAllMocks()
  })

  it('shows fallback when not available and not demo mode', () => {
    const tree = renderToJSON(
      <HealthMetrics
        {...defaultProps}
        isAvailable={false}
        isDemoMode={false}
      />,
    )

    expect(tree).not.toBeNull()
    const json = JSON.stringify(tree)
    expect(json).toContain('Health tracking unavailable')
  })

  it('shows demo data when not available but in demo mode', () => {
    const tree = renderToJSON(
      <HealthMetrics {...defaultProps} isAvailable={false} isDemoMode={true} />,
    )

    expect(tree).not.toBeNull()
    const json = JSON.stringify(tree)
    expect(json).toContain("Today's Health")
    expect(json).toContain('Demo')
  })

  it('shows fallback when not available', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    })
    const tree = renderToJSON(
      <HealthMetrics {...defaultProps} isAvailable={false} />,
    )

    expect(tree).not.toBeNull()
    const json = JSON.stringify(tree)
    expect(json).toContain('Health tracking unavailable')
  })

  it('shows connect prompt when not authorized', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    })
    const tree = renderToJSON(
      <HealthMetrics {...defaultProps} isAuthorized={false} />,
    )

    const json = JSON.stringify(tree)
    expect(json).toContain('Connect Apple Health')
    expect(json).toContain('View your steps, calories, and workouts')
  })

  it('shows loading indicator when loading', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    })
    const tree = renderToJSON(
      <HealthMetrics {...defaultProps} isLoading={true} />,
    )

    const json = JSON.stringify(tree)
    expect(json).toContain("Today's Health")
  })

  it('shows calories when authorized', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    })
    const tree = renderToJSON(<HealthMetrics {...defaultProps} />)

    const json = JSON.stringify(tree)
    expect(json).toContain('Calories')
    expect(json).toContain('345 / 500 kcal')
    expect(json).toContain("Today's Health")
    expect(json).toContain('Refresh')
  })

  it('shows workout summary when there are today workouts', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    })
    const now = new Date()
    const workouts = [
      {
        activityName: 'TraditionalStrengthTraining',
        calories: 280,
        distance: 0,
        duration: 45,
        start: now.toISOString(),
        end: now.toISOString(),
      },
      {
        activityName: 'Running',
        calories: 200,
        distance: 5000,
        duration: 30,
        start: now.toISOString(),
        end: now.toISOString(),
      },
    ]

    const tree = renderToJSON(
      <HealthMetrics {...defaultProps} workouts={workouts} />,
    )

    const json = JSON.stringify(tree)
    expect(json).toContain('2')
    expect(json).toContain('workout')
    expect(json).toContain('today')
    expect(json).toContain('75')
    expect(json).toContain('min total')
  })

  it('does not show workout summary when no workouts today', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    })
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const workouts = [
      {
        activityName: 'Running',
        calories: 200,
        distance: 5000,
        duration: 30,
        start: yesterday.toISOString(),
        end: yesterday.toISOString(),
      },
    ]

    const tree = renderToJSON(
      <HealthMetrics {...defaultProps} workouts={workouts} />,
    )

    const json = JSON.stringify(tree)
    expect(json).not.toContain('workout')
    expect(json).not.toContain('min total')
  })
})

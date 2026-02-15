import React from 'react'
import { act } from 'react'
import renderer from 'react-test-renderer'
import { Platform } from 'react-native'

import { HealthMetrics } from '../HealthMetrics'

// Mock dependencies
jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: () => '#000000',
}))

const defaultProps = {
  isAvailable: true,
  isAuthorized: true,
  isLoading: false,
  calories: 345,
  workouts: [],
  onRequestAuth: jest.fn(),
  onRefresh: jest.fn(),
}

function renderToJSON(element: React.ReactElement) {
  let component: renderer.ReactTestRenderer
  act(() => {
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

  it('returns null on Android', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    })
    const tree = renderToJSON(<HealthMetrics {...defaultProps} />)

    expect(tree).toBeNull()
  })

  it('returns null when not available', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    })
    const tree = renderToJSON(
      <HealthMetrics {...defaultProps} isAvailable={false} />,
    )

    expect(tree).toBeNull()
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

import React, { act } from 'react'
import { Platform } from 'react-native'
import renderer from 'react-test-renderer'

import { DailySteps } from '../DailySteps'

// Mock useThemeColor
jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: () => '#000000',
}))

function renderToJSON(element: React.ReactElement) {
  let component: renderer.ReactTestRenderer
  act(() => {
    // @ts-expect-error -- @types/react-test-renderer depends on @types/react@18 while project uses @types/react@19; versions are compatible at runtime
    component = renderer.create(element)
  })
  return component!.toJSON()
}

describe('DailySteps', () => {
  const originalPlatform = Platform.OS

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform,
    })
  })

  it('renders on iOS with step count and goal', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    })
    const tree = renderToJSON(<DailySteps steps={5432} />)

    expect(tree).not.toBeNull()
    const json = JSON.stringify(tree)
    expect(json).toContain('Daily Steps')
    expect(json).toContain('5,432')
    expect(json).toContain('4,568 steps to go')
    expect(json).toContain('Goal: ')
    expect(json).toContain('10,000')
  })

  it('returns null on Android', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    })
    const tree = renderToJSON(<DailySteps steps={5000} />)

    expect(tree).toBeNull()
  })

  it('shows goal reached when steps >= goal', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    })
    const tree = renderToJSON(<DailySteps steps={12000} goal={10000} />)

    const json = JSON.stringify(tree)
    expect(json).toContain('Goal reached!')
    expect(json).toContain('12,000')
  })

  it('shows exactly at goal', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    })
    const tree = renderToJSON(<DailySteps steps={10000} goal={10000} />)

    const json = JSON.stringify(tree)
    expect(json).toContain('Goal reached!')
    expect(json).toContain('10,000')
  })

  it('accepts a custom goal', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    })
    const tree = renderToJSON(<DailySteps steps={3000} goal={5000} />)

    const json = JSON.stringify(tree)
    expect(json).toContain('2,000 steps to go')
    expect(json).toContain('Goal: ')
    expect(json).toContain('5,000')
  })

  it('handles zero steps', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    })
    const tree = renderToJSON(<DailySteps steps={0} />)

    const json = JSON.stringify(tree)
    expect(json).toContain('0')
    expect(json).toContain('10,000 steps to go')
  })

  it('has the testID for querying', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    })
    const tree = renderToJSON(<DailySteps steps={1000} />)

    expect(tree).toHaveProperty('props.testID', 'daily-steps-card')
  })
})

import React from 'react'
import renderer from 'react-test-renderer'
import { Platform } from 'react-native'

import { DailySteps } from '../DailySteps'

// Mock useThemeColor
jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: () => '#000000',
}))

describe('DailySteps', () => {
  const originalPlatform = Platform.OS

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform })
  })

  it('renders on iOS with step count and goal', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' })
    const tree = renderer.create(<DailySteps steps={5432} />).toJSON()

    expect(tree).not.toBeNull()
    const json = JSON.stringify(tree)
    expect(json).toContain('Daily Steps')
    expect(json).toContain('5,432')
    expect(json).toContain('4,568 steps to go')
    expect(json).toContain('Goal: ')
    expect(json).toContain('10,000')
  })

  it('returns null on Android', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' })
    const tree = renderer.create(<DailySteps steps={5000} />).toJSON()

    expect(tree).toBeNull()
  })

  it('shows goal reached when steps >= goal', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' })
    const tree = renderer.create(<DailySteps steps={12000} goal={10000} />).toJSON()

    const json = JSON.stringify(tree)
    expect(json).toContain('Goal reached!')
    expect(json).toContain('12,000')
  })

  it('shows exactly at goal', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' })
    const tree = renderer.create(<DailySteps steps={10000} goal={10000} />).toJSON()

    const json = JSON.stringify(tree)
    expect(json).toContain('Goal reached!')
    expect(json).toContain('10,000')
  })

  it('accepts a custom goal', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' })
    const tree = renderer.create(<DailySteps steps={3000} goal={5000} />).toJSON()

    const json = JSON.stringify(tree)
    expect(json).toContain('2,000 steps to go')
    expect(json).toContain('Goal: ')
    expect(json).toContain('5,000')
  })

  it('handles zero steps', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' })
    const tree = renderer.create(<DailySteps steps={0} />).toJSON()

    const json = JSON.stringify(tree)
    expect(json).toContain('0')
    expect(json).toContain('10,000 steps to go')
  })

  it('has the testID for querying', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' })
    const tree = renderer.create(<DailySteps steps={1000} />).toJSON()

    expect(tree).toHaveProperty('props.testID', 'daily-steps-card')
  })
})

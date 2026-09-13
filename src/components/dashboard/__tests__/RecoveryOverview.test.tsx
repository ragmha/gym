import { render, screen } from '@testing-library/react-native'
import type React from 'react'
import { useWindowDimensions } from 'react-native'

import { CircularProgress } from '@/components/common/CircularProgress'
import { makeSnapshot } from '@/components/dashboard/__fixtures__/healthSnapshot'
import { RecoveryOverview } from '@/components/dashboard/RecoveryOverview'
import { Colors } from '@/constants/Colors'

jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } =
    jest.requireActual<typeof import('@/constants/Colors')>(
      '@/constants/Colors',
    )
  return { useTheme: () => Colors.light }
})

jest.mock('@/components/common/CircularProgress', () => ({
  CircularProgress: jest.fn(
    ({ children }: { children: React.ReactNode }) => children,
  ),
}))

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(),
}))

describe('RecoveryOverview', () => {
  beforeEach(() => {
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 402,
      height: 874,
      scale: 3,
      fontScale: 1,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('uses the existing recovery score and shows the supporting measurements', () => {
    render(<RecoveryOverview snapshot={makeSnapshot()} />)

    expect(screen.getByLabelText('Recovery 85%')).toBeTruthy()
    expect(screen.getByLabelText('HRV 50 ms')).toBeTruthy()
    expect(screen.getByLabelText('Resting HR 65 bpm')).toBeTruthy()
    expect(screen.getByLabelText('Steps 5,000')).toBeTruthy()
    expect(screen.getByLabelText('Active calories 300 kcal')).toBeTruthy()
    expect(screen.getByText('Ready for higher intensity.')).toBeTruthy()
    expect(jest.mocked(CircularProgress).mock.lastCall?.[0]).toMatchObject({
      value: 85,
      activeStrokeColor: Colors.light.success,
      duration: 0,
    })
  })

  it('keeps missing readings neutral instead of producing recovery or zero activity', () => {
    render(<RecoveryOverview snapshot={null} />)

    expect(screen.getByLabelText('Recovery unavailable')).toBeTruthy()
    expect(screen.getByLabelText('Steps unavailable')).toBeTruthy()
    expect(screen.getByLabelText('Active calories unavailable')).toBeTruthy()
    expect(screen.getByText('Not enough recovery data')).toBeTruthy()
    expect(screen.queryByText('0%')).toBeNull()
    expect(screen.queryByText('Prioritize recovery today.')).toBeNull()
    expect(jest.mocked(CircularProgress).mock.lastCall?.[0]).toMatchObject({
      value: 0,
      activeStrokeColor: Colors.light.disabled,
    })
  })

  it('preserves available measurements when recovery is incomplete', () => {
    render(<RecoveryOverview snapshot={makeSnapshot({ hrv: null })} />)

    expect(screen.getByLabelText('Recovery unavailable')).toBeTruthy()
    expect(screen.getByLabelText('HRV unavailable')).toBeTruthy()
    expect(screen.getByLabelText('Steps 5,000')).toBeTruthy()
  })

  it('distinguishes a genuine zero recovery score and measured zero activity', () => {
    render(
      <RecoveryOverview
        snapshot={makeSnapshot({
          hrv: 0,
          restingHeartRate: 100,
          sleepHours: 0,
          steps: 0,
          calories: 0,
        })}
      />,
    )

    expect(screen.getByLabelText('Recovery 0%')).toBeTruthy()
    expect(screen.getByLabelText('Steps 0')).toBeTruthy()
    expect(screen.getByLabelText('Active calories 0 kcal')).toBeTruthy()
    expect(jest.mocked(CircularProgress).mock.lastCall?.[0]).toMatchObject({
      value: 0,
      activeStrokeColor: Colors.light.danger,
    })
  })

  it('fits the gauge to a narrow screen with large system text', () => {
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 320,
      height: 568,
      scale: 2,
      fontScale: 2.5,
    })

    render(<RecoveryOverview snapshot={makeSnapshot()} />)

    expect(jest.mocked(CircularProgress).mock.lastCall?.[0].radius).toBe(140)
    expect(screen.getByLabelText('HRV 50 ms')).toBeTruthy()
    expect(screen.getByLabelText('Active calories 300 kcal')).toBeTruthy()
  })

  it('uses valid SVG geometry before the web viewport has been measured', () => {
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 0,
      height: 0,
      scale: 1,
      fontScale: 1,
    })

    render(<RecoveryOverview snapshot={makeSnapshot()} />)

    expect(jest.mocked(CircularProgress).mock.lastCall?.[0].radius).toBe(70)
    expect(screen.getByLabelText('Recovery 85%')).toBeTruthy()
  })
})

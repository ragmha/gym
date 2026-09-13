import {
  act,
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native'
import { Alert, Linking, Platform } from 'react-native'

import type {
  DailyHealthSnapshot,
  HealthSnapshotSource,
} from '@/lib/healthSnapshot/types'
import type { ThemePreference } from '@/stores/ThemeStore'

import SettingsScreen from '../settings'

let mockSource: jest.Mocked<HealthSnapshotSource>
const mockSetPreference = jest.fn()

jest.mock('@/lib/healthSnapshot/HealthSnapshotSource', () => ({
  get healthSnapshot() {
    return mockSource
  },
}))

jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } = jest.requireActual('@/constants/Colors')
  return { useTheme: () => Colors.light }
})

jest.mock('@/stores/ThemeStore', () => ({
  useThemeStore: (
    selector: (state: {
      preference: ThemePreference
      setPreference: typeof mockSetPreference
    }) => unknown,
  ) => selector({ preference: 'system', setPreference: mockSetPreference }),
}))

const emptySnapshot: DailyHealthSnapshot = {
  date: '2026-02-20',
  steps: null,
  calories: null,
  sleepHours: null,
  heartRate: null,
  hrv: null,
  restingHeartRate: null,
  waterLiters: null,
  flightsClimbed: null,
  bodyMassKg: null,
  dietaryCalories: null,
  workouts: [],
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

describe('SettingsScreen Health access', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-20T10:00:00.000Z'))
    jest.replaceProperty(Platform, 'OS', 'ios')
    mockSource = {
      getDailySnapshot: jest.fn(async (_date: Date) => emptySnapshot),
      getRangeIntensity: jest.fn(async (_daysBack: number) => new Map()),
      requestAuthorization: jest.fn(async () => true),
      isAvailable: jest.fn(() => true),
    }
    mockSetPreference.mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('allows access requests after an empty successful read and never claims Connected', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SettingsScreen />)
    await waitFor(() => expect(mockSource.getDailySnapshot).toHaveBeenCalled())
    const access = screen.getByRole('button', {
      name: 'Connect / Review Health access',
    })

    expect(access).toBeEnabled()
    expect(screen.queryByText(/Connected/)).toBeNull()
    await user.press(access)

    await waitFor(() =>
      expect(screen.getByText(/Access request completed/)).toBeTruthy(),
    )
    expect(mockSource.requestAuthorization).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('review-health-access')).toBeEnabled()
    expect(screen.queryByText(/Connected/)).toBeNull()
  })

  it('permits repeat requests for new scopes and explains how to change previously denied access', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SettingsScreen />)
    await user.press(screen.getByTestId('review-health-access'))
    await waitFor(() =>
      expect(screen.getByText(/Access request completed/)).toBeTruthy(),
    )
    await user.press(screen.getByTestId('review-health-access'))

    await waitFor(() =>
      expect(mockSource.requestAuthorization).toHaveBeenCalledTimes(2),
    )
    expect(screen.getByText(/To change previously denied access/)).toBeTruthy()
    expect(screen.getByText('Manage in Health app →')).toBeTruthy()
  })

  it('disables only during the access request, not during a snapshot refresh', async () => {
    const authorization = deferred<boolean>()
    const refresh = deferred<DailyHealthSnapshot>()
    mockSource.requestAuthorization.mockReturnValueOnce(authorization.promise)
    mockSource.getDailySnapshot
      .mockResolvedValueOnce(emptySnapshot)
      .mockReturnValueOnce(refresh.promise)
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SettingsScreen />)

    await user.press(screen.getByTestId('review-health-access'))
    expect(screen.getByTestId('review-health-access')).toBeDisabled()
    expect(screen.getByText('Requesting Health access…')).toBeTruthy()
    await user.press(screen.getByTestId('review-health-access'))
    expect(mockSource.requestAuthorization).toHaveBeenCalledTimes(1)

    await act(async () => {
      authorization.resolve(true)
    })
    await waitFor(() =>
      expect(mockSource.getDailySnapshot).toHaveBeenCalledTimes(2),
    )
    expect(screen.getByTestId('review-health-access')).toBeEnabled()

    await act(async () => {
      refresh.resolve(emptySnapshot)
    })
  })

  it.each(['false result', 'rejection'])(
    'shows an authorization %s and keeps the action available for retry',
    async (failure) => {
      if (failure === 'rejection') {
        mockSource.requestAuthorization.mockRejectedValueOnce(
          new Error('failed'),
        )
      } else {
        mockSource.requestAuthorization.mockResolvedValueOnce(false)
      }
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<SettingsScreen />)

      await user.press(screen.getByTestId('review-health-access'))

      await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
      expect(screen.getByText(/Unable to request Health access/)).toBeTruthy()
      expect(screen.getByTestId('review-health-access')).toBeEnabled()
      await user.press(screen.getByTestId('review-health-access'))
      await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
      expect(mockSource.requestAuthorization).toHaveBeenCalledTimes(2)
    },
  )

  it('keeps the access action available when the data read fails', async () => {
    mockSource.getDailySnapshot.mockRejectedValueOnce(new Error('read failed'))
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SettingsScreen />)

    await user.press(screen.getByTestId('review-health-access'))

    expect(mockSource.requestAuthorization).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('review-health-access')).toBeEnabled()
  })

  it.each(['ios', 'web', 'android'] as const)(
    'labels demo data honestly and hides Health controls when unavailable on %s',
    (platform) => {
      jest.replaceProperty(Platform, 'OS', platform)
      mockSource.isAvailable.mockReturnValue(false)
      render(<SettingsScreen />)

      expect(screen.getByText(/dashboard shows demo data/)).toBeTruthy()
      expect(screen.queryByTestId('review-health-access')).toBeNull()
      expect(screen.queryByText('Manage in Health app →')).toBeNull()
      expect(mockSource.requestAuthorization).not.toHaveBeenCalled()
    },
  )

  it('shows a Settings fallback when opening the Health app fails', async () => {
    jest
      .spyOn(Linking, 'openURL')
      .mockRejectedValueOnce(new Error('unavailable'))
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined)
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SettingsScreen />)

    await user.press(screen.getByText('Manage in Health app →'))

    expect(Linking.openURL).toHaveBeenCalledWith('x-apple-health://')
    expect(alert).toHaveBeenCalledWith(
      'Unable to open Health',
      'Review this app’s Health access in iOS Settings instead.',
    )
  })
})

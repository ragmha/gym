import { fireEvent, render, screen } from '@testing-library/react-native'
import { useLocalSearchParams } from 'expo-router'

import PrayerScreen from '@/app/prayer'
import {
  DEFAULT_PRAYER_SETTINGS,
  calendarDateInTimeZone,
  formatPrayerTime,
  prayerTimes,
} from '@/lib/prayer'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import { usePrayerLogStore } from '@/stores/PrayerLogStore'
import { useThemeStore } from '@/stores/ThemeStore'

jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } = jest.requireActual('@/constants/Colors')
  return { useTheme: () => Colors.light }
})

describe('PrayerScreen', () => {
  afterEach(() => jest.useRealTimers())

  beforeEach(() => {
    usePrayerLogStore.setState({ prayed: {} })
    useThemeStore.setState({ prayer: DEFAULT_PRAYER_SETTINGS })
  })

  it('shows the selected city clock and keeps the next prayer countdown', () => {
    const today = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    jest.mocked(useLocalSearchParams).mockReturnValue({
      date: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
    })
    render(<PrayerScreen />)

    expect(
      screen.getByRole('timer', { name: /Helsinki, Finland local time/ }),
    ).toBeTruthy()
    expect(screen.getByRole('image', { name: /current phase/ })).toBeTruthy()
    expect(screen.getByText('h')).toBeTruthy()
    expect(screen.getByText('min')).toBeTruthy()
    expect(screen.getByText('sec')).toBeTruthy()
    expect(
      screen.getByRole('timer', { name: /^.+ in \d+ hours \d+ minutes$/ }),
    ).toBeTruthy()
  })

  it('keeps the stacked clock switchable between 24-hour and 12-hour time', () => {
    const today = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    jest.mocked(useLocalSearchParams).mockReturnValue({
      date: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
    })
    render(<PrayerScreen />)

    fireEvent.press(screen.getByRole('radio', { name: '12H' }))

    expect(
      screen.getByRole('timer', {
        name: /Helsinki, Finland local time \d{2}:\d{2}:\d{2} (am|pm)/,
      }),
    ).toBeTruthy()
  })

  it('marks a prayer for the selected day', () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-09-12' })
    render(<PrayerScreen />)

    const sunrise = formatPrayerTime(
      prayerTimes(new Date(2026, 8, 12, 12)).sunrise,
      DEFAULT_PRAYER_SETTINGS.clock,
      DEFAULT_PRAYER_SETTINGS.location.timezone,
    )
    expect(
      screen.getByRole('image', { name: 'Prayer landscape background' }),
    ).toBeTruthy()
    expect(screen.queryByRole('image', { name: /current phase/ })).toBeNull()
    expect(
      screen.getByTestId('prayer-solar-times').props.accessibilityLabel,
    ).toBe(
      `Sunrise ${sunrise.time}; Maghrib ${
        formatPrayerTime(
          prayerTimes(new Date(2026, 8, 12, 12)).maghrib,
          DEFAULT_PRAYER_SETTINGS.clock,
          DEFAULT_PRAYER_SETTINGS.location.timezone,
        ).time
      }; Isha ${
        formatPrayerTime(
          prayerTimes(new Date(2026, 8, 12, 12)).isha,
          DEFAULT_PRAYER_SETTINGS.clock,
          DEFAULT_PRAYER_SETTINGS.location.timezone,
        ).time
      }`,
    )
    const fajr = screen.getByRole('checkbox', { name: /^Fajr, \d{2}:\d{2}$/ })
    expect(fajr.props.accessibilityState.checked).toBe(false)
    fireEvent.press(fajr)

    expect(usePrayerLogStore.getState().prayed).toEqual({
      '2026-09-12': ['fajr'],
    })
    expect(screen.getByText('1/5')).toBeTruthy()
    expect(
      screen.getByRole('checkbox', { name: /^Fajr,/ }).props.accessibilityState
        .checked,
    ).toBe(true)
  })

  it("uses the prayer location's current date when the dashboard passes today's device date", () => {
    jest.useFakeTimers({ now: new Date() })
    const now = new Date()
    const deviceDayKey = localDateKey(now)
    const timezone = ['Pacific/Kiritimati', 'Pacific/Pago_Pago'].find(
      (candidate) =>
        localDateKey(calendarDateInTimeZone(now, candidate)) !== deviceDayKey,
    )
    if (timezone === undefined) throw new Error('Expected a differing timezone')
    const location = {
      ...DEFAULT_PRAYER_SETTINGS.location,
      name: 'Prayer timezone test',
      timezone,
    }
    useThemeStore.setState({
      prayer: { ...DEFAULT_PRAYER_SETTINGS, location },
    })
    jest.mocked(useLocalSearchParams).mockReturnValue({ date: deviceDayKey })

    render(<PrayerScreen />)

    expect(
      screen.getByRole('timer', {
        name: /Prayer timezone test local time/,
      }),
    ).toBeTruthy()
  })

  it('does not mark prayers on a future day', () => {
    // Noon UTC keeps the device day and Helsinki's day the same.
    jest.useFakeTimers({ now: new Date('2026-09-12T12:00:00.000Z') })
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    jest.mocked(useLocalSearchParams).mockReturnValue({
      date: localDateKey(tomorrow),
    })
    render(<PrayerScreen />)

    fireEvent.press(screen.getByRole('checkbox', { name: /^Isha,/ }))
    expect(usePrayerLogStore.getState().prayed).toEqual({})
  })

  it("labels only today's upcoming row as next", () => {
    const isha = prayerTimes(new Date(2026, 8, 12, 12)).isha
    if (!isha) throw new Error('Isha should be computable')
    jest.mocked(useLocalSearchParams).mockReturnValue({})
    jest.useFakeTimers({ now: new Date(isha.getTime() - 60_000) })
    const { unmount } = render(<PrayerScreen />)
    expect(screen.getByText(/· next$/)).toBeTruthy()
    unmount()

    // A minute after Isha, the next prayer is tomorrow's Fajr.
    jest.setSystemTime(new Date(isha.getTime() + 60_000))
    render(<PrayerScreen />)
    expect(screen.queryByText(/· next$/)).toBeNull()
  })
})

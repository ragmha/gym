import { fireEvent, render, screen } from '@testing-library/react-native'
import { useLocalSearchParams } from 'expo-router'

import PrayerScreen from '@/app/prayer'
import { usePrayerLogStore } from '@/stores/PrayerLogStore'

jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } = jest.requireActual('@/constants/Colors')
  return { useTheme: () => Colors.light }
})

describe('PrayerScreen', () => {
  beforeEach(() => usePrayerLogStore.setState({ prayed: {} }))

  it('marks a prayer for the selected day', () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-09-12' })
    render(<PrayerScreen />)

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

  it('does not mark prayers on a future day', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const pad = (n: number) => String(n).padStart(2, '0')
    jest.mocked(useLocalSearchParams).mockReturnValue({
      date: `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`,
    })
    render(<PrayerScreen />)

    fireEvent.press(screen.getByRole('checkbox', { name: /^Isha,/ }))
    expect(usePrayerLogStore.getState().prayed).toEqual({})
  })
})

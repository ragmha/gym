import { fireEvent, render, screen } from '@testing-library/react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import InsightsScreen from '../insights'

const mockDismissTo = jest.fn()

jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } =
    jest.requireActual<typeof import('@/constants/Colors')>(
      '@/constants/Colors',
    )
  return { useTheme: () => Colors.light }
})

describe('Insights calendar', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 8, 12, 7))
    jest.clearAllMocks()
    jest.mocked(useLocalSearchParams).mockReturnValue({})
    jest.mocked(useRouter).mockReturnValue({
      ...useRouter(),
      dismissTo: mockDismissTo,
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('opens a past day on the dashboard and prevents future selection', () => {
    render(<InsightsScreen />)

    expect(screen.getByRole('header', { name: 'Insights' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next week' })).toBeDisabled()
    const futureDay = screen.getByRole('button', {
      name: 'Sunday, September 13, 2026',
    })
    expect(futureDay).toBeDisabled()
    fireEvent.press(futureDay)
    expect(mockDismissTo).not.toHaveBeenCalled()

    fireEvent.press(
      screen.getByRole('button', { name: 'Friday, September 11, 2026' }),
    )
    expect(mockDismissTo).toHaveBeenCalledWith({
      pathname: '/',
      params: { date: '2026-09-11' },
    })
  })

  it('browses weeks without changing the dashboard and can reach today before noon', () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-09-05' })
    render(<InsightsScreen />)

    expect(
      screen.getByRole('button', { name: 'Saturday, September 5, 2026' }),
    ).toBeSelected()
    fireEvent.press(screen.getByRole('button', { name: 'Previous week' }))
    expect(
      screen.getByRole('button', { name: 'Saturday, August 29, 2026' }),
    ).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'Next week' }))
    fireEvent.press(screen.getByRole('button', { name: 'Next week' }))
    expect(mockDismissTo).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Next week' })).toBeDisabled()

    fireEvent.press(
      screen.getByRole('button', { name: 'Saturday, September 12, 2026' }),
    )
    expect(mockDismissTo).toHaveBeenCalledWith({
      pathname: '/',
      params: { date: '2026-09-12' },
    })
  })

  it('returns directly to today from an older week', () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2025-12-31' })
    render(<InsightsScreen />)
    fireEvent.press(screen.getByRole('button', { name: 'View today' }))

    expect(mockDismissTo).toHaveBeenCalledWith({
      pathname: '/',
      params: { date: '2026-09-12' },
    })
  })

  it('preserves the original date when closing without selecting a day', () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-09-11' })
    render(<InsightsScreen />)
    fireEvent.press(screen.getByRole('button', { name: 'Previous week' }))
    fireEvent.press(screen.getByRole('button', { name: 'Back to dashboard' }))

    expect(mockDismissTo).toHaveBeenCalledWith({
      pathname: '/',
      params: { date: '2026-09-11' },
    })
  })

  it.each([
    { date: 'not-a-date' },
    { date: '2026-02-30' },
    { date: ['2026-09-11', '2026-09-10'] },
  ])('rejects an invalid or ambiguous date: $date', ({ date }) => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ date })
    render(<InsightsScreen />)

    expect(screen.getByRole('alert')).toHaveTextContent(/Invalid date/)
    expect(screen.queryByRole('button', { name: 'Previous week' })).toBeNull()
    expect(mockDismissTo).not.toHaveBeenCalled()
  })
})

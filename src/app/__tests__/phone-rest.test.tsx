import { render, screen } from '@testing-library/react-native'
import { useLocalSearchParams } from 'expo-router'

import PhoneRestPanel from '@/components/phoneRest/PhoneRestPanel'
import type { PhoneRestPanelProps } from '@/components/phoneRest/PhoneRestPanel.types'
import PhoneRestScreen from '@/app/phone-rest'

jest.mock('@/components/phoneRest/PhoneRestPanel', () => ({
  __esModule: true,
  default: jest.fn((_props: PhoneRestPanelProps) => null),
}))

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: () => 'dark',
}))

jest.mock('@/hooks/useThemeColor', () => ({
  useTheme: () =>
    jest.requireActual<typeof import('@/constants/Colors')>(
      '@/constants/Colors',
    ).Colors.dark,
}))

describe('PhoneRestScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 8, 14, 10))
  })

  afterEach(() => jest.useRealTimers())

  it('passes the selected local day and theme as the only report inputs', () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-09-13' })
    render(<PhoneRestScreen />)

    expect(jest.mocked(PhoneRestPanel).mock.lastCall?.[0]).toEqual({
      dateKey: '2026-09-13',
      colorScheme: 'dark',
    })
  })

  it('uses today when opened from Settings without a date', () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({})
    render(<PhoneRestScreen />)

    expect(jest.mocked(PhoneRestPanel).mock.lastCall?.[0].dateKey).toBe(
      '2026-09-14',
    )
  })

  it.each(['2026-02-30', 'bad-date', ['2026-09-13', '2026-09-14']])(
    'rejects invalid route input %j rather than showing another day',
    (date) => {
      jest.mocked(useLocalSearchParams).mockReturnValue({ date })
      render(<PhoneRestScreen />)

      expect(screen.getByRole('alert')).toHaveTextContent(/Invalid date/)
      expect(PhoneRestPanel).not.toHaveBeenCalled()
    },
  )
})

import { render, screen } from '@testing-library/react-native'
import { requireNativeView } from 'expo'

import PhoneRestPanel from '@/components/phoneRest/PhoneRestPanel.ios'

jest.mock('expo', () => ({
  requireOptionalNativeModule: jest.fn(() => null),
  requireNativeView: jest.fn(),
}))

jest.mock('@/hooks/useThemeColor', () => ({
  useTheme: () =>
    jest.requireActual<typeof import('@/constants/Colors')>(
      '@/constants/Colors',
    ).Colors.light,
}))

it('explains an older binary instead of crashing or pretending Screen Time is available', () => {
  render(<PhoneRestPanel dateKey="2026-09-13" colorScheme="light" />)

  expect(
    screen.getByText(/A JavaScript update cannot add the native capability/),
  ).toBeTruthy()
  expect(requireNativeView).not.toHaveBeenCalled()
})

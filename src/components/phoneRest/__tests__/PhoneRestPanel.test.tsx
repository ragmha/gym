import { render, screen } from '@testing-library/react-native'

import { PhoneRestUnavailable } from '@/components/phoneRest/PhoneRestUnavailable'

jest.mock('@/hooks/useThemeColor', () => ({
  useTheme: () =>
    jest.requireActual<typeof import('@/constants/Colors')>(
      '@/constants/Colors',
    ).Colors.light,
}))

describe('PhoneRestPanel fallback', () => {
  it('shows no simulated estimate on unsupported platforms', () => {
    render(
      <PhoneRestUnavailable message="Phone rest requires a physical iPhone with Screen Time access." />,
    )

    expect(
      screen.getByText(
        'Phone rest requires a physical iPhone with Screen Time access.',
      ),
    ).toBeTruthy()
    expect(screen.getByText(/No estimate is substituted/)).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Enable Phone rest' }),
    ).toBeNull()
    expect(screen.queryByText(/About \d/)).toBeNull()
  })
})

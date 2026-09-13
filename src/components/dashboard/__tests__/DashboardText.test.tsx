import { render, screen } from '@testing-library/react-native'
import { StyleSheet, useWindowDimensions } from 'react-native'

import { DashboardText } from '@/components/dashboard/DashboardText'
import { Typography } from '@/constants/DesignSystem'

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(),
}))

describe('DashboardText', () => {
  it.each([0.8, 1, 2.5])(
    'keeps glyphs and line boxes at the requested %s font scale',
    (fontScale) => {
      jest.mocked(useWindowDimensions).mockReturnValue({
        width: 402,
        height: 874,
        scale: 3,
        fontScale,
      })

      render(
        <DashboardText style={Typography.labelLg}>
          More health data
        </DashboardText>,
      )
      const text = screen.getByText('More health data')
      const style = StyleSheet.flatten(text.props.style)

      expect(style.fontSize).toBe(Typography.labelLg.fontSize * fontScale)
      expect(style.lineHeight).toBe(Typography.labelLg.lineHeight * fontScale)
      expect(text.props.allowFontScaling).toBe(false)
    },
  )

  it('remeasures text when the system font scale changes while the screen is open', () => {
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 402,
      height: 874,
      scale: 3,
      fontScale: 1,
    })
    const { rerender } = render(
      <DashboardText style={Typography.headingXs}>Sleep</DashboardText>,
    )
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 402,
      height: 874,
      scale: 3,
      fontScale: 2.5,
    })
    rerender(<DashboardText style={Typography.headingXs}>Sleep</DashboardText>)

    const style = StyleSheet.flatten(screen.getByText('Sleep').props.style)
    expect(style.fontSize).toBe(35)
    expect(style.lineHeight).toBe(45)
  })
})

import { fireEvent, render, screen } from '@testing-library/react-native'

import { StepsOverview } from '@/components/dashboard/StepsOverview'
import { makeSnapshot } from '@/components/dashboard/__fixtures__/healthSnapshot'

jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } =
    jest.requireActual<typeof import('@/constants/Colors')>(
      '@/constants/Colors',
    )
  return { useTheme: () => Colors.light }
})

describe('StepsOverview', () => {
  it('leads with the measured step count and opens its details', () => {
    const onPress = jest.fn()
    render(<StepsOverview snapshot={makeSnapshot()} onPress={onPress} />)

    fireEvent.press(screen.getByRole('button', { name: 'Steps 5,000' }))

    expect(onPress).toHaveBeenCalledTimes(1)
    expect(screen.getByText('5,000')).toBeTruthy()
    expect(screen.getByText('/ 20,000 steps')).toBeTruthy()
    expect(screen.getByText('15,000 steps to go')).toBeTruthy()
    expect(screen.queryByText(/recovery|intensity/i)).toBeNull()
  })

  it('does not turn missing steps into a zero or progress score', () => {
    render(<StepsOverview snapshot={null} onPress={jest.fn()} />)

    expect(screen.getByLabelText('Steps unavailable')).toBeTruthy()
    expect(screen.getByText('--')).toBeTruthy()
    expect(screen.queryByText('0')).toBeNull()
    expect(screen.queryByText('0%')).toBeNull()
  })

  it('preserves measured zero steps', () => {
    render(
      <StepsOverview
        snapshot={makeSnapshot({ steps: 0 })}
        onPress={jest.fn()}
      />,
    )

    expect(screen.getByLabelText('Steps 0')).toBeTruthy()
    expect(screen.getByText('20,000 steps to go')).toBeTruthy()
  })

  it.each([19_999, 20_000, 20_001])(
    'requires exactly 20,000 steps for completion, actual count %s',
    (steps) => {
      render(
        <StepsOverview
          snapshot={makeSnapshot({ steps })}
          onPress={jest.fn()}
        />,
      )
      expect(screen.queryByText('Daily goal met') !== null).toBe(
        steps >= 20_000,
      )
      expect(screen.getByRole('button').props.accessibilityValue).toEqual({
        min: 0,
        max: 20_000,
        now: Math.min(steps, 20_000),
        text: `${steps.toLocaleString()} of 20,000 steps`,
      })
    },
  )

  it('keeps the full count accessible when visual text needs to fit', () => {
    render(
      <StepsOverview
        snapshot={makeSnapshot({ steps: 125_000 })}
        onPress={jest.fn()}
      />,
    )

    expect(screen.getByLabelText('Steps 125,000')).toBeTruthy()
    expect(screen.getByText('125,000').props.adjustsFontSizeToFit).toBe(true)
    expect(screen.getByText('125,000').props.selectable).toBe(true)
  })
})

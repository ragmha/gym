import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native'
import { StyleSheet, useWindowDimensions } from 'react-native'

import { ActivityHeatmap } from '@/components/charts/ActivityHeatmap'
import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } =
    jest.requireActual<typeof import('@/constants/Colors')>(
      '@/constants/Colors',
    )
  return { useTheme: () => Colors.light }
})

jest.mock('@/lib/healthSnapshot/HealthSnapshotSource', () => ({
  healthSnapshot: { getRangeIntensity: jest.fn(async () => new Map()) },
}))

describe('ActivityHeatmap sizing', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 8, 21, 12))
    jest.mocked(healthSnapshot.getRangeIntensity).mockReset()
    jest.mocked(healthSnapshot.getRangeIntensity).mockResolvedValue(new Map())
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 390,
      height: 844,
      scale: 3,
      fontScale: 1,
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('never announces a workout-only intensity score as measured steps', async () => {
    jest
      .mocked(healthSnapshot.getRangeIntensity)
      .mockResolvedValue(new Map([['2026-09-20', 5_000]]))
    render(<ActivityHeatmap />)

    await waitFor(() =>
      expect(
        screen.getByLabelText(
          'September 20, 2026: Relative activity level 2 of 4',
        ),
      ).toBeTruthy(),
    )
    expect(
      screen.getByText('Relative activity over the last 15 weeks'),
    ).toBeTruthy()
    expect(
      screen.getByText('Based on available step and workout readings.'),
    ).toBeTruthy()
    expect(screen.queryByLabelText(/5,000 steps/)).toBeNull()
    expect(screen.queryByText('Steps over the last 15 weeks')).toBeNull()
  })

  it('distinguishes a recorded zero activity score from missing activity', async () => {
    jest
      .mocked(healthSnapshot.getRangeIntensity)
      .mockResolvedValue(new Map([['2026-09-20', 0]]))
    render(<ActivityHeatmap />)

    await waitFor(() =>
      expect(
        screen.getByLabelText(
          'September 20, 2026: Relative activity level 0 of 4',
        ),
      ).toBeTruthy(),
    )
    expect(
      screen.getByLabelText(
        'September 21, 2026: No activity reading available',
      ),
    ).toBeTruthy()
  })

  it('can omit prose notes without hiding the relative-activity label or readings', async () => {
    jest
      .mocked(healthSnapshot.getRangeIntensity)
      .mockResolvedValue(new Map([['2026-09-20', 5_000]]))
    render(<ActivityHeatmap showNotes={false} />)

    await waitFor(() =>
      expect(
        screen.getByLabelText(
          'September 20, 2026: Relative activity level 2 of 4',
        ),
      ).toBeTruthy(),
    )
    expect(
      screen.getByText('Relative activity over the last 15 weeks'),
    ).toBeTruthy()
    expect(
      screen.queryByText('Based on available step and workout readings.'),
    ).toBeNull()
    expect(
      screen.queryByText('Blank squares include days with no reading.'),
    ).toBeNull()
  })

  it.each([256, 310, 348, 350])(
    'fits every week inside the actual %s-point container, including its padding',
    async (width) => {
      render(<ActivityHeatmap />)
      await act(async () => {
        fireEvent(screen.getByTestId('activity-heatmap'), 'layout', {
          nativeEvent: { layout: { width, height: 200, x: 0, y: 0 } },
        })
      })

      const cells = screen
        .getByTestId('activity-heatmap-row-0')
        .children.filter((child) => typeof child !== 'string')
      expect(cells).toHaveLength(15)
      const cellWidth = StyleSheet.flatten(cells[0].props.style).width
      expect(cellWidth).toBe(Math.floor((width - 32 - 28 - 14 * 3) / 15))
      expect(15 * cellWidth + 14 * 3 + 28 + 32).toBeLessThanOrEqual(width)
    },
  )

  it('keeps large-text labels readable in a horizontally scrollable grid', async () => {
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 320,
      height: 568,
      scale: 2,
      fontScale: 2.5,
    })
    render(<ActivityHeatmap />)
    await act(async () => {
      fireEvent(screen.getByTestId('activity-heatmap'), 'layout', {
        nativeEvent: { layout: { width: 280, height: 200, x: 0, y: 0 } },
      })
    })

    const scroll = screen.getByTestId('activity-heatmap-scroll')
    expect(scroll.props.horizontal).toBe(true)
    expect(scroll.props.showsHorizontalScrollIndicator).toBe(true)
    const cells = screen
      .getByTestId('activity-heatmap-row-0')
      .children.filter((child) => typeof child !== 'string')
    expect(cells).toHaveLength(15)
    expect(
      StyleSheet.flatten(cells[0].props.style).width,
    ).toBeGreaterThanOrEqual(11 * 2.5)
    expect(
      screen.getByText('Blank squares include days with no reading.'),
    ).toBeTruthy()
  })
})

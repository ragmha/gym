import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native'
import { useRouter } from 'expo-router'
import { createRef } from 'react'
import {
  AccessibilityInfo,
  Alert,
  Linking,
  processColor,
  StyleSheet,
  Text,
  useWindowDimensions,
} from 'react-native'
import { State } from 'react-native-gesture-handler'
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils'
import {
  GoalGrid,
  GoalSummary,
  type GoalGridHandle,
} from '@/components/dashboard/GoalGrid'
import { makeSnapshot } from '@/components/dashboard/__fixtures__/healthSnapshot'
import { Colors } from '@/constants/Colors'
import { useTheme } from '@/hooks/useThemeColor'
import type { HealthWorkout } from '@/lib/healthSnapshot/types'
import { useGymLogStore } from '@/stores/GymLogStore'
import { useThemeStore } from '@/stores/ThemeStore'

jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } =
    jest.requireActual<typeof import('@/constants/Colors')>(
      '@/constants/Colors',
    )
  return { useTheme: jest.fn(() => Colors.light) }
})
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const date = new Date(2026, 8, 12, 12)

const workout = (
  kind: HealthWorkout['kind'],
  durationMinutes: number,
): HealthWorkout => ({
  kind,
  activityName: kind,
  durationMinutes,
  averageHeartRate: null,
  calories: null,
  distance: null,
  startISO: new Date(2026, 8, 12, 8).toISOString(),
  endISO: new Date(2026, 8, 12, 9).toISOString(),
})

const goalState = (label: RegExp) =>
  screen.getByRole('button', { name: label }).props.accessibilityValue.text

const fill = (id: string) =>
  StyleSheet.flatten(
    screen.getByTestId(`goal-fill-${id}`, {
      includeHiddenElements: true,
    }).props.style,
  )

describe('GoalGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useTheme).mockReturnValue(Colors.light)
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 402,
      height: 874,
      scale: 3,
      fontScale: 1,
    })
    useThemeStore.setState({ tileOrder: [] })
  })

  it.each([
    { snapshot: null, done: 0 },
    { snapshot: makeSnapshot({ steps: 0 }), done: 0 },
    { snapshot: makeSnapshot({ steps: 20_000 }), done: 1 },
    {
      snapshot: makeSnapshot({
        steps: 0,
        workouts: [workout('running', 30), workout('strength', 45)],
      }),
      done: 1,
    },
    {
      snapshot: makeSnapshot({
        steps: 20_000,
        workouts: [workout('running', 30), workout('strength', 45)],
      }),
      done: 2,
    },
  ])(
    'summarizes the selected day with $done completed goals',
    ({ snapshot, done }) => {
      render(
        <GoalSummary
          snapshot={snapshot}
          date={date}
          refreshing={false}
          onRefresh={jest.fn()}
          onSettingsPress={jest.fn()}
        />,
      )

      expect(
        screen.getByRole('header', {
          name: 'Saturday, September 12, 2026',
        }),
      ).toBeTruthy()
      expect(screen.getAllByText('Sat 12')).toHaveLength(1)
      expect(screen.queryByText(`${done}/2`)).toBeNull()
      expect(
        screen.getByRole('button', {
          name: `Refresh health data, ${done} of 2 goals met`,
        }),
      ).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy()
    },
  )

  it('keeps Today and the five icons on two pages across tall and short layouts', () => {
    const push = jest.fn()
    const onPageChange = jest.fn()
    const grid = createRef<GoalGridHandle>()
    jest.mocked(useRouter).mockReturnValue({ ...useRouter(), push })
    render(
      <GoalGrid
        ref={grid}
        snapshot={makeSnapshot()}
        date={date}
        onPageChange={onPageChange}
        leadingPage={() => <Text>Today</Text>}
      />,
    )
    fireEvent(screen.getByTestId('goal-viewport'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 402, height: 900 } },
    })

    expect(screen.queryByTestId('goal-page-2')).toBeNull()
    const surface = StyleSheet.flatten(
      screen.getByTestId('goal-surface-reading', {
        includeHiddenElements: true,
      }).props.style,
    )
    expect(surface.width).toBe(surface.height)
    expect(surface.height).toBeGreaterThanOrEqual(44)
    expect(surface.height).toBeLessThanOrEqual(138)
    expect(
      screen.queryByRole('button', { name: 'Speaking practice' }),
    ).toBeNull()
    fireEvent.scroll(screen.getByTestId('goal-pages'), {
      nativeEvent: {
        contentOffset: { x: 402, y: 0 },
        contentSize: { width: 804, height: 900 },
        layoutMeasurement: { width: 402, height: 900 },
      },
    })
    expect(onPageChange).toHaveBeenLastCalledWith({ index: 1, count: 2 })
    expect(screen.queryByText('Today')).toBeNull()
    expect(
      within(screen.getByTestId('goal-page-1')).getAllByTestId(/^goal-tile-/),
    ).toHaveLength(5)
    fireEvent.press(screen.getByRole('button', { name: 'Speaking practice' }))
    expect(push).toHaveBeenCalledWith({
      pathname: '/speaking',
      params: { date: '2026-09-12' },
    })
    act(() => grid.current?.showPage(0))
    expect(onPageChange).toHaveBeenLastCalledWith({ index: 0, count: 2 })
    expect(screen.getByText('Today')).toBeTruthy()

    fireEvent(screen.getByTestId('goal-viewport'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 402, height: 210 } },
    })
    expect(onPageChange).toHaveBeenLastCalledWith({ index: 0, count: 2 })
    expect(
      screen.queryByTestId('goal-page-2', { includeHiddenElements: true }),
    ).toBeNull()
  })

  it('pages one row at a time when large text leaves room for only one row', () => {
    const onPageChange = jest.fn()
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 402,
      height: 874,
      scale: 3,
      fontScale: 3,
    })
    render(
      <GoalGrid
        snapshot={makeSnapshot()}
        date={date}
        onPageChange={onPageChange}
        leadingPage={() => <Text>Today</Text>}
      />,
    )
    fireEvent(screen.getByTestId('goal-viewport'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 402, height: 210 } },
    })

    expect(onPageChange).toHaveBeenLastCalledWith({ index: 0, count: 3 })
    const tilesOn = (page: number) =>
      within(
        screen.getByTestId(`goal-page-${page}`, {
          includeHiddenElements: true,
        }),
      ).getAllByTestId(/^goal-tile-/, { includeHiddenElements: true })
    expect(tilesOn(1)).toHaveLength(4)
    expect(tilesOn(2)).toHaveLength(1)
  })

  it('ignores removed tiles in saved ordering without changing preferences', () => {
    const tileOrder = [
      'Journal',
      'Speaking',
      'Achievements',
      'Reading',
      'Deep Work',
      'Gym',
      'Inbox Zero',
      'Praying',
      'Water',
      'Steps',
    ]
    useThemeStore.setState({ tileOrder })
    render(<GoalGrid snapshot={makeSnapshot()} date={date} />)

    expect(
      screen
        .getAllByTestId(/^goal-tile-/, { includeHiddenElements: true })
        .map((tile) => tile.props.testID),
    ).toEqual([
      'goal-tile-speaking',
      'goal-tile-reading',
      'goal-tile-gym',
      'goal-tile-praying',
      'goal-tile-steps',
    ])
    expect(useThemeStore.getState().tileOrder).toEqual(tileOrder)
  })

  it.each(['light', 'dark'] as const)(
    'renders all goal tiles as circular pixel icons in the %s theme',
    (theme) => {
      jest.mocked(useTheme).mockReturnValue(Colors[theme])
      render(
        <GoalGrid
          snapshot={makeSnapshot({
            steps: 20_000,
            workouts: [workout('running', 30), workout('strength', 45)],
          })}
          date={date}
        />,
      )

      for (const [label, kind, role] of [
        ['Steps', 'steps', 'button'],
        ['Gym', 'lift', 'button'],
        ['Reading', 'reading', 'link'],
        ['Praying', 'praying', 'link'],
        ['Speaking', 'speaking', 'button'],
      ] as const) {
        const tile = screen.getByRole(role, {
          name: new RegExp(`^${label}[ ,]`),
        })
        const mascotID = new RegExp(`^goal-mascot-${kind}-`)
        const drawing = within(tile).getByTestId(mascotID, {
          includeHiddenElements: true,
        })
        expect(drawing.props).toMatchObject({
          'aria-hidden': true,
          accessibilityElementsHidden: true,
          importantForAccessibility: 'no-hide-descendants',
        })
        expect(StyleSheet.flatten(drawing.props.style).pointerEvents).toBe(
          'none',
        )
        expect(within(tile).queryByTestId(mascotID)).toBeNull()
        const shapes = drawing.findAll(
          (node) =>
            typeof node.type === 'function' &&
            'displayName' in node.type &&
            (node.type.displayName === 'Path' ||
              node.type.displayName === 'Rect'),
        )
        const paint = shapes
          .flatMap((shape) => [shape.props.fill, shape.props.stroke])
          .filter((color) => typeof color === 'string' && color !== 'none')
        const complete =
          tile.props.accessibilityValue.text.startsWith('Goal met')
        expect(new Set(paint)).toEqual(
          new Set([
            complete ? Colors[theme].goalOnComplete : Colors[theme].goalIcon,
          ]),
        )
        const outline = screen.getByTestId(
          `goal-outline-${label.toLowerCase()}`,
          { includeHiddenElements: true },
        )
        expect(outline.props.stroke).toEqual({
          type: 0,
          payload: processColor(
            complete ? Colors[theme].goalComplete : Colors[theme].goalTrack,
          ),
        })
        expect(outline.props).toMatchObject({
          cx: 50,
          cy: 50,
          r: 47,
          strokeWidth: 2,
        })
        expect(
          StyleSheet.flatten(
            screen.getByTestId(`goal-surface-${label.toLowerCase()}`, {
              includeHiddenElements: true,
            }).props.style,
          ).borderRadius,
        ).toBe('50%')
        expect(
          shapes.some(
            (shape) =>
              typeof shape.type === 'function' &&
              'displayName' in shape.type &&
              shape.type.displayName === 'Rect',
          ),
        ).toBe(true)
      }
      expect(
        within(screen.getByTestId('goal-tile-steps')).queryByText('20,000'),
      ).toBeNull()
      expect(
        within(screen.getByTestId('goal-tile-gym')).queryByText(/goals|\/3/i),
      ).toBeNull()
      expect(screen.getAllByRole('button')).toHaveLength(3)
      expect(screen.getAllByRole('link')).toHaveLength(2)
    },
  )

  it.each([
    [0, 0],
    [19_999, 99],
    [20_000, 100],
    [35_000, 100],
  ] as const)(
    'shows measured step progress on its icon, actual %s',
    (steps, percent) => {
      render(<GoalGrid snapshot={makeSnapshot({ steps })} date={date} />)
      expect(goalState(/^Steps/)).toBe(
        `${steps >= 20_000 ? 'Goal met' : 'Goal not met'} (${percent}%)`,
      )
      expect(fill('steps').height).toBe(
        `${Math.min((steps / 20_000) * 100, 100)}%`,
      )
      expect(screen.queryAllByText(/^\d+%$/)).toHaveLength(0)
    },
  )

  it.each([
    [29 + 59 / 60, 99],
    [30, 100],
    [60, 100],
  ] as const)(
    'shows actual Gym progress on its icon, duration %s',
    (minutes, percent) => {
      render(
        <GoalGrid
          snapshot={makeSnapshot({
            workouts: [workout('running', minutes), workout('strength', 45)],
          })}
          date={date}
        />,
      )
      expect(goalState(/^Gym,/)).toBe(
        `${minutes >= 30 ? 'Goal met' : 'Goal not met'} (${percent}%)`,
      )
      expect(
        screen.getByLabelText(
          new RegExp(`^Gym,.*Cardio, Run ${Math.floor(minutes)} min`),
        ),
      ).toBeTruthy()
      expect(fill('gym').height).toBeTruthy()
    },
  )

  it('shows stairs but never infers Zone 2 time from them', () => {
    render(
      <GoalGrid
        snapshot={makeSnapshot({
          bodyMassHistory: null,
          workouts: [{ ...workout('stairClimber', 45), averageHeartRate: 150 }],
        })}
        date={date}
      />,
    )
    expect(screen.getByLabelText(/^Gym,.*Cardio, Stairs 45 min/)).toBeTruthy()
    expect(goalState(/^Gym,/)).toBe('Goal not met (0%)')
    expect(fill('gym').height).toBe('0%')
  })

  it('groups lift and morning weight without completing Gym', () => {
    render(
      <GoalGrid
        snapshot={makeSnapshot({
          steps: 0,
          workouts: [workout('strength', 60)],
        })}
        date={date}
      />,
    )
    expect(goalState(/^Gym,/)).toBe('Goal not met (66%)')
    expect(screen.getByLabelText(/^Gym,.*Cardio,.*Lift,.*Weight,/)).toBeTruthy()
    expect(fill('gym').height).toBeTruthy()
  })

  it('shows unknown states instead of invented zero readings', () => {
    render(<GoalGrid snapshot={null} date={date} />)
    expect(screen.getByLabelText('Steps unavailable')).toBeTruthy()
    expect(screen.queryByText(/^0( |$)|0\.0/)).toBeNull()
    expect(
      screen.getAllByTestId(/^goal-mascot-.*-neutral$/, {
        includeHiddenElements: true,
      }),
    ).toHaveLength(5)
    for (const name of ['Reading', 'Praying']) {
      expect(
        screen.getByRole('link', { name: new RegExp(`^${name},`) }).props
          .accessibilityValue.text,
      ).toBe('Not tracked')
    }
    expect(screen.queryAllByText(/^\d+%$/)).toHaveLength(0)
    expect(
      screen.queryAllByTestId(/^goal-fill-/, { includeHiddenElements: true }),
    ).toHaveLength(0)
    expect(goalState(/^Steps/)).toBe('Goal progress unavailable')
    expect(goalState(/^Gym,/)).toBe('Goal progress unavailable')
  })

  it.each([
    [0, false, false, 0],
    [15, false, false, 1 / 6],
    [30, false, false, 1 / 3],
    [0, true, false, 1 / 3],
    [0, false, true, 1 / 3],
    [15, true, true, 5 / 6],
    [30, true, true, 1],
    [60, false, false, 1 / 3],
  ] as const)(
    'weights Gym goals equally: run %s minutes, lift %s, morning weight %s',
    (minutes, hasLift, hasWeight, progress) => {
      render(
        <GoalGrid
          date={date}
          snapshot={makeSnapshot({
            steps: 20_000,
            bodyMassHistory: hasWeight ? makeSnapshot().bodyMassHistory : null,
            workouts: [
              workout('running', minutes),
              ...(hasLift ? [workout('strength', 45)] : []),
            ],
          })}
        />,
      )

      expect(goalState(/^Gym,/)).toBe(
        `${progress === 1 ? 'Goal met' : 'Goal not met'} (${Math.floor(progress * 100)}%)`,
      )
      for (const formerTile of ['cardio', 'lift', 'weight']) {
        expect(screen.queryByTestId(`goal-tile-${formerTile}`)).toBeNull()
      }
    },
  )

  it('counts a finished programme log as the lift goal for that day only', () => {
    useGymLogStore.setState({
      logs: {
        '2026-09-12': {
          day: '1',
          sets: { 'exercise-1': [{ reps: 15, kilograms: 40 }] },
          finishedAt: '2026-09-12T16:06:00.000Z',
          rating: 7,
        },
      },
    })
    try {
      render(<GoalGrid date={date} snapshot={makeSnapshot({ workouts: [] })} />)
      expect(
        screen.getByLabelText(/^Gym,.*Lift, programme workout finished/),
      ).toBeTruthy()
      expect(goalState(/^Gym,/)).toBe('Goal not met (66%)')
    } finally {
      screen.unmount()
      useGymLogStore.setState({ logs: {} })
    }
  })

  it('never completes Gym from an afternoon or stale weigh-in', () => {
    render(
      <GoalGrid
        date={date}
        snapshot={makeSnapshot({
          bodyMassKg: 78.4,
          bodyMassHistory: [
            {
              kilograms: 78.4,
              startISO: new Date(2026, 8, 11, 7).toISOString(),
            },
            {
              kilograms: 78.4,
              startISO: new Date(2026, 8, 12, 15).toISOString(),
            },
          ],
          workouts: [workout('running', 30), workout('strength', 45)],
        })}
      />,
    )
    expect(goalState(/^Gym,/)).toBe('Goal not met (66%)')
    expect(
      screen.getByLabelText(/^Gym,.*Weight, no morning weigh-in/),
    ).toBeTruthy()
  })

  it('reverses completed styling when the selected day has less or missing data', () => {
    const { rerender } = render(
      <GoalGrid snapshot={makeSnapshot({ steps: 20_000 })} date={date} />,
    )
    expect(fill('steps').backgroundColor).toBe(Colors.light.goalComplete)

    const previousDay = new Date(2026, 8, 11, 12)
    rerender(
      <GoalGrid
        snapshot={makeSnapshot({ date: '2026-09-11', steps: 10_000 })}
        date={previousDay}
      />,
    )
    expect(fill('steps').backgroundColor).toBe(Colors.light.goalFill)
    expect(goalState(/^Steps/)).toBe('Goal not met (50%)')

    rerender(<GoalGrid snapshot={null} date={previousDay} />)
    expect(
      screen.queryByTestId('goal-fill-steps', { includeHiddenElements: true }),
    ).toBeNull()
    expect(goalState(/^Steps/)).toBe('Goal progress unavailable')
  })

  it('keeps untracked activities unfilled without inventing timers or goals', () => {
    render(<GoalGrid snapshot={makeSnapshot()} date={date} />)

    for (const kind of ['reading', 'praying', 'speaking']) {
      expect(
        screen.queryByTestId(`goal-fill-${kind}`, {
          includeHiddenElements: true,
        }),
      ).toBeNull()
      expect(
        screen.getByTestId(`goal-outline-${kind}`, {
          includeHiddenElements: true,
        }).props.stroke,
      ).toEqual({ type: 0, payload: processColor(Colors.light.goalTrack) })
    }
    expect(
      screen.queryByRole('button', { name: /play|pause|timer/i }),
    ).toBeNull()
  })

  it.each([
    [/^Steps 5,000$/, '/steps'],
    [/^Gym,/, '/gym'],
  ])('opens %s on the selected day', (name, pathname) => {
    const push = jest.fn()
    jest.mocked(useRouter).mockReturnValue({ ...useRouter(), push })
    render(<GoalGrid snapshot={makeSnapshot()} date={date} />)
    fireEvent.press(screen.getByRole('button', { name }))
    expect(push).toHaveBeenCalledWith({
      pathname,
      params: { date: '2026-09-12' },
    })
  })

  it.each([
    ['Reading, opens Apple Books', 'ibooks://'],
    [
      'Praying, opens Athan prayer times',
      'https://ragmha.github.io/athan-pwa/',
    ],
  ])('opens %s without tracking it as a goal', async (name, url) => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
    const push = jest.fn()
    jest.mocked(useRouter).mockReturnValue({ ...useRouter(), push })
    render(<GoalGrid snapshot={makeSnapshot()} date={date} />)

    const tile = screen.getByRole('link', { name })
    expect(tile.props.accessibilityValue.text).toBe('Not tracked')
    fireEvent.press(tile)
    await Promise.resolve()

    expect(openURL).toHaveBeenCalledWith(url)
    expect(push).not.toHaveBeenCalled()
    openURL.mockRestore()
  })

  it('explains failed app launches without silently ignoring the tap', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    const openURL = jest
      .spyOn(Linking, 'openURL')
      .mockRejectedValue(new Error('app missing'))
    render(<GoalGrid snapshot={makeSnapshot()} date={date} />)

    fireEvent.press(
      screen.getByRole('link', { name: 'Reading, opens Apple Books' }),
    )
    await Promise.resolve()

    expect(alert).toHaveBeenCalledWith(
      "Couldn't open Apple Books",
      'Check that the app is installed or the link is available, then try again.',
    )
    alert.mockRestore()
    openURL.mockRestore()
  })

  it('starts a Dynamic Island reading timer as it opens Apple Books', async () => {
    const reading = {
      running: false,
      last: null,
      start: jest.fn(),
      stop: jest.fn(),
    }
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
    render(<GoalGrid snapshot={makeSnapshot()} date={date} reading={reading} />)

    const tile = screen.getByRole('link', {
      name: 'Reading, starts a reading timer and opens Apple Books',
    })
    expect(tile.props.accessibilityHint).toBe(
      'Shows the timer in the Dynamic Island. Reading minutes are not saved.',
    )
    expect(
      screen.getByTestId('goal-badge-reading-play', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy()
    fireEvent.press(tile)
    await Promise.resolve()

    expect(reading.start).toHaveBeenCalledTimes(1)
    expect(openURL).toHaveBeenCalledWith('ibooks://')
    openURL.mockRestore()
  })

  it('stops a running reading timer without reopening Apple Books', () => {
    const reading = {
      running: true,
      last: null,
      start: jest.fn(),
      stop: jest.fn(),
    }
    const openURL = jest.spyOn(Linking, 'openURL')
    render(<GoalGrid snapshot={makeSnapshot()} date={date} reading={reading} />)

    const tile = screen.getByRole('button', {
      name: 'Reading, stops the reading timer',
    })
    expect(tile.props.accessibilityValue.text).toBe('Timer running')
    expect(screen.getByText('Tap to stop')).toBeTruthy()
    expect(
      screen.getByTestId('goal-badge-reading-stop', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy()
    fireEvent.press(tile)

    expect(reading.stop).toHaveBeenCalledTimes(1)
    expect(reading.start).not.toHaveBeenCalled()
    expect(openURL).not.toHaveBeenCalled()
    openURL.mockRestore()
  })

  it('shows the last reading session only on the day it happened', async () => {
    const reading = {
      running: false,
      last: { minutes: 12, day: '2026-09-12' },
      start: jest.fn(),
      stop: jest.fn(),
    }
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    const openURL = jest
      .spyOn(Linking, 'openURL')
      .mockRejectedValue(new Error('app missing'))
    const { rerender } = render(
      <GoalGrid snapshot={makeSnapshot()} date={date} reading={reading} />,
    )

    expect(
      screen.getByRole('link', {
        name: 'Reading, starts a reading timer and opens Apple Books',
      }).props.accessibilityValue.text,
    ).toBe('Read 12 min')
    fireEvent.press(
      screen.getByRole('link', {
        name: 'Reading, starts a reading timer and opens Apple Books',
      }),
    )
    await Promise.resolve()
    expect(alert).toHaveBeenCalledWith(
      "Couldn't open Apple Books",
      'Check that the app is installed or the link is available, then try again.',
    )

    rerender(
      <GoalGrid
        snapshot={makeSnapshot()}
        date={new Date(2026, 8, 11, 12)}
        reading={reading}
      />,
    )
    expect(
      screen.getByRole('link', {
        name: 'Reading, starts a reading timer and opens Apple Books',
      }).props.accessibilityValue.text,
    ).toBe('Not tracked')
    alert.mockRestore()
    openURL.mockRestore()
  })

  it('does not open Apple Books when starting the reading timer is refused', async () => {
    const reading = {
      running: false,
      last: null,
      start: jest.fn().mockReturnValue(false),
      stop: jest.fn(),
    }
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
    render(<GoalGrid snapshot={makeSnapshot()} date={date} reading={reading} />)

    fireEvent.press(
      screen.getByRole('link', {
        name: 'Reading, starts a reading timer and opens Apple Books',
      }),
    )
    expect(reading.start).toHaveBeenCalledTimes(1)
    expect(openURL).not.toHaveBeenCalled()
    openURL.mockRestore()
  })

  it('opens the Speaking drill without tracking it as a goal', () => {
    const push = jest.fn()
    jest.mocked(useRouter).mockReturnValue({ ...useRouter(), push })
    render(<GoalGrid snapshot={makeSnapshot()} date={date} />)

    const tile = screen.getByRole('button', { name: 'Speaking practice' })
    expect(tile.props.accessibilityValue.text).toBe('Not tracked')
    fireEvent.press(tile)

    expect(push).toHaveBeenCalledWith({
      pathname: '/speaking',
      params: { date: '2026-09-12' },
    })
  })

  it('reorders tiles by long-press drag or accessibility action and saves the order', async () => {
    const onEdit = jest.fn()
    render(<GoalGrid snapshot={makeSnapshot()} date={date} onEdit={onEdit} />)
    fireEvent(screen.getByTestId('goal-viewport'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 402, height: 300 } },
    })
    // Gesture callbacks pick up the measured layout in a microtask.
    await act(async () => {})
    const at = (x: number, y: number) => ({
      x,
      y,
      absoluteX: x,
      absoluteY: y,
    })

    act(() =>
      fireGestureHandler(getByGestureTestId('goal-drag-1'), [
        { state: State.BEGAN, ...at(50, 50) },
        { state: State.ACTIVE, ...at(50, 50) },
        { state: State.END, ...at(170, 50) },
      ]),
    )

    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(useThemeStore.getState().tileOrder).toEqual([
      'Gym',
      'Steps',
      'Reading',
      'Praying',
      'Speaking',
    ])

    fireEvent(screen.getByTestId('goal-tile-steps'), 'accessibilityAction', {
      nativeEvent: { actionName: 'moveLater' },
    })
    expect(useThemeStore.getState().tileOrder).toEqual([
      'Gym',
      'Reading',
      'Steps',
      'Praying',
      'Speaking',
    ])
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Steps moved to position 3 of 5',
    )
  })

  it('ignores tile taps while rearranging and swaps Settings for Done', () => {
    const push = jest.fn()
    const onDone = jest.fn()
    jest.mocked(useRouter).mockReturnValue({ ...useRouter(), push })
    render(<GoalGrid snapshot={makeSnapshot()} date={date} editing />)
    fireEvent.press(screen.getByRole('button', { name: /^Steps/ }))
    expect(push).not.toHaveBeenCalled()

    render(
      <GoalSummary
        snapshot={null}
        date={date}
        refreshing={false}
        onRefresh={jest.fn()}
        onSettingsPress={jest.fn()}
        editing
        onDone={onDone}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull()
    fireEvent.press(screen.getByRole('button', { name: 'Done' }))
    expect(onDone).toHaveBeenCalled()
  })
})

import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native'
import { useRouter } from 'expo-router'
import { createRef } from 'react'
import { Alert, Linking, processColor, StyleSheet } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'

import {
  GoalGrid,
  GoalSummary,
  type GoalGridHandle,
} from '@/components/dashboard/GoalGrid'
import { WeightCard } from '@/components/dashboard/WeightCard'
import { makeSnapshot } from '@/components/dashboard/__fixtures__/healthSnapshot'
import { Colors } from '@/constants/Colors'
import { useTheme } from '@/hooks/useThemeColor'
import type { HealthWorkout } from '@/lib/healthSnapshot/types'
import { useGymLogStore } from '@/stores/GymLogStore'

jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } =
    jest.requireActual<typeof import('@/constants/Colors')>(
      '@/constants/Colors',
    )
  return { useTheme: jest.fn(() => Colors.light) }
})

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

const mascot = (kind: string, mood: string) =>
  screen.getByTestId(`goal-mascot-${kind}-${mood}`, {
    includeHiddenElements: true,
  })

const fill = (kind: string) =>
  screen.getByTestId(`goal-fill-${kind}`, { includeHiddenElements: true })

function swipeToPage(index: number) {
  fireEvent(screen.getByTestId('goal-viewport'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 402, height: 600 } },
  })
  fireEvent.scroll(screen.getByTestId('goal-pages'), {
    nativeEvent: {
      contentOffset: { x: 402 * index, y: 0 },
      contentSize: { width: 804, height: 600 },
      layoutMeasurement: { width: 402, height: 600 },
    },
  })
}

describe('GoalGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useTheme).mockReturnValue(Colors.light)
    jest.mocked(useReducedMotion).mockReturnValue(false)
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

  it('fits six tiles per page and exposes remaining tiles through swipes and page buttons', () => {
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
      />,
    )
    fireEvent(screen.getByTestId('goal-viewport'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 402, height: 600 } },
    })

    expect(
      within(screen.getByTestId('goal-page-1')).getAllByTestId(/^goal-tile-/),
    ).toHaveLength(6)
    const surface = StyleSheet.flatten(
      screen.getByTestId('goal-surface-steps', { includeHiddenElements: true })
        .props.style,
    )
    expect(surface.width).toBe(surface.height)
    expect(surface.height).toBeGreaterThanOrEqual(44)
    expect(surface.height).toBeLessThanOrEqual(138)
    expect(screen.queryByRole('button', { name: 'See all metrics' })).toBeNull()
    fireEvent.scroll(screen.getByTestId('goal-pages'), {
      nativeEvent: {
        contentOffset: { x: 402, y: 0 },
        contentSize: { width: 804, height: 600 },
        layoutMeasurement: { width: 402, height: 600 },
      },
    })
    expect(onPageChange).toHaveBeenLastCalledWith({ index: 1, count: 2 })
    expect(screen.queryByLabelText('Steps 5,000')).toBeNull()
    expect(
      within(screen.getByTestId('goal-page-2')).getAllByTestId(/^goal-tile-/),
    ).toHaveLength(2)
    fireEvent.press(screen.getByRole('button', { name: 'See all metrics' }))
    expect(push).toHaveBeenCalledWith({
      pathname: '/fitness-metrics',
      params: { date: '2026-09-12' },
    })
    act(() => grid.current?.showPage(0))
    expect(onPageChange).toHaveBeenLastCalledWith({ index: 0, count: 2 })
    expect(screen.getByLabelText('Steps 5,000')).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)(
    'pairs each tile with a decorative mascot in the %s theme',
    (theme) => {
      jest.mocked(useTheme).mockReturnValue(Colors[theme])
      render(
        <GoalGrid
          snapshot={makeSnapshot({
            workouts: [workout('running', 30), workout('strength', 45)],
          })}
          date={date}
        />,
      )

      for (const [label, kind, role] of [
        ['Steps', 'steps', 'button'],
        ['Gym', 'lift', 'button'],
        ['Water', 'water', 'button'],
        ['Reading', 'reading', 'link'],
        ['Praying', 'praying', 'link'],
        ['Journal', 'journal', 'link'],
        ['Speaking', 'speaking', 'button'],
      ] as const) {
        if (kind === 'speaking') {
          swipeToPage(1)
        }
        const tile = screen.getByRole(role, {
          name: new RegExp(`^${label}[ ,]`),
        })
        const mascotID = new RegExp(`^goal-mascot-${kind}-`)
        const drawing = within(tile).getByTestId(mascotID, {
          includeHiddenElements: true,
        })
        expect(drawing.props).toMatchObject({
          accessible: false,
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
            complete ? Colors[theme].goalOnComplete : Colors[theme].text,
          ]),
        )
        const outline = screen.getByTestId(
          `goal-outline-${label.toLowerCase()}`,
          { includeHiddenElements: true },
        )
        expect(outline.props).toMatchObject({
          rx: 20,
          strokeWidth: 6,
          stroke: {
            type: 0,
            payload: processColor(
              complete ? Colors[theme].goalComplete : Colors[theme].goalTrack,
            ),
          },
        })
      }
      swipeToPage(0)
      expect(screen.getAllByRole('button')).toHaveLength(3)
      expect(screen.getAllByRole('link')).toHaveLength(3)
    },
  )

  it.each([
    [0, 0, 'sad'],
    [19_999, 99, 'sad'],
    [20_000, 100, 'happy'],
    [35_000, 100, 'happy'],
  ] as const)(
    'requires 20,000 steps before filling the tile completely, actual %s',
    (steps, percent, mood) => {
      render(<GoalGrid snapshot={makeSnapshot({ steps })} date={date} />)
      expect(goalState(/^Steps/)).toBe(
        `${steps >= 20_000 ? 'Goal met' : 'Goal not met'} (${percent}%)`,
      )
      expect(fill('steps')).toHaveStyle({
        height: `${Math.min(steps / 20_000, 1) * 100}%`,
        bottom: 0,
      })
      expect(screen.queryAllByText(/^\d+%$/)).toHaveLength(0)
      expect(mascot('steps', mood)).toBeTruthy()
    },
  )

  it.each([
    [29 + 59 / 60, 99, 'sad'],
    [30, 100, 'happy'],
    [60, 100, 'happy'],
  ] as const)(
    'requires 30 actual running minutes, duration %s',
    (minutes, percent, mood) => {
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
      expect(fill('gym')).toHaveStyle({
        height: `${((Math.min(minutes / 30, 1) + 2) / 3) * 100}%`,
      })
      expect(mascot('lift', mood)).toBeTruthy()
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
    expect(mascot('lift', 'sad')).toBeTruthy()
  })

  it('groups lift and morning weight without completing Gym or claiming a water goal', () => {
    render(
      <GoalGrid
        snapshot={makeSnapshot({
          steps: 0,
          waterLiters: 3,
          workouts: [workout('strength', 60)],
        })}
        date={date}
      />,
    )
    expect(goalState(/^Gym,/)).toBe('Goal not met (66%)')
    expect(screen.getByText('2/3 goals')).toBeTruthy()
    expect(screen.getByLabelText(/^Gym,.*Cardio,.*Lift,.*Weight,/)).toBeTruthy()
    expect(goalState(/^Water/)).toBe('No goal')
    expect(mascot('lift', 'sad')).toBeTruthy()
    expect(mascot('water', 'neutral')).toBeTruthy()
    expect(fill('gym')).toHaveStyle({
      height: `${(2 / 3) * 100}%`,
    })
  })

  it('shows unknown states instead of invented zero readings', () => {
    render(<GoalGrid snapshot={null} date={date} />)
    expect(screen.getByLabelText('Steps unavailable')).toBeTruthy()
    expect(screen.getByLabelText('Water unavailable')).toBeTruthy()
    expect(screen.getAllByText('--')).toHaveLength(3)
    expect(screen.queryByText(/^0( |$)|0\.0/)).toBeNull()
    expect(
      screen.getAllByTestId(/^goal-mascot-.*-neutral$/, {
        includeHiddenElements: true,
      }),
    ).toHaveLength(7)
    for (const name of ['Reading', 'Praying', 'Journal']) {
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

      const fillStyle = StyleSheet.flatten(fill('gym').props.style)
      expect(Number.parseFloat(fillStyle.height)).toBeCloseTo(progress * 100)
      expect(goalState(/^Gym,/)).toBe(
        `${progress === 1 ? 'Goal met' : 'Goal not met'} (${Math.floor(progress * 100)}%)`,
      )
      expect(mascot('lift', progress === 1 ? 'happy' : 'sad')).toBeTruthy()
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
          notes: '',
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

  it('fills upward from Health readings without celebrating partial progress', () => {
    const { rerender } = render(
      <GoalGrid snapshot={makeSnapshot({ steps: 0 })} date={date} />,
    )
    expect(fill('steps')).toHaveStyle({
      height: '0%',
      backgroundColor: Colors.light.goalFill,
    })

    rerender(<GoalGrid snapshot={makeSnapshot({ steps: 5_000 })} date={date} />)

    expect(fill('steps')).toHaveStyle({
      height: '25%',
      backgroundColor: Colors.light.goalFill,
    })
    expect(
      StyleSheet.flatten(mascot('steps', 'sad').props.style).animationName,
    ).toBe('none')
    expect(goalState(/^Steps/)).toBe('Goal not met (25%)')
    expect(StyleSheet.flatten(fill('steps').props.style)).toMatchObject({
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      transitionProperty: ['height', 'backgroundColor'],
      transitionDuration: 200,
    })
  })

  it('celebrates completion once instead of looping or restarting on every refresh', () => {
    const { rerender } = render(
      <GoalGrid snapshot={makeSnapshot({ steps: 19_999 })} date={date} />,
    )
    rerender(
      <GoalGrid snapshot={makeSnapshot({ steps: 20_000 })} date={date} />,
    )

    const celebration = StyleSheet.flatten(mascot('steps', 'happy').props.style)
    expect(celebration).toMatchObject({
      animationDuration: 300,
      animationIterationCount: 1,
    })
    expect(celebration.animationName).not.toBe('none')
    expect(fill('steps')).toHaveStyle({
      height: '100%',
      backgroundColor: Colors.light.goalComplete,
    })

    rerender(
      <GoalGrid snapshot={makeSnapshot({ steps: 21_000 })} date={date} />,
    )
    expect(
      StyleSheet.flatten(mascot('steps', 'happy').props.style).animationName,
    ).toBe(celebration.animationName)
  })

  it('retains the completed icon and real fill without motion when Reduce Motion is on', () => {
    jest.mocked(useReducedMotion).mockReturnValue(true)
    render(<GoalGrid snapshot={makeSnapshot({ steps: 20_000 })} date={date} />)

    expect(
      StyleSheet.flatten(mascot('steps', 'happy').props.style).animationName,
    ).toBe('none')
    expect(
      StyleSheet.flatten(fill('steps').props.style).transitionProperty,
    ).toBe('none')
    expect(fill('steps')).toHaveStyle({ height: '100%' })
    expect(goalState(/^Steps/)).toBe('Goal met (100%)')
  })

  it('reverses completed styling when the selected day has less or missing data', () => {
    const { rerender } = render(
      <GoalGrid snapshot={makeSnapshot({ steps: 20_000 })} date={date} />,
    )
    const surface = () =>
      screen.getByTestId('goal-surface-steps', { includeHiddenElements: true })
    expect(surface()).toHaveStyle({
      backgroundColor: Colors.light.goalComplete,
    })

    const previousDay = new Date(2026, 8, 11, 12)
    rerender(
      <GoalGrid
        snapshot={makeSnapshot({ date: '2026-09-11', steps: 10_000 })}
        date={previousDay}
      />,
    )
    expect(surface()).toHaveStyle({
      backgroundColor: Colors.light.homeBackground,
    })
    expect(fill('steps')).toHaveStyle({
      height: '50%',
      backgroundColor: Colors.light.goalFill,
    })
    expect(goalState(/^Steps/)).toBe('Goal not met (50%)')

    rerender(<GoalGrid snapshot={null} date={previousDay} />)
    expect(
      screen.queryByTestId('goal-fill-steps', { includeHiddenElements: true }),
    ).toBeNull()
    expect(surface()).toHaveStyle({
      backgroundColor: Colors.light.homeBackground,
    })
    expect(goalState(/^Steps/)).toBe('Goal progress unavailable')
  })

  it('keeps water and external activities unfilled without inventing timers or goals', () => {
    render(<GoalGrid snapshot={makeSnapshot({ waterLiters: 8 })} date={date} />)

    for (const kind of ['water', 'reading', 'praying', 'journal', 'speaking']) {
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
    [/^Water 1.5 liters recorded$/, '/water'],
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
    ['Journal, opens Bear', 'bear://x-callback-url/today'],
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

  it('shows Speaking as a disabled placeholder until it is built', () => {
    const openURL = jest.spyOn(Linking, 'openURL')
    const push = jest.fn()
    jest.mocked(useRouter).mockReturnValue({ ...useRouter(), push })
    render(<GoalGrid snapshot={makeSnapshot()} date={date} />)

    swipeToPage(1)
    const tile = screen.getByRole('button', { name: 'Speaking, coming soon' })
    expect(tile).toBeDisabled()
    fireEvent.press(tile)

    expect(openURL).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    openURL.mockRestore()
  })
})

describe('WeightCard', () => {
  it('shows a morning reading and partial-week coverage without adjustment advice', () => {
    render(
      <WeightCard snapshot={makeSnapshot()} date={new Date(2026, 8, 12, 12)} />,
    )
    expect(screen.getByLabelText('Morning weight 78.4 kilograms')).toBeTruthy()
    expect(screen.getByText('7-day average: 78.4 kg')).toBeTruthy()
    expect(screen.getByText('First reading at 7:00 AM')).toBeTruthy()
    expect(screen.getByText('1/7 mornings / previous 0/7')).toBeTruthy()
    expect(screen.getByText('Weekly change unavailable')).toBeTruthy()
    expect(screen.queryByText(/eat less|eat more|deficit|surplus/i)).toBeNull()
  })

  it('never replaces a missing morning reading with the latest known body mass', () => {
    render(
      <WeightCard
        snapshot={makeSnapshot({ bodyMassKg: 78.4, bodyMassHistory: null })}
        date={new Date(2026, 8, 12, 12)}
      />,
    )
    expect(screen.getByLabelText('Morning weight unavailable')).toBeTruthy()
    expect(screen.queryByText(/78\.4/)).toBeNull()
    expect(screen.getByText('7-day average: -- kg')).toBeTruthy()
  })

  it('compares observed morning averages rather than two single latest readings', () => {
    render(
      <WeightCard
        date={new Date(2026, 8, 12, 12)}
        snapshot={makeSnapshot({
          bodyMassHistory: [
            { kilograms: 78, startISO: new Date(2026, 8, 12, 7).toISOString() },
            { kilograms: 79, startISO: new Date(2026, 8, 11, 7).toISOString() },
            { kilograms: 80, startISO: new Date(2026, 8, 5, 7).toISOString() },
          ],
        })}
      />,
    )
    expect(screen.getByText('7-day average: 78.5 kg')).toBeTruthy()
    expect(screen.getByText('-1.5 kg vs previous 7 days')).toBeTruthy()
    expect(screen.getByText('2/7 mornings / previous 1/7')).toBeTruthy()
  })
})

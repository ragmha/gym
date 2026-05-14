import { act, cleanup, renderHook } from '@testing-library/react-native'

import {
  bucketByDate,
  useWeightGoalProgress,
  useWeightStoreBase,
  useWeightTimeline,
  type WeightEntry,
} from '@/stores/WeightStore'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}))

const today = new Date('2026-02-10T12:00:00Z')

function entry(date: string, weightKg: number): WeightEntry {
  return { id: date, date, weightKg, note: null }
}

function datedEntries(weights: number[]): WeightEntry[] {
  return weights.map((weightKg, index) =>
    entry(`2026-02-${String(index + 1).padStart(2, '0')}`, weightKg),
  )
}

function dateKeyDaysAgo(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().slice(0, 10)
}

function resetWeightStore() {
  act(() => {
    useWeightStoreBase.setState({
      entries: [],
      loading: false,
      error: null,
      initialized: true,
      unit: 'kg',
      goalKg: null,
    })
  })
}

beforeEach(() => {
  resetWeightStore()
})

afterEach(() => {
  cleanup()
})

describe('bucketByDate', () => {
  it('returns empty slots for empty entries', () => {
    const points = bucketByDate([], 7, today)

    expect(points).toHaveLength(7)
    expect(points.every((point) => point.weightKg === 0)).toBe(true)
    expect(points.map((point) => point.dateKey)).toEqual([
      '2026-02-04',
      '2026-02-05',
      '2026-02-06',
      '2026-02-07',
      '2026-02-08',
      '2026-02-09',
      '2026-02-10',
    ])
  })

  it('places fewer-than-range entries into their date slots', () => {
    const points = bucketByDate(
      [entry('2026-02-08', 81), entry('2026-02-10', 80)],
      7,
      today,
    )

    expect(points.map((point) => point.weightKg)).toEqual([
      0, 0, 0, 0, 81, 0, 80,
    ])
  })

  it('fills exact-range entries', () => {
    const points = bucketByDate(
      datedEntries([84, 83, 82, 81, 80, 79, 78]).map((item, index) => ({
        ...item,
        date: `2026-02-${String(index + 4).padStart(2, '0')}`,
      })),
      7,
      today,
    )

    expect(points.map((point) => point.weightKg)).toEqual([
      84, 83, 82, 81, 80, 79, 78,
    ])
  })

  it('truncates entries older than the range', () => {
    const points = bucketByDate(
      datedEntries([89, 88, 87, 86, 85, 84, 83, 82, 81, 80]),
      7,
      today,
    )

    expect(points[0].dateKey).toBe('2026-02-04')
    expect(points.map((point) => point.weightKg)).toEqual([
      86, 85, 84, 83, 82, 81, 80,
    ])
  })

  it('keeps gaps as empty slots', () => {
    const points = bucketByDate(
      [
        entry('2026-02-04', 84),
        entry('2026-02-06', 82),
        entry('2026-02-10', 80),
      ],
      7,
      today,
    )

    expect(points.map((point) => point.weightKg)).toEqual([
      84, 0, 82, 0, 0, 0, 80,
    ])
  })
})

describe('useWeightTimeline', () => {
  it('returns chart-ready points, min/max, axis range, and average', () => {
    act(() => {
      useWeightStoreBase.setState({
        entries: [
          entry(dateKeyDaysAgo(6), 80),
          entry(dateKeyDaysAgo(4), 82),
          entry(dateKeyDaysAgo(0), 83),
        ],
        unit: 'kg',
      })
    })

    const { result } = renderHook(() => useWeightTimeline({ rangeDays: 7 }))

    expect(result.current.points).toHaveLength(7)
    expect(result.current.minKg).toBe(80)
    expect(result.current.maxKg).toBe(83)
    expect(result.current.average).toBe(81.7)
    expect(result.current.axisRange.lo).toBeCloseTo(79.55)
    expect(result.current.axisRange.hi).toBeCloseTo(83.45)
    expect(result.current.hasData).toBe(true)
  })
})

describe('useWeightGoalProgress', () => {
  it('returns no-goal when no goal is set', () => {
    const { result } = renderHook(() => useWeightGoalProgress())

    expect(result.current.status).toBe('no-goal')
    expect(result.current.goalKg).toBeNull()
    expect(result.current.formattedDelta).toBeNull()
  })

  it('marks a goal reached within tolerance', () => {
    act(() => {
      useWeightStoreBase.setState({
        entries: [entry('2026-02-10', 80.1)],
        goalKg: 80,
      })
    })

    const { result } = renderHook(() => useWeightGoalProgress())

    expect(result.current.status).toBe('reached')
    expect(result.current.deltaToGoalKg).toBe(0.1)
  })

  it('marks on-track when the trend moves toward the goal', () => {
    act(() => {
      useWeightStoreBase.setState({
        entries: datedEntries([
          82, 82, 82, 82, 82, 82, 82, 80, 80, 80, 80, 80, 80, 80,
        ]),
        goalKg: 75,
      })
    })

    const { result } = renderHook(() => useWeightGoalProgress())

    expect(result.current.status).toBe('on-track')
    expect(result.current.trendDirection).toBe('down')
  })

  it('marks off-track when the trend moves away from the goal', () => {
    act(() => {
      useWeightStoreBase.setState({
        entries: datedEntries([
          80, 80, 80, 80, 80, 80, 80, 82, 82, 82, 82, 82, 82, 82,
        ]),
        goalKg: 75,
      })
    })

    const { result } = renderHook(() => useWeightGoalProgress())

    expect(result.current.status).toBe('off-track')
    expect(result.current.trendDirection).toBe('up')
  })

  it('reports no latest weight when a goal exists but no entries exist yet', () => {
    act(() => {
      useWeightStoreBase.setState({ goalKg: 75 })
    })

    const { result } = renderHook(() => useWeightGoalProgress())

    expect(result.current.status).toBe('off-track')
    expect(result.current.latestKg).toBeNull()
    expect(result.current.deltaToGoalKg).toBeNull()
  })
})

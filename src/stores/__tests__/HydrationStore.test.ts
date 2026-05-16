import { act, cleanup, renderHook } from '@testing-library/react-native'

import {
  createDailyHydrationSummary,
  getLocalDayKey,
  HydrationEntry,
  useDailyHydration,
  useHydrationStore,
} from '@/stores/HydrationStore'

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  ),
)

const TODAY = new Date(2026, 0, 15, 12, 0, 0)
const YESTERDAY = new Date(2026, 0, 14, 12, 0, 0)

function entry(id: string, amountMl: number, date = getLocalDayKey(TODAY)) {
  return {
    id,
    date,
    amountMl,
    timestamp: new Date(`${date}T12:00:00`).getTime(),
  } satisfies HydrationEntry
}

function resetHydrationStore() {
  act(() => {
    useHydrationStore.setState({
      entries: [],
      goalMl: 2000,
      quickAddMl: 500,
    })
  })
}

function setEntries(entries: HydrationEntry[], goalMl = 2000) {
  act(() => {
    useHydrationStore.setState({ entries, goalMl })
  })
}

beforeEach(() => {
  jest.useFakeTimers({ now: TODAY })
  resetHydrationStore()
})

afterEach(() => {
  cleanup()
  jest.useRealTimers()
})

describe('HydrationStore', () => {
  it('adds and removes hydration entries', () => {
    act(() => {
      useHydrationStore.getState().addEntry(500)
    })

    const [addedEntry] = useHydrationStore.getState().entries
    expect(addedEntry).toMatchObject({
      date: getLocalDayKey(TODAY),
      amountMl: 500,
      timestamp: TODAY.getTime(),
    })

    act(() => {
      useHydrationStore.getState().removeEntry(addedEntry.id)
    })

    expect(useHydrationStore.getState().entries).toEqual([])
  })

  it('returns an empty daily hydration summary', () => {
    const { result } = renderHook(() => useDailyHydration())

    expect(result.current).toMatchObject({
      todayEntries: [],
      totalMl: 0,
      remainingMl: 2000,
      goalMl: 2000,
      progress: 0,
      percentOfGoal: 0,
      goalReached: false,
      status: 'empty',
      formattedTotal: '0',
      formattedRemaining: '2,000',
    })
  })

  it('returns a partial daily hydration summary', () => {
    setEntries([entry('morning', 500), entry('afternoon', 250)])

    const { result } = renderHook(() => useDailyHydration())

    expect(result.current).toMatchObject({
      todayEntries: [entry('morning', 500), entry('afternoon', 250)],
      totalMl: 750,
      remainingMl: 1250,
      goalMl: 2000,
      progress: 0.375,
      percentOfGoal: 37.5,
      goalReached: false,
      status: 'progress',
      formattedTotal: '750',
      formattedRemaining: '1,250',
    })
  })

  it('returns an exact-goal daily hydration summary', () => {
    setEntries([entry('morning', 1000), entry('evening', 1000)])

    const { result } = renderHook(() => useDailyHydration())

    expect(result.current).toMatchObject({
      totalMl: 2000,
      remainingMl: 0,
      progress: 1,
      percentOfGoal: 100,
      goalReached: true,
      status: 'reached',
      formattedTotal: '2,000',
      formattedRemaining: '0',
    })
  })

  it('caps progress for an over-goal daily hydration summary', () => {
    setEntries([entry('morning', 1500), entry('evening', 1000)])

    const { result } = renderHook(() => useDailyHydration())

    expect(result.current).toMatchObject({
      totalMl: 2500,
      remainingMl: 0,
      progress: 1,
      percentOfGoal: 100,
      goalReached: true,
      status: 'reached',
      formattedTotal: '2,500',
      formattedRemaining: '0',
    })
  })

  it("excludes yesterday's entries from today's totals", () => {
    const summary = createDailyHydrationSummary(
      [
        entry('yesterday', 1000, getLocalDayKey(YESTERDAY)),
        entry('today', 500),
      ],
      2000,
      getLocalDayKey(TODAY),
    )

    expect(summary.todayEntries).toEqual([entry('today', 500)])
    expect(summary.totalMl).toBe(500)
    expect(summary.remainingMl).toBe(1500)
  })

  it("clearToday only deletes today's entries", () => {
    const yesterdayEntry = entry('yesterday', 1000, getLocalDayKey(YESTERDAY))
    setEntries([yesterdayEntry, entry('today', 500)])

    act(() => {
      useHydrationStore.getState().clearToday()
    })

    expect(useHydrationStore.getState().entries).toEqual([yesterdayEntry])
  })
})

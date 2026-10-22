import { act, renderHook } from '@testing-library/react-native'

import { useDayPlanner } from '@/hooks/useDayPlanner'
import { fetchCommute } from '@/lib/transit'
import {
  plannerNative,
  readPlannerDay,
  setPlannerReminderCompleted,
} from '@/lib/plannerNative'
import type { PlannerDay } from '@/lib/planner'

jest.mock('@/lib/plannerNative', () => ({
  plannerNative: jest.fn(),
  readPlannerDay: jest.fn(),
  setPlannerReminderCompleted: jest.fn(),
}))
jest.mock('@/lib/transit', () => ({ fetchCommute: jest.fn() }))
const native = {
  readDay: jest.fn(),
  getTransitKey: jest.fn(),
  setTransitKey: jest.fn(),
  setReminderCompleted: jest.fn(),
  requestCalendarAccess: jest.fn(async () => true),
  requestRemindersAccess: jest.fn(async () => true),
}
const day: PlannerDay = {
  calendarAccess: 'undetermined',
  remindersAccess: 'undetermined',
  events: [],
  reminders: [],
}

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date(2026, 9, 21, 10))
  jest.clearAllMocks()
  jest.mocked(plannerNative).mockReturnValue(native)
  jest.mocked(readPlannerDay).mockResolvedValue(day)
})
afterEach(() => jest.useRealTimers())

it('reads without requesting permissions and connects only on an explicit action', async () => {
  const { result } = renderHook(() => useDayPlanner(true, null))
  await act(async () => {})
  expect(result.current.day).toEqual(day)
  expect(native.requestCalendarAccess).not.toHaveBeenCalled()
  expect(native.requestRemindersAccess).not.toHaveBeenCalled()
  await act(async () => result.current.connect('Calendar'))
  expect(native.requestCalendarAccess).toHaveBeenCalledTimes(1)
  expect(native.requestRemindersAccess).not.toHaveBeenCalled()
})

it('does not request native data on unsupported builds or while another page is active', async () => {
  jest.mocked(plannerNative).mockReturnValue(null)
  const view = renderHook(
    ({ active }: { active: boolean }) => useDayPlanner(active, null),
    {
      initialProps: { active: true },
    },
  )
  await act(async () => {})
  expect(readPlannerDay).not.toHaveBeenCalled()
  jest.mocked(plannerNative).mockReturnValue(native)
  view.rerender({ active: false })
  await act(async () => {
    jest.advanceTimersByTime(120_000)
  })
  expect(readPlannerDay).not.toHaveBeenCalled()
  expect(native.getTransitKey).not.toHaveBeenCalled()
})

it('does not apply a late read after Today becomes inactive', async () => {
  let resolve: ((day: PlannerDay) => void) | undefined
  jest.mocked(readPlannerDay).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  const view = renderHook(
    ({ active }: { active: boolean }) => useDayPlanner(active, null),
    {
      initialProps: { active: true },
    },
  )
  view.rerender({ active: false })
  await act(async () => {
    resolve?.({ ...day, calendarAccess: 'granted' })
  })
  expect(view.result.current.day).toBeNull()
})

it('removes old readings and exposes a safe retryable error after a failed read', async () => {
  const { result } = renderHook(() => useDayPlanner(true, null))
  await act(async () => {})
  expect(result.current.day).toEqual(day)
  jest
    .mocked(readPlannerDay)
    .mockRejectedValue(new Error('private native error'))
  await act(async () => result.current.refresh())
  expect(result.current.day).toBeNull()
  expect(result.current.error).toContain(
    'Could not read Calendar and Reminders',
  )
  expect(result.current.error).not.toContain('private')
})

it('keeps a successful return journey when the outbound metro is unavailable', async () => {
  jest.setSystemTime(new Date(2026, 9, 21, 8, 55))
  native.getTransitKey.mockResolvedValue('test-key')
  const homeJourney = {
    direction: 'Home' as const,
    leaveMs: Date.now() + 8 * 60 * 60_000,
    arriveMs: Date.now() + 9 * 60 * 60_000,
    fetchedMs: Date.now(),
    realtime: false,
  }
  jest
    .mocked(fetchCommute)
    .mockImplementation(async (_commute, _key, _now, _signal, direction) => {
      if (direction === 'To work')
        throw new Error(
          'No suitable upcoming metro journey was returned by HSL.',
        )
      return homeJourney
    })
  const commute = {
    home: { gtfsId: 'HSL:1', name: 'Home', lat: 60.2, lon: 24.9 },
    work: { gtfsId: 'HSL:2', name: 'Work', lat: 60.1, lon: 24.8 },
    start: '09:00',
    end: '17:00',
    homeWalkMinutes: 5,
    workWalkMinutes: 5,
  }
  const { result } = renderHook(() => useDayPlanner(true, commute))
  await act(async () => {})
  expect(result.current.journeys).toEqual([homeJourney])
  expect(result.current.transit).toEqual(homeJourney)
  expect(result.current.transitError).toContain('To work: No suitable')
})

const taskDay: PlannerDay = {
  ...day,
  remindersAccess: 'granted',
  reminders: [
    {
      id: 'task',
      title: 'Private task',
      dueMs: null,
      hasDueTime: false,
      priority: 1,
      completed: false,
    },
  ],
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

it('writes only on explicit taps, suppresses duplicate IDs and waits for native confirmation', async () => {
  jest.mocked(readPlannerDay).mockResolvedValue(taskDay)
  const saved = deferred<{ id: string; completed: boolean }>()
  jest.mocked(setPlannerReminderCompleted).mockReturnValue(saved.promise)
  const { result } = renderHook(() => useDayPlanner(true, null))
  await act(async () => {})
  expect(setPlannerReminderCompleted).not.toHaveBeenCalled()
  let pending!: Promise<void>
  act(() => {
    pending = result.current.setReminderCompleted('task', true)
    void result.current.setReminderCompleted('task', true)
  })
  expect(setPlannerReminderCompleted).toHaveBeenCalledTimes(1)
  expect(result.current.pendingReminders).toEqual(['task'])
  expect(result.current.day?.reminders[0].completed).toBe(false)
  // Hold the post-save refresh to observe the native-confirmed state.
  jest.mocked(readPlannerDay).mockReturnValue(new Promise(() => {}))
  await act(async () => {
    saved.resolve({ id: 'task', completed: true })
    await pending
  })
  expect(result.current.day?.reminders[0].completed).toBe(true)
  expect(result.current.pendingReminders).toEqual([])
  expect(result.current.reminderError).toBeNull()
  const undone = deferred<{ id: string; completed: boolean }>()
  jest.mocked(setPlannerReminderCompleted).mockReturnValue(undone.promise)
  act(() => {
    pending = result.current.setReminderCompleted('task', false)
  })
  expect(result.current.day?.reminders[0].completed).toBe(true)
  await act(async () => {
    undone.resolve({ id: 'task', completed: false })
    await pending
  })
  expect(result.current.day?.reminders[0].completed).toBe(false)
})

it('ignores stale reads started before or during a write', async () => {
  jest.mocked(readPlannerDay).mockResolvedValue(taskDay)
  const { result } = renderHook(() => useDayPlanner(true, null))
  await act(async () => {})
  const stale = deferred<PlannerDay>()
  jest.mocked(readPlannerDay).mockReturnValue(stale.promise)
  await act(async () => result.current.refresh())
  const saved = deferred<{ id: string; completed: boolean }>()
  jest.mocked(setPlannerReminderCompleted).mockReturnValue(saved.promise)
  let pending!: Promise<void>
  act(() => {
    pending = result.current.setReminderCompleted('task', true)
  })
  await act(async () => {
    stale.resolve({ ...day, remindersAccess: 'denied' })
  })
  expect(result.current.day).toEqual(taskDay)
  const during = deferred<PlannerDay>()
  jest.mocked(readPlannerDay).mockReturnValue(during.promise)
  await act(async () => result.current.refresh())
  await act(async () => during.resolve({ ...day, remindersAccess: 'denied' }))
  expect(result.current.day).toEqual(taskDay)
  jest.mocked(readPlannerDay).mockReturnValue(new Promise(() => {}))
  await act(async () => {
    saved.resolve({ id: 'task', completed: true })
    await pending
  })
  expect(result.current.day?.reminders[0].completed).toBe(true)
})

it('sanitizes a failed write, preserves unchecked state and allows retry', async () => {
  jest.mocked(readPlannerDay).mockResolvedValue(taskDay)
  jest
    .mocked(setPlannerReminderCompleted)
    .mockRejectedValue(new Error('private native details'))
  const { result } = renderHook(() => useDayPlanner(true, null))
  await act(async () => {})
  await act(async () => result.current.setReminderCompleted('task', true))
  expect(result.current.day?.reminders[0].completed).toBe(false)
  expect(result.current.reminderError).toBe(
    'Could not confirm the reminder change. Check the task and try again.',
  )
  expect(result.current.pendingReminders).toEqual([])
  await act(async () => result.current.setReminderCompleted('task', true))
  expect(setPlannerReminderCompleted).toHaveBeenCalledTimes(2)
})

it('does not write unknown tasks, denied reminders or after Today is inactive', async () => {
  jest.mocked(readPlannerDay).mockResolvedValue(taskDay)
  const view = renderHook(
    ({ active }: { active: boolean }) => useDayPlanner(active, null),
    {
      initialProps: { active: true },
    },
  )
  await act(async () => {})
  await act(async () =>
    view.result.current.setReminderCompleted('unknown', true),
  )
  view.rerender({ active: false })
  await act(async () => view.result.current.setReminderCompleted('task', true))
  expect(setPlannerReminderCompleted).not.toHaveBeenCalled()
})

it('allows separate reminder IDs to save concurrently and blocks denied access', async () => {
  const twoTasks = {
    ...taskDay,
    reminders: [
      ...taskDay.reminders,
      { ...taskDay.reminders[0], id: 'second' },
    ],
  }
  jest.mocked(readPlannerDay).mockResolvedValue(twoTasks)
  const first = deferred<{ id: string; completed: boolean }>()
  const second = deferred<{ id: string; completed: boolean }>()
  jest
    .mocked(setPlannerReminderCompleted)
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  const { result } = renderHook(() => useDayPlanner(true, null))
  await act(async () => {})
  let firstWrite!: Promise<void>
  let secondWrite!: Promise<void>
  act(() => {
    firstWrite = result.current.setReminderCompleted('task', true)
    secondWrite = result.current.setReminderCompleted('second', true)
  })
  expect(setPlannerReminderCompleted).toHaveBeenCalledTimes(2)
  expect(result.current.pendingReminders).toEqual(['task', 'second'])
  jest.mocked(readPlannerDay).mockReturnValue(new Promise(() => {}))
  await act(async () => {
    first.resolve({ id: 'task', completed: true })
    await firstWrite
  })
  expect(result.current.pendingReminders).toEqual(['second'])
  await act(async () => {
    second.resolve({ id: 'second', completed: true })
    await secondWrite
  })
  expect(
    result.current.day?.reminders.every((reminder) => reminder.completed),
  ).toBe(true)
  jest
    .mocked(readPlannerDay)
    .mockResolvedValue({ ...twoTasks, remindersAccess: 'denied' })
  await act(async () => result.current.refresh())
  await act(async () => result.current.setReminderCompleted('task', false))
  expect(setPlannerReminderCompleted).toHaveBeenCalledTimes(2)
})

it('does not restore cleared data when a write finishes in the background', async () => {
  const { AppState } =
    jest.requireActual<typeof import('react-native')>('react-native')
  const listener = jest.spyOn(AppState, 'addEventListener')
  jest.mocked(readPlannerDay).mockResolvedValue(taskDay)
  const saved = deferred<{ id: string; completed: boolean }>()
  jest.mocked(setPlannerReminderCompleted).mockReturnValue(saved.promise)
  const { result } = renderHook(() => useDayPlanner(true, null))
  await act(async () => {})
  let pending!: Promise<void>
  act(() => {
    pending = result.current.setReminderCompleted('task', true)
  })
  act(() => listener.mock.lastCall?.[1]('background'))
  await act(async () => {
    saved.resolve({ id: 'task', completed: true })
    await pending
  })
  expect(result.current.day).toBeNull()
  expect(result.current.pendingReminders).toEqual([])
  listener.mockRestore()
})

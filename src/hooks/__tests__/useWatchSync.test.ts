import { renderHook } from '@testing-library/react-native'
import { requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'

import {
  startWatchSync,
  useWatchSync,
  type GymWatchBridge,
} from '@/hooks/useWatchSync'
import { useGymLogStore } from '@/stores/GymLogStore'

jest.mock('expo', () => ({ requireOptionalNativeModule: jest.fn() }))

const today = '2026-10-17'
const tap = (action: string) =>
  JSON.stringify({
    action,
    dateKey: today,
    day: '1',
    exerciseId: 'exercise-1',
    reps: 12,
    kilograms: 40,
  })

function fakeWatch(inbox: string[] = []) {
  let notify = () => {}
  const remove = jest.fn()
  const watch = {
    setState: jest.fn<void, [string]>(),
    takeMessages: jest.fn(() => inbox.splice(0)),
    addListener: jest.fn((_: 'onMessages', listener: () => void) => {
      notify = listener
      return { remove }
    }),
  } satisfies GymWatchBridge
  const receive = (json: string) => {
    inbox.push(json)
    notify()
  }
  const pushed = () => JSON.parse(watch.setState.mock.lastCall?.[0] ?? 'null')
  return { watch, remove, receive, pushed }
}

const logged = () => useGymLogStore.getState().logs[today]?.sets['exercise-1']

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers({ now: new Date('2026-10-17T09:00:00') })
  useGymLogStore.setState({ programmeStart: today, logs: {} })
  jest.spyOn(useGymLogStore.persist, 'hasHydrated').mockReturnValue(true)
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('startWatchSync', () => {
  it('applies queued and new taps and mirrors every change to the watch', () => {
    const { watch, remove, receive, pushed } = fakeWatch([tap('log')])
    const stop = startWatchSync(watch)

    expect(logged()).toEqual([{ reps: 12, kilograms: 40 }])
    expect(pushed()).toMatchObject({ dateKey: today, day: '1' })
    expect(pushed().exercises[0].logged).toEqual(logged())
    expect(pushed().sentAt).toEqual(expect.any(Number))

    receive(tap('undo'))
    expect(useGymLogStore.getState().logs).toEqual({})
    expect(pushed().exercises[0].logged).toEqual([])

    stop()
    const pushes = watch.setState.mock.calls.length
    useGymLogStore
      .getState()
      .logSet(today, '1', 'exercise-1', { reps: 10, kilograms: null })
    expect(remove).toHaveBeenCalled()
    expect(watch.setState).toHaveBeenCalledTimes(pushes)
  })

  it('waits for the saved log before reading or writing it', () => {
    jest.mocked(useGymLogStore.persist.hasHydrated).mockReturnValue(false)
    let hydrate = () => {}
    const unsubscribe = jest.fn()
    jest
      .spyOn(useGymLogStore.persist, 'onFinishHydration')
      .mockImplementation((listener) => {
        hydrate = () => listener(useGymLogStore.getState())
        return unsubscribe
      })
    const { watch } = fakeWatch([tap('log')])

    const stop = startWatchSync(watch)
    expect(watch.takeMessages).not.toHaveBeenCalled()
    expect(watch.setState).not.toHaveBeenCalled()

    hydrate()
    expect(logged()).toHaveLength(1)
    expect(watch.setState).toHaveBeenCalledTimes(1)

    stop()
    expect(unsubscribe).toHaveBeenCalled()
  })
})

describe('useWatchSync', () => {
  it.each(['web', 'android'] as const)(
    'never loads the native bridge on %s',
    (platform) => {
      jest.replaceProperty(Platform, 'OS', platform)
      renderHook(() => useWatchSync())

      expect(requireOptionalNativeModule).not.toHaveBeenCalled()
    },
  )

  it('does nothing on an iOS binary without the watch app', () => {
    jest.replaceProperty(Platform, 'OS', 'ios')
    jest.mocked(requireOptionalNativeModule).mockReturnValue(null)

    expect(() => renderHook(() => useWatchSync()).unmount()).not.toThrow()
    expect(requireOptionalNativeModule).toHaveBeenCalledWith('GymWatch')
  })

  it('syncs while mounted on iOS', () => {
    jest.replaceProperty(Platform, 'OS', 'ios')
    const { watch, remove } = fakeWatch()
    jest.mocked(requireOptionalNativeModule).mockReturnValue(watch)

    const { unmount } = renderHook(() => useWatchSync())
    expect(watch.setState).toHaveBeenCalledTimes(1)

    unmount()
    expect(remove).toHaveBeenCalled()
  })
})

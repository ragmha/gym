import { act, renderHook } from '@testing-library/react-native'
import { requireOptionalNativeModule } from 'expo'
import { Alert, AppState, Platform } from 'react-native'

import { useReadingTimer } from '@/hooks/useReadingTimer.ios'

jest.mock('expo', () => ({ requireOptionalNativeModule: jest.fn() }))

const mockLive = {
  isReading: jest.fn(() => false),
  startReading: jest.fn(),
  stopReading: jest.fn(async () => {}),
  addStopListener: jest.fn((_listener: () => void) => ({ remove: jest.fn() })),
}
jest.mock('@/lib/readingActivity', () => mockLive)

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date(2026, 8, 12, 21))
  jest.clearAllMocks()
  jest.mocked(requireOptionalNativeModule).mockReturnValue({})
  mockLive.isReading.mockReturnValue(false)
  mockLive.startReading.mockImplementation(() => {})
})

afterEach(() => {
  jest.useRealTimers()
})

it('is unavailable without the widget extension and never loads it', () => {
  jest.mocked(requireOptionalNativeModule).mockReturnValue(null)
  const { result } = renderHook(() => useReadingTimer())

  expect(requireOptionalNativeModule).toHaveBeenCalledWith('ExpoWidgets')
  expect(result.current).toBeNull()
  expect(mockLive.isReading).not.toHaveBeenCalled()
  expect(mockLive.addStopListener).not.toHaveBeenCalled()
})

it('starts a Live Activity and reports whole minutes for today when stopped', () => {
  const { result } = renderHook(() => useReadingTimer())
  expect(result.current).toMatchObject({ running: false, last: null })

  act(() => result.current?.start())
  expect(mockLive.startReading).toHaveBeenCalledWith(Date.now())
  expect(result.current?.running).toBe(true)

  act(() => jest.advanceTimersByTime(12 * 60_000 + 59_000))
  act(() => result.current?.stop())

  expect(mockLive.stopReading).toHaveBeenCalledTimes(1)
  expect(result.current).toMatchObject({
    running: false,
    last: { minutes: 12, day: '2026-09-12' },
  })
})

it('explains a refused start instead of claiming the timer runs', () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  mockLive.startReading.mockImplementation(() => {
    throw new Error('Live Activities are disabled')
  })
  const { result } = renderHook(() => useReadingTimer())

  act(() => result.current?.start())

  expect(alert).toHaveBeenCalledWith(
    "Couldn't start the reading timer",
    'Turn on Live Activities for gym in Settings, then try again.',
  )
  expect(result.current?.running).toBe(false)
  alert.mockRestore()
})

it('stops from the Dynamic Island button and unsubscribes on unmount', () => {
  const { result, unmount } = renderHook(() => useReadingTimer())
  act(() => result.current?.start())
  act(() => jest.advanceTimersByTime(5 * 60_000))

  const islandStop = mockLive.addStopListener.mock.calls.at(-1)![0]
  act(() => islandStop())

  expect(mockLive.stopReading).toHaveBeenCalledTimes(1)
  expect(result.current).toMatchObject({
    running: false,
    last: { minutes: 5, day: '2026-09-12' },
  })

  const subscription = mockLive.addStopListener.mock.results.at(-1)!.value
  unmount()
  expect(subscription.remove).toHaveBeenCalled()
})

it('resyncs with running activities on mount and on returning to the app', () => {
  const remove = jest.fn()
  const listen = jest
    .spyOn(AppState, 'addEventListener')
    .mockReturnValue({ remove })
  mockLive.isReading.mockReturnValue(true)
  const { result, unmount } = renderHook(() => useReadingTimer())
  expect(result.current?.running).toBe(true)
  const before = result.current?.last

  mockLive.isReading.mockReturnValue(false)
  const onChange = listen.mock.calls[0][1]
  act(() => onChange('background'))
  expect(result.current?.running).toBe(true)
  act(() => onChange('active'))
  expect(result.current?.running).toBe(false)

  mockLive.isReading.mockReturnValue(true)
  act(() => onChange('active'))
  act(() => result.current?.stop())
  // Started before this app run: end it without inventing minutes.
  expect(mockLive.stopReading).toHaveBeenCalledTimes(1)
  expect(result.current?.running).toBe(false)
  expect(result.current?.last).toBe(before)

  unmount()
  expect(remove).toHaveBeenCalled()
  listen.mockRestore()
})

it('keeps the session across remounts and hides it below iOS 16.2', () => {
  jest
    .spyOn(AppState, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() })
  const first = renderHook(() => useReadingTimer())
  act(() => first.result.current?.start())
  first.unmount()

  mockLive.isReading.mockReturnValue(true)
  const second = renderHook(() => useReadingTimer())
  jest.advanceTimersByTime(7 * 60_000)
  act(() => second.result.current?.stop())
  expect(second.result.current?.last).toEqual({ minutes: 7, day: '2026-09-12' })
  second.unmount()

  const version = Platform.Version
  Object.defineProperty(Platform, 'Version', {
    value: '16.1',
    configurable: true,
  })
  expect(renderHook(() => useReadingTimer()).result.current).toBeNull()
  Object.defineProperty(Platform, 'Version', {
    value: version,
    configurable: true,
  })
  jest.restoreAllMocks()
})

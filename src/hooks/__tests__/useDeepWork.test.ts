import { act, renderHook } from '@testing-library/react-native'

import { useDeepWork } from '@/hooks/useDeepWork'

const mockLive = { showDeepWork: jest.fn(), endDeepWork: jest.fn() }
jest.mock('@/lib/loadDeepWorkActivity', () => ({
  loadDeepWorkActivity: () => mockLive,
}))

const flush = () => act(() => new Promise((resolve) => setImmediate(resolve)))

it('shows a restarted session only after the previous dismissal finishes', async () => {
  let dismiss = () => {}
  mockLive.endDeepWork.mockImplementation(
    () => new Promise<void>((resolve) => (dismiss = resolve)),
  )
  const { result } = renderHook(() => useDeepWork())

  // Startup cleanup is still dismissing an orphan when Start is tapped.
  act(() => result.current.start())
  await flush()
  expect(mockLive.endDeepWork).toHaveBeenCalledTimes(1)
  expect(mockLive.showDeepWork).not.toHaveBeenCalled()
  dismiss()
  await flush()
  expect(mockLive.showDeepWork).toHaveBeenCalledTimes(1)

  act(() => result.current.end())
  act(() => result.current.start())
  await flush()
  expect(mockLive.endDeepWork).toHaveBeenCalledTimes(2)
  expect(mockLive.showDeepWork).toHaveBeenCalledTimes(1)
  dismiss()
  await flush()
  expect(mockLive.showDeepWork).toHaveBeenCalledTimes(2)
})

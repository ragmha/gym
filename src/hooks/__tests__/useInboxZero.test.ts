import { act, renderHook } from '@testing-library/react-native'

import { useInboxZero } from '@/hooks/useInboxZero'
import { loadInboxPage, trashMessages } from '@/lib/inboxZero'
import { connectGmail } from '@/lib/inboxZeroAuth'

jest.mock('@/lib/inboxZeroAuth', () => ({
  inboxZeroAvailability: () => null,
  connectGmail: jest.fn(),
}))
jest.mock('@/lib/inboxZero', () => ({
  loadInboxPage: jest.fn(),
  trashMessages: jest.fn(),
}))

const message = {
  id: 'a1',
  sender: 'sender@example.com',
  subject: 'Synthetic',
  unsubscribe: [],
}
beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(connectGmail).mockResolvedValue('synthetic')
  jest
    .mocked(loadInboxPage)
    .mockResolvedValue({ messages: [message], nextPageToken: 'next' })
  jest.mocked(trashMessages).mockResolvedValue(undefined)
})

it('does not read or write until explicit actions and clears local data on disconnect', async () => {
  const { result } = renderHook(useInboxZero)
  expect(loadInboxPage).not.toHaveBeenCalled()
  await act(async () => {
    await result.current.connect()
  })
  expect(result.current.messages).toEqual([message])
  expect(trashMessages).not.toHaveBeenCalled()
  act(() => result.current.disconnect())
  expect(result.current.connected).toBe(false)
  expect(result.current.messages).toEqual([])
})

it('guards double taps synchronously and requires refresh after partial cleanup', async () => {
  const { result } = renderHook(useInboxZero)
  await act(async () => {
    await result.current.connect()
  })
  jest
    .mocked(trashMessages)
    .mockRejectedValueOnce(new Error('synthetic network failure'))
  await act(async () => {
    await Promise.all([
      result.current.trash(['a1']),
      result.current.trash(['a1']),
    ])
  })
  expect(trashMessages).toHaveBeenCalledTimes(1)
  expect(result.current.messages).toEqual([message])
  expect(result.current.error).toContain('may have partially succeeded')
  await act(async () => {
    await result.current.trash(['a1'])
  })
  expect(trashMessages).toHaveBeenCalledTimes(1)
  await act(async () => {
    await result.current.load()
  })
  expect(result.current.needsRefresh).toBe(false)
  await act(async () => {
    await result.current.trash(['a1'])
  })
  expect(result.current.messages).toEqual([])
  expect(result.current.nextPage).toBeUndefined()
  expect(result.current.notice).toContain('1 messages confirmed')
})

it('rejects unknown IDs without writing and ignores sign-in finishing after exit', async () => {
  const { result } = renderHook(useInboxZero)
  await act(async () => {
    await result.current.connect()
  })
  await act(async () => {
    await result.current.trash(['b2'])
  })
  expect(trashMessages).not.toHaveBeenCalled()
  let finish: (token: string) => void = () => {}
  jest.mocked(connectGmail).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const other = renderHook(useInboxZero)
  let pending: Promise<void>
  act(() => {
    pending = other.result.current.connect()
  })
  other.unmount()
  await act(async () => {
    finish('synthetic')
    await pending
  })
  expect(loadInboxPage).toHaveBeenCalledTimes(1)
})

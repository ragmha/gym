import { fireEvent, render, screen } from '@testing-library/react-native'

import InboxZeroScreen from '@/app/inbox-zero'
import { Colors } from '@/constants/Colors'
import { useInboxZero } from '@/hooks/useInboxZero'
import { useTheme } from '@/hooks/useThemeColor'

jest.mock('@/hooks/useInboxZero', () => ({ useInboxZero: jest.fn() }))
jest.mock('@/hooks/useThemeColor', () => ({ useTheme: jest.fn() }))
jest.mock('@react-navigation/native', () => ({ usePreventRemove: jest.fn() }))
jest.mock('@/components/common/ScreenHeader', () => ({
  ScreenHeader: () => null,
}))

const state: ReturnType<typeof useInboxZero> = {
  unavailable: null,
  connected: true,
  busy: null,
  error: null,
  notice: null,
  needsRefresh: false,
  nextPage: 'next',
  messages: [
    {
      id: 'a1',
      sender: 'newsletter@example.com',
      subject: 'Synthetic newsletter',
      unsubscribe: ['https://example.com/unsubscribe'],
    },
    {
      id: 'b2',
      sender: 'newsletter@example.com',
      subject: 'Another synthetic newsletter',
      unsubscribe: [],
    },
  ],
  connect: jest.fn(),
  load: jest.fn(),
  trash: jest.fn(),
  openUnsubscribe: jest.fn(),
  disconnect: jest.fn(),
}
beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(useTheme).mockReturnValue(Colors.light)
  jest.mocked(useInboxZero).mockReturnValue(state)
})

it('requires review and confirmation before a sender batch is moved to Trash', () => {
  render(<InboxZeroScreen />)
  fireEvent.press(
    screen.getByRole('checkbox', {
      name: 'newsletter@example.com, 2 loaded messages',
    }),
  )
  fireEvent.press(
    screen.getByRole('button', { name: 'Review 2 messages for Trash' }),
  )
  expect(state.trash).not.toHaveBeenCalled()
  fireEvent.press(screen.getByRole('button', { name: 'Cancel' }))
  expect(state.trash).not.toHaveBeenCalled()
  fireEvent.press(
    screen.getByRole('button', { name: 'Review 2 messages for Trash' }),
  )
  fireEvent.press(screen.getByRole('button', { name: 'Confirm move to Trash' }))
  expect(state.trash).toHaveBeenCalledWith(['a1', 'b2'])
})

it('reviews the exact external unsubscribe destination and never claims completion', () => {
  render(<InboxZeroScreen />)
  fireEvent.press(
    screen.getByRole('button', { name: 'Review unsubscribe · example.com' }),
  )
  expect(screen.getByText(/https:\/\/example.com\/unsubscribe/)).toBeTruthy()
  expect(state.openUnsubscribe).not.toHaveBeenCalled()
  fireEvent.press(screen.getByRole('button', { name: 'Open page' }))
  expect(state.openUnsubscribe).toHaveBeenCalledWith(
    'https://example.com/unsubscribe',
  )
})

it('shows an honest unavailable state without connecting on unsupported builds', () => {
  jest.mocked(useInboxZero).mockReturnValue({
    ...state,
    unavailable: 'Install a compatible iOS build',
    connected: false,
    messages: [],
  })
  render(<InboxZeroScreen />)
  expect(screen.getByText('Install a compatible iOS build')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Connect Gmail' })).toBeNull()
  expect(state.connect).not.toHaveBeenCalled()
})

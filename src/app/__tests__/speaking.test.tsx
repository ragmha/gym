import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native'
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition'
import { Alert } from 'react-native'

import SpeakingScreen from '@/app/speaking'
import SpeakingHistoryScreen from '@/app/speaking-history'
import { useSpeakingLogStore } from '@/stores/SpeakingLogStore'

const mockHandlers: Record<string, (event?: unknown) => void> = {}

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    isRecognitionAvailable: () => true,
    supportsOnDeviceRecognition: () => true,
    requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
  },
  useSpeechRecognitionEvent: (name: string, handler: () => void) => {
    mockHandlers[name] = handler
  },
}))
jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [null, jest.fn()],
  useMicrophonePermissions: () => [null, jest.fn()],
}))
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }))
jest.mock('expo-file-system', () => ({
  File: jest.fn(),
  Directory: jest.fn(() => ({ exists: false })),
  Paths: { cache: 'cache' },
}))
jest.mock('@/hooks/useThemeColor', () => ({
  useTheme: () =>
    jest.requireActual<typeof import('@/constants/Colors')>(
      '@/constants/Colors',
    ).Colors.dark,
}))

beforeEach(() => useSpeakingLogStore.setState({ sessions: [] }))

describe('SpeakingScreen', () => {
  it('runs a live session from setup through the transcript review', async () => {
    render(<SpeakingScreen />)

    const topic = screen.getByRole('radio', {
      name: 'Why small pull requests win',
    })
    fireEvent.press(topic)
    expect(topic).toHaveProp('accessibilityState', { checked: true })
    fireEvent.press(screen.getByRole('button', { name: 'Mode: Shadow' }))
    fireEvent.press(screen.getByRole('button', { name: 'Length: 5 min' }))
    fireEvent.press(screen.getByRole('button', { name: 'Start' }))

    expect(screen.getByText('Solo · 15 min')).toBeOnTheScreen()
    await waitFor(() =>
      expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledWith(
        expect.objectContaining({ continuous: true, lang: 'en-US' }),
      ),
    )
    act(() =>
      mockHandlers.result({
        isFinal: true,
        results: [{ transcript: 'Um, small PRs get real reviews.' }],
      }),
    )
    expect(
      screen.getByText('Um, small PRs get real reviews.'),
    ).toBeOnTheScreen()

    fireEvent.press(screen.getByRole('button', { name: 'Stop' }))
    expect(ExpoSpeechRecognitionModule.stop).toHaveBeenCalled()
    act(() => mockHandlers.end())

    expect(screen.getByLabelText('Words: 6')).toBeOnTheScreen()
    expect(screen.getByLabelText('Fillers: 1')).toBeOnTheScreen()
    expect(screen.getByTestId('post-mortem')).toBeOnTheScreen()
    expect(useSpeakingLogStore.getState().sessions).toEqual([
      expect.objectContaining({
        topicId: 'small-prs',
        style: 'solo',
        transcript: 'Um, small PRs get real reviews.',
      }),
    ])
    fireEvent.press(screen.getByRole('button', { name: 'Practice again' }))
    expect(screen.getByText('Choose a topic')).toBeOnTheScreen()
    expect(screen.getByTestId('speaking-focus')).toBeOnTheScreen()
    expect(
      screen.getByRole('radio', { name: 'What an AI agent actually is' }),
    ).toHaveProp('accessibilityState', { checked: true })
  })

  it('highlights the script words already read while shadowing', async () => {
    render(<SpeakingScreen />)
    fireEvent.press(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() =>
      expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalled(),
    )

    act(() =>
      mockHandlers.result({
        isFinal: false,
        results: [{ transcript: 'In the, um, next five minutes' }],
      }),
    )

    expect(screen.getByTestId('script-read')).toHaveTextContent(
      'In the next five minutes,',
    )
  })

  it('does not show the foundation talk attribution', () => {
    render(<SpeakingScreen />)

    expect(
      screen.queryByText('Built on Patrick Winston’s How to Speak'),
    ).not.toBeOnTheScreen()
  })
})

describe('SpeakingHistoryScreen', () => {
  it('opens a past post-mortem with its trend and deletes it', () => {
    const base = {
      topicId: 'small-prs',
      style: 'shadow' as const,
      capture: 'live' as const,
      seconds: 60,
    }
    const words = (n: number) => Array(n).fill('point').join(' ')
    useSpeakingLogStore.setState({
      sessions: [
        { ...base, at: '2026-10-18T10:00:00Z', transcript: words(150) },
        { ...base, at: '2026-10-17T10:00:00Z', transcript: words(190) },
      ],
    })
    const alert = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_t, _m, buttons) => buttons?.[1]?.onPress?.())
    render(<SpeakingHistoryScreen />)

    expect(screen.getByText('2 sessions')).toBeOnTheScreen()
    fireEvent.press(screen.getAllByRole('button', { expanded: false })[0])
    expect(screen.getByTestId('post-mortem-trend')).toHaveTextContent(
      'Since last time: fillers 0 → 0 a minute, pace 190 → 150 words a minute.',
    )

    fireEvent.press(screen.getByRole('button', { name: 'Delete' }))
    expect(useSpeakingLogStore.getState().sessions).toHaveLength(1)
    alert.mockRestore()
  })
})

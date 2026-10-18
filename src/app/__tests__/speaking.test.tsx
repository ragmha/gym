import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react-native'
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition'
import { Alert } from 'react-native'

import SpeakingScreen from '@/app/speaking'
import SpeakingHistoryScreen from '@/app/speaking-history'
import { useTranscript } from '@/components/speaking/useTranscript'
import { useSpeakingLogStore } from '@/stores/SpeakingLogStore'

const mockHandlers: Record<string, (event?: unknown) => void> = {}

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    isRecognitionAvailable: () => true,
    supportsOnDeviceRecognition: jest.fn(() => true),
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

const speech = jest.mocked(ExpoSpeechRecognitionModule)
type Permission = Awaited<ReturnType<typeof speech.requestPermissionsAsync>>

beforeEach(() => {
  jest.clearAllMocks()
  useSpeakingLogStore.setState({ sessions: [] })
})
afterEach(() => jest.useRealTimers())

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
        expect.objectContaining({
          continuous: true,
          lang: 'en-US',
          requiresOnDeviceRecognition: true,
        }),
      ),
    )
    act(() => mockHandlers.start())
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

  it('refuses to transcribe without on-device recognition', async () => {
    speech.supportsOnDeviceRecognition.mockReturnValueOnce(false)
    render(<SpeakingScreen />)
    fireEvent.press(screen.getByRole('button', { name: 'Start' }))

    expect(
      await screen.findByText(
        "On-device speech recognition isn't available on this device, so no transcript is made.",
      ),
    ).toBeOnTheScreen()
    expect(speech.requestPermissionsAsync).not.toHaveBeenCalled()
    expect(speech.start).not.toHaveBeenCalled()
  })

  it('keeps the timer stopped when speech permission is denied', async () => {
    jest.useFakeTimers()
    speech.requestPermissionsAsync.mockResolvedValueOnce({
      granted: false,
    } as Permission)
    render(<SpeakingScreen />)
    fireEvent.press(screen.getByRole('button', { name: 'Start' }))

    expect(
      await screen.findByText(/Microphone and speech recognition access/),
    ).toBeOnTheScreen()
    act(() => jest.advanceTimersByTime(3000))
    expect(screen.getByLabelText('5:00 left')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled()
    expect(speech.start).not.toHaveBeenCalled()
  })

  it('keeps the timer stopped when iOS refuses on-device recognition', async () => {
    jest.useFakeTimers()
    render(<SpeakingScreen />)
    fireEvent.press(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(speech.start).toHaveBeenCalled())

    act(() =>
      mockHandlers.error({
        error: 'service-not-allowed',
        message: 'Recognizer is unavailable',
      }),
    )
    act(() => mockHandlers.end())
    act(() => jest.advanceTimersByTime(3000))

    expect(
      screen.getByText(
        "On-device speech recognition isn't available on this device, so no transcript is made.",
      ),
    ).toBeOnTheScreen()
    expect(screen.getByLabelText('5:00 left')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled()
    expect(speech.start).toHaveBeenCalledTimes(1)
  })

  it('does not show the foundation talk attribution', () => {
    render(<SpeakingScreen />)

    expect(
      screen.queryByText('Built on Patrick Winston’s How to Speak'),
    ).not.toBeOnTheScreen()
  })
})

describe('useTranscript', () => {
  it.each(['stop', 'reset', 'unmount'] as const)(
    'never starts recognition after %s during the permission prompt',
    async (cancel) => {
      let grant!: (value: Permission) => void
      speech.requestPermissionsAsync.mockReturnValueOnce(
        new Promise<Permission>((resolve) => {
          grant = resolve
        }),
      )
      const { result, unmount } = renderHook(() => useTranscript())
      let started!: Promise<boolean>
      act(() => {
        started = result.current.start({ continuous: true }, true)
      })

      if (cancel === 'unmount') unmount()
      else act(() => result.current[cancel]())
      await act(async () => grant({ granted: true } as Permission))

      await expect(started).resolves.toBe(false)
      expect(speech.start).not.toHaveBeenCalled()
    },
  )
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

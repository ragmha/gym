import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native'
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition'
import { Alert, Linking } from 'react-native'

import SpeakingScreen from '@/app/speaking'

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
    fireEvent.press(screen.getByRole('button', { name: 'Practice again' }))
    expect(screen.getByText('Choose a topic')).toBeOnTheScreen()
  })

  it('opens the foundation talk and explains a failed launch', async () => {
    const openURL = jest
      .spyOn(Linking, 'openURL')
      .mockRejectedValue(new Error('app missing'))
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    render(<SpeakingScreen />)

    fireEvent.press(screen.getByRole('link'))

    expect(openURL).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=Unzc731iCUY',
    )
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        "Couldn't open YouTube",
        'Check that the app is installed or the link is available, then try again.',
      ),
    )
    alert.mockRestore()
    openURL.mockRestore()
  })
})

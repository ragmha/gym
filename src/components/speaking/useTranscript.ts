import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionOptions,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'

const PERMISSION_COPY =
  'Microphone and speech recognition access are off. Turn them on in Settings to see your transcript.'

const IGNORED_ERRORS = new Set(['no-speech', 'aborted'])

/**
 * Transcribes the microphone (`keepAlive` restarts recognition when the
 * platform ends it mid-talk) or a recorded file via `audioSource`. The text
 * lives in React state; SessionReview saves finished sessions on the device.
 */
export function useTranscript() {
  const [finalText, setFinalText] = useState('')
  const [interim, setInterim] = useState('')
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const interimRef = useRef('')
  const session = useRef<{
    options: ExpoSpeechRecognitionOptions
    keepAlive: boolean
  } | null>(null)

  const commit = useCallback((text: string) => {
    const trimmed = text.trim()
    if (trimmed) setFinalText((prev) => (prev ? `${prev} ${trimmed}` : trimmed))
    interimRef.current = ''
    setInterim('')
  }, [])

  useSpeechRecognitionEvent('result', ({ isFinal, results }) => {
    const text = results[0]?.transcript ?? ''
    if (isFinal) commit(text)
    else {
      interimRef.current = text
      setInterim(text)
    }
  })

  useSpeechRecognitionEvent('end', () => {
    commit(interimRef.current)
    if (session.current?.keepAlive) {
      ExpoSpeechRecognitionModule.start(session.current.options)
    } else {
      setListening(false)
    }
  })

  useSpeechRecognitionEvent('error', ({ error: code, message }) => {
    if (IGNORED_ERRORS.has(code)) return
    if (session.current) session.current.keepAlive = false
    // 'end' is not guaranteed after a failed start.
    setListening(false)
    setError(message || 'Speech recognition stopped unexpectedly.')
  })

  const start = useCallback(
    async (
      options: Omit<ExpoSpeechRecognitionOptions, 'lang'>,
      keepAlive = false,
    ) => {
      setError(null)
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        setError('Speech recognition is not available on this device.')
        return
      }
      if (Platform.OS !== 'web') {
        const { granted } =
          await ExpoSpeechRecognitionModule.requestPermissionsAsync()
        if (!granted) {
          setError(PERMISSION_COPY)
          return
        }
      }
      const full: ExpoSpeechRecognitionOptions = {
        lang: 'en-US',
        addsPunctuation: true,
        // Server recognition on iOS cuts off after about a minute.
        requiresOnDeviceRecognition:
          Platform.OS === 'ios' &&
          ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
        ...options,
      }
      session.current = { options: full, keepAlive }
      setListening(true)
      ExpoSpeechRecognitionModule.start(full)
    },
    [],
  )

  const stop = useCallback(() => {
    if (session.current) session.current.keepAlive = false
    ExpoSpeechRecognitionModule.stop()
  }, [])

  const reset = useCallback(() => {
    session.current = null
    ExpoSpeechRecognitionModule.abort()
    interimRef.current = ''
    setFinalText('')
    setInterim('')
    setListening(false)
    setError(null)
  }, [])

  useEffect(
    () => () => {
      session.current = null
      ExpoSpeechRecognitionModule.abort()
    },
    [],
  )

  return { finalText, interim, listening, error, start, stop, reset }
}

export type Transcript = ReturnType<typeof useTranscript>

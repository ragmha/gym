import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionOptions,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'

const PERMISSION_COPY =
  'Microphone and speech recognition access are off. Turn them on in Settings to see your transcript.'
const ON_DEVICE_COPY =
  "On-device speech recognition isn't available on this device, so no transcript is made."

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
  const generation = useRef(0)
  const session = useRef<{
    options: ExpoSpeechRecognitionOptions
    keepAlive: boolean
  } | null>(null)
  // Settles on the 'end' of the native session started last; null once idle.
  const ended = useRef<Promise<void> | null>(null)
  const settle = useRef(() => {})

  const commit = useCallback((text: string) => {
    const trimmed = text.trim()
    if (trimmed) setFinalText((prev) => (prev ? `${prev} ${trimmed}` : trimmed))
    interimRef.current = ''
    setInterim('')
  }, [])

  useSpeechRecognitionEvent('result', ({ isFinal, results }) => {
    // Late results from a reset session.
    if (!session.current) return
    const text = results[0]?.transcript ?? ''
    if (isFinal) commit(text)
    else {
      interimRef.current = text
      setInterim(text)
    }
  })

  useSpeechRecognitionEvent('end', () => {
    settle.current()
    ended.current = null
    commit(interimRef.current)
    if (session.current?.keepAlive) {
      ended.current = new Promise((resolve) => {
        settle.current = resolve
      })
      ExpoSpeechRecognitionModule.start(session.current.options)
    } else {
      setListening(false)
    }
  })

  useSpeechRecognitionEvent('error', ({ error: code, message }) => {
    if (IGNORED_ERRORS.has(code)) return
    if (session.current) session.current.keepAlive = false
    setListening(false)
    setError(
      // iOS fails closed with this code when en-US can't run on the device.
      code === 'service-not-allowed' && Platform.OS !== 'web'
        ? ON_DEVICE_COPY
        : message || 'Speech recognition stopped unexpectedly.',
    )
  })

  const start = useCallback(
    async (
      options: Omit<ExpoSpeechRecognitionOptions, 'lang'>,
      keepAlive = false,
    ): Promise<boolean> => {
      const gen = ++generation.current
      setError(null)
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        setError('Speech recognition is not available on this device.')
        return false
      }
      const native = Platform.OS !== 'web'
      if (native) {
        if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) {
          setError(ON_DEVICE_COPY)
          return false
        }
        const { granted } =
          await ExpoSpeechRecognitionModule.requestPermissionsAsync()
        // stop(), reset(), or unmount ran while the prompt was open.
        if (gen !== generation.current) return false
        if (!granted) {
          setError(PERMISSION_COPY)
          return false
        }
      }
      // A reset session's 'end' must land before this one starts, or it
      // would restart or finish the new session.
      await ended.current
      if (gen !== generation.current) return false
      const full: ExpoSpeechRecognitionOptions = {
        lang: 'en-US',
        addsPunctuation: true,
        ...options,
        // Native transcripts must never leave the device.
        requiresOnDeviceRecognition: native,
      }
      session.current = { options: full, keepAlive }
      setListening(true)
      ended.current = new Promise((resolve) => {
        settle.current = resolve
      })
      ExpoSpeechRecognitionModule.start(full)
      return true
    },
    [],
  )

  const stop = useCallback(() => {
    generation.current++
    if (session.current) session.current.keepAlive = false
    ExpoSpeechRecognitionModule.stop()
  }, [])

  const reset = useCallback(() => {
    generation.current++
    session.current = null
    // iOS emits 'end' even for an idle abort; only abort a running session.
    if (ended.current) ExpoSpeechRecognitionModule.abort()
    interimRef.current = ''
    setFinalText('')
    setInterim('')
    setListening(false)
    setError(null)
  }, [])

  useEffect(
    () => () => {
      generation.current++
      session.current = null
      ExpoSpeechRecognitionModule.abort()
    },
    [],
  )

  return { finalText, interim, listening, error, start, stop, reset }
}

export type Transcript = ReturnType<typeof useTranscript>

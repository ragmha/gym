import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from 'expo-camera'
import { Directory, File, Paths } from 'expo-file-system'
import { useKeepAwake } from 'expo-keep-awake'
import { useSpeechRecognitionEvent } from 'expo-speech-recognition'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import { followScript, normalizeWord } from '@/lib/speaking/follow'
import type { SpeakingTopic } from '@/lib/speaking/scripts'

import { SpeakingButton } from './SpeakingButton'
import type { Transcript } from './useTranscript'

export type SpeakingStyle = 'shadow' | 'solo'
export type Capture = 'live' | 'video'
export type SessionResult = { seconds: number; videoUri?: string }

export function deleteVideo(uri: string) {
  try {
    new File(uri).delete()
  } catch {
    // Already gone; the OS also clears the cache directory.
  }
}

// expo-camera records into Caches/Camera. A recording cut off by leaving the
// screen or a crash never returns its path, so clear the folder wholesale.
export function clearRecordings() {
  try {
    const folder = new Directory(Paths.cache, 'Camera')
    if (folder.exists) folder.delete()
  } catch {
    // Nothing to clear.
  }
}

// onCameraReady fires before mode="video" attaches the movie output and mic
// (expo/expo#27528), so give the session a moment before recording.
const RECORD_SETTLE_MS = 600

function clock(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function SpeakingSession({
  topic,
  style,
  minutes,
  capture,
  transcript,
  onFinish,
}: {
  topic: SpeakingTopic
  style: SpeakingStyle
  minutes: number
  capture: Capture
  transcript: Transcript
  onFinish: (result: SessionResult) => void
}) {
  useKeepAwake()
  const theme = useTheme()
  const total = minutes * 60
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef<number | null>(null)
  const stopped = useRef(false)
  const mounted = useRef(true)
  const camera = useRef<CameraView>(null)
  const transcriptView = useRef<ScrollView>(null)
  const scriptView = useRef<ScrollView>(null)
  const paragraphY = useRef<number[]>([])
  const [cameraPermission, requestCamera] = useCameraPermissions()
  const [micPermission, requestMic] = useMicrophonePermissions()

  const paragraphs = useMemo(() => {
    let start = 0
    return topic.paragraphs.map((text) => {
      const words = text.split(/\s+/)
      const paragraph = { words, start }
      start += words.length
      return paragraph
    })
  }, [topic])
  const scriptWords = useMemo(
    () => paragraphs.flatMap(({ words }) => words.map(normalizeWord)),
    [paragraphs],
  )
  // Live shadowing highlights the words already read.
  const following = style === 'shadow' && capture === 'live'
  const read = following
    ? followScript(scriptWords, `${transcript.finalText} ${transcript.interim}`)
    : 0
  const currentParagraph = paragraphs.findLastIndex(
    ({ start }) => start <= read,
  )
  useEffect(() => {
    if (!following) return
    const y = paragraphY.current[currentParagraph]
    if (y !== undefined) scriptView.current?.scrollTo({ y, animated: true })
  }, [following, currentParagraph])

  const begin = useCallback(() => {
    startedRef.current = Date.now()
    setStartedAt(startedRef.current)
  }, [])
  const elapsed = () =>
    startedRef.current
      ? Math.min(total, Math.round((Date.now() - startedRef.current) / 1000))
      : 0

  // Time only real listening: the native start event never fires for the
  // permission prompt or a failed (e.g. on-device unavailable) start.
  useSpeechRecognitionEvent('start', () => {
    if (capture === 'live' && !startedRef.current && !stopped.current) begin()
  })

  useEffect(() => {
    mounted.current = true
    if (capture === 'live') {
      transcript.start(
        { interimResults: true, continuous: true, iosTaskHint: 'dictation' },
        true,
      )
    }
    return () => {
      mounted.current = false
    }
    // Start once per session; the transcript functions are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (capture !== 'video') return
    if (
      cameraPermission &&
      !cameraPermission.granted &&
      cameraPermission.canAskAgain
    )
      requestCamera()
    else if (
      micPermission &&
      !micPermission.granted &&
      micPermission.canAskAgain
    )
      requestMic()
  }, [capture, cameraPermission, micPermission, requestCamera, requestMic])

  const record = () => {
    if (startedRef.current || stopped.current || !camera.current) return
    begin()
    camera.current
      .recordAsync({ maxDuration: total + 5 })
      .then((video) => {
        if (!mounted.current) {
          if (video) deleteVideo(video.uri)
        } else if (video?.uri) {
          onFinish({ seconds: elapsed(), videoUri: video.uri })
        } else {
          setError('The recording could not be saved. Go back and try again.')
        }
      })
      .catch(() => {
        if (mounted.current)
          setError('The recording could not be saved. Go back and try again.')
      })
  }

  const stop = () => {
    if (stopped.current) return
    stopped.current = true
    if (capture === 'live') {
      transcript.stop()
      onFinish({ seconds: elapsed() })
    } else {
      // recordAsync resolves with the file and calls onFinish.
      camera.current?.stopRecording()
    }
  }

  useEffect(() => {
    if (!startedAt) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [startedAt])

  const remaining = startedAt
    ? Math.max(0, total - Math.floor((now - startedAt) / 1000))
    : total

  useEffect(() => {
    if (startedAt && remaining === 0) stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, startedAt])

  const muted = { color: theme.subtitleText }
  const cameraReady = cameraPermission?.granted && micPermission?.granted
  const permissionDenied =
    (cameraPermission &&
      !cameraPermission.granted &&
      !cameraPermission.canAskAgain) ||
    (micPermission && !micPermission.granted && !micPermission.canAskAgain)
  const message =
    error ??
    transcript.error ??
    (capture === 'video' && permissionDenied
      ? 'Camera and microphone access are off. Turn them on in Settings to record.'
      : null)

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <View style={styles.timer}>
          <Text
            accessibilityLabel={`${clock(remaining)} left`}
            style={[Typography.displayMd, { color: theme.text }]}
          >
            {clock(remaining)}
          </Text>
          <Text style={[Typography.bodySm, muted]}>
            {capture === 'video'
              ? startedAt
                ? 'Recording · look at the lens'
                : 'Starting camera…'
              : startedAt
                ? 'Listening · pause instead of a filler'
                : 'Starting microphone…'}
          </Text>
        </View>
      </View>

      {capture === 'video' && cameraReady ? (
        <CameraView
          ref={camera}
          style={styles.camera}
          facing="front"
          mode="video"
          onCameraReady={() => setTimeout(record, RECORD_SETTLE_MS)}
        />
      ) : null}

      {capture === 'live' ? (
        <ScrollView
          testID="live-transcript"
          style={[styles.transcript, { backgroundColor: theme.homeSurface }]}
          contentContainerStyle={styles.transcriptContent}
          ref={transcriptView}
          onContentSizeChange={() =>
            transcriptView.current?.scrollToEnd({ animated: false })
          }
        >
          <Text style={[Typography.bodyMd, { color: theme.text }]}>
            {transcript.finalText}
            {transcript.interim ? (
              <Text style={[Typography.bodyMd, muted]}>
                {transcript.finalText ? ' ' : ''}
                {transcript.interim}
              </Text>
            ) : null}
            {!transcript.finalText && !transcript.interim ? (
              <Text style={[Typography.bodyMd, muted]}>
                Your words appear here as you speak.
              </Text>
            ) : null}
          </Text>
        </ScrollView>
      ) : null}

      {message ? (
        <Text
          accessibilityRole="alert"
          style={[Typography.bodyMd, { color: theme.danger }]}
        >
          {message}
        </Text>
      ) : null}

      <ScrollView
        ref={scriptView}
        style={styles.script}
        contentContainerStyle={styles.scriptContent}
      >
        <Text
          accessibilityRole="header"
          style={[Typography.headingMd, { color: theme.text }]}
        >
          {topic.title}
        </Text>
        {style === 'shadow' ? (
          <>
            <Text style={[Typography.bodySm, muted]}>
              Read aloud at a steady pace. Pause at every full stop.
              {minutes > 5
                ? ' The script runs about 5 minutes; when you finish, start again and drift further from the words each pass.'
                : ''}
            </Text>
            {paragraphs.map(({ words, start }, index) => {
              const done = Math.min(words.length, Math.max(0, read - start))
              return (
                <Text
                  key={start}
                  onLayout={(e) => {
                    paragraphY.current[index] = e.nativeEvent.layout.y
                  }}
                  style={[
                    Typography.bodyLg,
                    styles.paragraph,
                    { color: theme.text },
                  ]}
                >
                  {done ? (
                    <Text
                      testID="script-read"
                      style={[
                        Typography.bodyLg,
                        styles.paragraph,
                        { color: theme.accent },
                        styles.read,
                      ]}
                    >
                      {words.slice(0, done).join(' ')}
                    </Text>
                  ) : null}
                  {done && done < words.length ? ' ' : ''}
                  {words.slice(done).join(' ')}
                </Text>
              )
            })}
          </>
        ) : (
          <>
            <Text style={[Typography.bodySm, muted]}>
              No script. Open with a promise, cycle these three points, and
              close on what they now know.
            </Text>
            {topic.points.map((point, index) => (
              <View key={point} style={styles.point}>
                <Text style={[Typography.headingMd, { color: theme.accent }]}>
                  {index + 1}
                </Text>
                <Text
                  style={[
                    Typography.headingSm,
                    styles.flex,
                    { color: theme.text },
                  ]}
                >
                  {point}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      <SpeakingButton
        label="Stop"
        icon="stop"
        primary
        disabled={!startedAt}
        onPress={stop}
        hint="Ends the session and shows your transcript."
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: Spacing.md },
  bar: { alignItems: 'center' },
  timer: { alignItems: 'center' },
  camera: { height: 240, borderRadius: Radii.lg, overflow: 'hidden' },
  transcript: { maxHeight: 140, borderRadius: Radii.lg },
  transcriptContent: { padding: Spacing.md },
  script: { flex: 1 },
  scriptContent: { gap: Spacing.md, paddingBottom: Spacing.xxxl },
  paragraph: { lineHeight: 28 },
  read: { textDecorationLine: 'underline' },
  point: { flexDirection: 'row', gap: Spacing.sm },
  flex: { flex: 1 },
})

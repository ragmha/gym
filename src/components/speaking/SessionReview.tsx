import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
import { Alert, Share, StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import { postMortem } from '@/lib/speaking/analyze'
import {
  type SpeakingLog,
  useSpeakingLogStore,
} from '@/stores/SpeakingLogStore'

import { PostMortemCard } from './PostMortemCard'
import { SpeakingButton } from './SpeakingButton'
import { type SessionResult, deleteVideo } from './SpeakingSession'
import type { Transcript } from './useTranscript'

// Winston's heuristics the transcript can't measure; the post-mortem scores
// the rest.
const CHECKLIST = [
  'Cycle the core idea three times.',
  'Build a fence: say how your idea differs from similar ones.',
  'Verbal punctuation: mark where you are and what comes next.',
  'Eyes on the lens, body still.',
]

export function SessionReview({
  session,
  result,
  transcript,
  onAgain,
}: {
  session: Omit<SpeakingLog, 'seconds' | 'transcript'>
  result: SessionResult
  transcript: Transcript
  onAgain: () => void
}) {
  const theme = useTheme()
  const save = useSpeakingLogStore((state) => state.save)
  const previousLog = useSpeakingLogStore((state) =>
    state.sessions.find(
      (s) =>
        s.at !== session.at &&
        s.topicId === session.topicId &&
        s.style === session.style,
    ),
  )
  const [video, setVideo] = useState(result.videoUri)
  const [shared, setShared] = useState(false)
  const videoRef = useRef(video)
  useEffect(() => {
    videoRef.current = video
  }, [video])

  useEffect(() => {
    if (result.videoUri) {
      transcript.start({ audioSource: { uri: result.videoUri } })
    }
    return () => {
      if (videoRef.current) deleteVideo(videoRef.current)
    }
    // Transcribe once per recording; the transcript functions are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.videoUri])

  const text = [transcript.finalText, transcript.interim]
    .filter(Boolean)
    .join(' ')
  const stats = postMortem(text, result.seconds, session.style)
  const previous =
    previousLog &&
    postMortem(previousLog.transcript, previousLog.seconds, previousLog.style)
  const done = !transcript.listening && Boolean(text)

  useEffect(() => {
    if (done) save({ ...session, seconds: result.seconds, transcript: text })
    // Save once recognition settles; session and result are fixed per review.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, text])
  const muted = { color: theme.subtitleText }

  const upload = async () => {
    if (!video) return
    try {
      const outcome = await Share.share({ url: video })
      if (outcome.action === Share.sharedAction) setShared(true)
    } catch {
      Alert.alert(
        "Couldn't open the share sheet",
        'Try again, or discard this video.',
      )
    }
  }

  const discard = () =>
    Alert.alert('Discard this video?', 'It is removed from this device.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          if (video) deleteVideo(video)
          setVideo(undefined)
        },
      },
    ])

  const minutes = Math.floor(result.seconds / 60)
  const seconds = result.seconds % 60
  const tiles = [
    ['Time', `${minutes}:${String(seconds).padStart(2, '0')}`],
    ['Words', String(stats.words)],
    ['Words/min', String(stats.wordsPerMinute)],
    ['Fillers', String(stats.fillerTotal)],
  ]

  return (
    <View style={styles.container}>
      {transcript.listening ? null : (
        <View style={styles.stats}>
          {tiles.map(([label, value]) => (
            <View
              key={label}
              accessible
              accessibilityLabel={`${label}: ${value}`}
              style={[styles.stat, { backgroundColor: theme.homeSurface }]}
            >
              <Text style={[Typography.numericMd, { color: theme.text }]}>
                {value}
              </Text>
              <Text style={[Typography.labelSm, muted]}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.card, { backgroundColor: theme.homeSurface }]}>
        <Text
          accessibilityRole="header"
          style={[Typography.headingMd, { color: theme.text }]}
        >
          Your words
        </Text>
        {transcript.error ? (
          <Text
            accessibilityRole="alert"
            style={[Typography.bodyMd, { color: theme.danger }]}
          >
            {transcript.error}
          </Text>
        ) : null}
        <Text
          testID="review-transcript"
          style={[Typography.bodyLg, { color: theme.text }]}
        >
          {text ||
            (transcript.listening
              ? result.videoUri
                ? 'Transcribing your recording on this device…'
                : 'Finishing…'
              : 'No speech was recognised.')}
        </Text>
        {stats.fillers.length ? (
          <Text style={[Typography.bodyMd, { color: theme.text }]}>
            Fillers:{' '}
            {stats.fillers.map((f) => `${f.word} ×${f.count}`).join(', ')}
          </Text>
        ) : null}
        <Text style={[Typography.bodySm, muted]}>
          Speech recognition often drops “um” and “uh”, so{' '}
          {result.videoUri ? 'watch' : 'listen'} back for those.
        </Text>
      </View>

      {done ? <PostMortemCard report={stats} previous={previous} /> : null}

      {result.videoUri ? (
        <View style={styles.actions}>
          {video ? (
            <>
              <SpeakingButton
                label="Upload to YouTube…"
                icon="logo-youtube"
                primary
                onPress={upload}
                hint="Opens the share sheet. Choose YouTube and set visibility to Private."
              />
              <Text style={[Typography.bodySm, muted]}>
                {shared
                  ? 'Sent. Check YouTube shows it as Private.'
                  : 'In YouTube, set visibility to Private. The video is deleted from this app when you leave.'}
              </Text>
              <SpeakingButton
                label="Discard video"
                icon="trash-outline"
                onPress={discard}
                disabled={transcript.listening}
              />
            </>
          ) : (
            <Text style={[Typography.bodyMd, muted]}>Video discarded.</Text>
          )}
        </View>
      ) : null}

      <View style={styles.actions}>
        <SpeakingButton
          label="Practice again"
          icon="refresh"
          primary={!video}
          onPress={onAgain}
          disabled={transcript.listening}
        />
      </View>

      <View style={styles.section}>
        <Text
          accessibilityRole="header"
          style={[Typography.headingMd, { color: theme.text }]}
        >
          Watch back for
        </Text>
        {CHECKLIST.map((item) => (
          <View key={item} style={styles.row}>
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={theme.accent}
            />
            <Text
              style={[Typography.bodyMd, styles.flex, { color: theme.text }]}
            >
              {item}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xl },
  stats: { flexDirection: 'row', gap: Spacing.sm },
  stat: {
    flex: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  card: { borderRadius: Radii.lg, padding: Spacing.lg, gap: Spacing.sm },
  actions: { gap: Spacing.sm },
  section: { gap: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.sm },
  flex: { flex: 1 },
})

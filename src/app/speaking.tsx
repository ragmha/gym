import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader } from '@/components/common/ScreenHeader'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Orb } from '@/components/speaking/Orb'
import { SessionReview } from '@/components/speaking/SessionReview'
import { SpeakingButton } from '@/components/speaking/SpeakingButton'
import {
  type Capture,
  type SessionResult,
  SpeakingSession,
  type SpeakingStyle,
  clearRecordings,
} from '@/components/speaking/SpeakingSession'
import { useTranscript } from '@/components/speaking/useTranscript'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import { postMortem } from '@/lib/speaking/analyze'
import { TOPICS } from '@/lib/speaking/scripts'
import { useSpeakingLogStore } from '@/stores/SpeakingLogStore'

// Recording needs the iOS camera; transcribing a file is not available on web.
const VIDEO_AVAILABLE = Platform.OS === 'ios'

function Toggle({
  label,
  value,
  next,
  onPress,
  disabled,
}: {
  label: string
  value: string
  next: string
  onPress: () => void
  disabled?: boolean
}) {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint={disabled ? next : `Switches to ${next}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toggle,
        { backgroundColor: theme.homeSurface, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[Typography.labelLg, { color: theme.text }]}>{value}</Text>
      {disabled ? null : (
        <Ionicons name="swap-horizontal" size={14} color={theme.subtitleText} />
      )}
    </Pressable>
  )
}

export default function SpeakingScreen() {
  const theme = useTheme()
  const transcript = useTranscript()
  const [index, setIndex] = useState(0)
  const [pageWidth, setPageWidth] = useState(0)
  const pager = useRef<ScrollView>(null)
  const [style, setStyle] = useState<SpeakingStyle>('shadow')
  const [minutes, setMinutes] = useState(5)
  const [capture, setCapture] = useState<Capture>('live')
  const [phase, setPhase] = useState<'setup' | 'session' | 'review'>('setup')
  const [result, setResult] = useState<SessionResult | null>(null)
  const [startedAt, setStartedAt] = useState('')
  const router = useRouter()
  const last = useSpeakingLogStore((state) => state.sessions[0])
  const topic = TOPICS[index]
  const muted = { color: theme.subtitleText }

  useEffect(() => {
    if (!VIDEO_AVAILABLE) return
    clearRecordings()
    return clearRecordings
  }, [])

  const start = () => {
    transcript.reset()
    setResult(null)
    setStartedAt(new Date().toISOString())
    setPhase('session')
  }
  const again = () => {
    transcript.reset()
    setResult(null)
    setPhase('setup')
  }
  const select = (next: number) => {
    setIndex(next)
    pager.current?.scrollTo({ x: next * pageWidth, animated: true })
  }

  return (
    <SafeAreaView
      testID="speaking-screen"
      style={[styles.container, { backgroundColor: theme.homeBackground }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <ScreenHeader
        title={phase === 'setup' ? 'Choose a topic' : topic.title}
        subtitle={
          phase === 'setup'
            ? undefined
            : `${style === 'shadow' ? 'Shadow' : 'Solo'} · ${minutes} min`
        }
        action={
          phase === 'setup' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Post-mortems"
              accessibilityHint="Shows your past sessions and their feedback."
              onPress={() => router.push('/speaking-history')}
              hitSlop={8}
              style={[styles.icon, { backgroundColor: theme.cardSurface }]}
            >
              <Ionicons name="time-outline" size={22} color={theme.text} />
            </Pressable>
          ) : undefined
        }
      />
      {phase === 'session' ? (
        <View style={[styles.content, styles.fill]}>
          <SpeakingSession
            topic={topic}
            style={style}
            minutes={minutes}
            capture={capture}
            transcript={transcript}
            onFinish={(next) => {
              setResult(next)
              setPhase('review')
            }}
          />
        </View>
      ) : phase === 'review' && result ? (
        <ScrollView contentContainerStyle={styles.content}>
          <SessionReview
            session={{ at: startedAt, topicId: topic.id, style, capture }}
            result={result}
            transcript={transcript}
            onAgain={again}
          />
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>
          <View
            style={styles.fill}
            onLayout={(e) => setPageWidth(e.nativeEvent.layout.width)}
          >
            {pageWidth ? (
              <ScrollView
                ref={pager}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={32}
                onScroll={(e) => {
                  const next = Math.round(
                    e.nativeEvent.contentOffset.x / pageWidth,
                  )
                  if (next !== index && TOPICS[next]) setIndex(next)
                }}
              >
                {TOPICS.map((item, i) => (
                  <View
                    key={item.id}
                    style={[styles.page, { width: pageWidth }]}
                  >
                    {/* Only nearby pages draw their ~1,300 dots. */}
                    {Math.abs(i - index) <= 1 ? (
                      <Orb colors={item.colors} size={260} />
                    ) : (
                      <View style={styles.orb} />
                    )}
                    <Text
                      accessibilityRole="header"
                      style={[
                        Typography.headingLg,
                        styles.center,
                        { color: theme.text },
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text style={[Typography.bodyMd, styles.center, muted]}>
                      {item.tagline}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>

          <View accessibilityRole="radiogroup" style={styles.dots}>
            {TOPICS.map((item, i) => (
              <Pressable
                key={item.id}
                accessibilityRole="radio"
                accessibilityLabel={item.title}
                accessibilityState={{ checked: i === index }}
                onPress={() => select(i)}
                hitSlop={8}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i === index ? theme.text : theme.subtitleText,
                    opacity: i === index ? 1 : 0.4,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.toggles}>
            <Toggle
              label="Mode"
              value={style === 'shadow' ? 'Shadow' : 'Solo'}
              next={style === 'shadow' ? 'Solo' : 'Shadow'}
              onPress={() => setStyle(style === 'shadow' ? 'solo' : 'shadow')}
            />
            <Toggle
              label="Length"
              value={`${minutes} min`}
              next={`${minutes === 5 ? 15 : 5} min`}
              onPress={() => setMinutes(minutes === 5 ? 15 : 5)}
            />
            <Toggle
              label="Capture"
              value={capture === 'live' ? 'Live' : 'Video'}
              next={
                VIDEO_AVAILABLE
                  ? capture === 'live'
                    ? 'Video'
                    : 'Live'
                  : 'Video needs the iOS app'
              }
              disabled={!VIDEO_AVAILABLE}
              onPress={() => setCapture(capture === 'live' ? 'video' : 'live')}
            />
          </View>
          <Text style={[Typography.bodySm, styles.center, muted]}>
            {style === 'shadow'
              ? 'Read the script aloud'
              : 'Speak from three points, no script'}
            {' · '}
            {capture === 'live'
              ? 'see your words as you speak'
              : 'record, then choose to upload'}
          </Text>

          {last ? (
            <Text
              testID="speaking-focus"
              style={[Typography.bodySm, styles.center, { color: theme.text }]}
            >
              <Text style={[Typography.bodySm, { color: theme.accent }]}>
                Focus:{' '}
              </Text>
              {postMortem(last.transcript, last.seconds, last.style).focus}
            </Text>
          ) : null}
          <SpeakingButton
            label="Start"
            icon={capture === 'video' ? 'videocam' : 'mic'}
            primary
            onPress={start}
          />
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.gutter,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  fill: { flex: 1 },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  center: { textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  orb: { width: 260, height: 260 },
  icon: {
    width: Layout.controlSize,
    height: Layout.controlSize,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggles: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    minHeight: 40,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
  },
})

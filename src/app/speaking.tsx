import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
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
import { TOPICS } from '@/lib/speaking/scripts'

const WINSTON_URL = 'https://www.youtube.com/watch?v=Unzc731iCUY'

// Recording needs the iOS camera; transcribing a file is not available on web.
const VIDEO_AVAILABLE = Platform.OS === 'ios'

function openWinston() {
  Linking.openURL(WINSTON_URL).catch(() => {
    Alert.alert(
      "Couldn't open YouTube",
      'Check that the app is installed or the link is available, then try again.',
    )
  })
}

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
                {TOPICS.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.page, { width: pageWidth }]}
                  >
                    <Orb colors={item.colors} size={220} id={item.id} />
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

          <SpeakingButton
            label="Start"
            icon={capture === 'video' ? 'videocam' : 'mic'}
            primary
            onPress={start}
          />
          <Pressable
            accessibilityRole="link"
            accessibilityHint="Opens Patrick Winston's MIT lecture on YouTube."
            onPress={openWinston}
            hitSlop={8}
          >
            <Text style={[Typography.bodySm, styles.center, muted]}>
              Built on Patrick Winston’s How to Speak
            </Text>
          </Pressable>
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

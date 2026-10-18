import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader } from '@/components/common/ScreenHeader'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { PostMortemCard } from '@/components/speaking/PostMortemCard'
import { SpeakingButton } from '@/components/speaking/SpeakingButton'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import { postMortem } from '@/lib/speaking/analyze'
import { TOPICS } from '@/lib/speaking/scripts'
import {
  type SpeakingLog,
  useSpeakingLogStore,
} from '@/stores/SpeakingLogStore'

const titleOf = (id: string) => TOPICS.find((t) => t.id === id)?.title ?? id

function Entry({
  log,
  previous,
}: {
  log: SpeakingLog
  previous?: SpeakingLog
}) {
  const theme = useTheme()
  const remove = useSpeakingLogStore((state) => state.remove)
  const [open, setOpen] = useState(false)
  const report = postMortem(log.transcript, log.seconds, log.style)
  const muted = { color: theme.subtitleText }
  const date = new Date(log.at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  const length = `${Math.floor(log.seconds / 60)}:${String(
    log.seconds % 60,
  ).padStart(2, '0')}`

  const confirmDelete = () =>
    Alert.alert('Delete this post-mortem?', 'Its transcript is removed too.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(log.at) },
    ])

  return (
    <View style={[styles.entry, { backgroundColor: theme.homeSurface }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${titleOf(log.topicId)}, ${date}`}
        onPress={() => setOpen(!open)}
        style={styles.summary}
      >
        <View style={styles.flex}>
          <Text style={[Typography.labelLg, { color: theme.text }]}>
            {titleOf(log.topicId)}
          </Text>
          <Text style={[Typography.bodySm, muted]}>
            {date} · {log.style === 'shadow' ? 'Shadow' : 'Solo'} · {length}
          </Text>
          <Text style={[Typography.bodySm, muted]}>
            {report.wordsPerMinute} words/min · {report.fillersPerMinute}{' '}
            fillers/min · {report.checks.filter((c) => c.pass).length}/
            {report.checks.length} checks
          </Text>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.subtitleText}
        />
      </Pressable>
      {open ? (
        <View style={styles.detail}>
          <PostMortemCard
            report={report}
            previous={
              previous &&
              postMortem(previous.transcript, previous.seconds, previous.style)
            }
          />
          <Text style={[Typography.bodyMd, { color: theme.text }]}>
            {log.transcript}
          </Text>
          <SpeakingButton
            label="Delete"
            icon="trash-outline"
            onPress={confirmDelete}
          />
        </View>
      ) : null}
    </View>
  )
}

export default function SpeakingHistoryScreen() {
  const theme = useTheme()
  const sessions = useSpeakingLogStore((state) => state.sessions)
  return (
    <SafeAreaView
      testID="speaking-history-screen"
      style={[styles.container, { backgroundColor: theme.homeBackground }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <ScreenHeader
        title="Post-mortems"
        subtitle={`${sessions.length} ${
          sessions.length === 1 ? 'session' : 'sessions'
        }`}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {sessions.length ? (
          sessions.map((log, i) => (
            <Entry
              key={log.at}
              log={log}
              previous={sessions
                .slice(i + 1)
                .find(
                  (s) => s.topicId === log.topicId && s.style === log.style,
                )}
            />
          ))
        ) : (
          <Text style={[Typography.bodyMd, { color: theme.subtitleText }]}>
            Finish a session and its post-mortem appears here. Everything stays
            on this device.
          </Text>
        )}
      </ScrollView>
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
    gap: Spacing.md,
  },
  entry: { borderRadius: Radii.lg, padding: Spacing.lg, gap: Spacing.md },
  summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1, gap: Spacing.xxs },
  detail: { gap: Spacing.md },
})

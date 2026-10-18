import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import type { PostMortem } from '@/lib/speaking/analyze'

export function PostMortemCard({
  report,
  previous,
}: {
  report: PostMortem
  /** The last session on the same topic and mode, for a before/after. */
  previous?: PostMortem
}) {
  const theme = useTheme()
  const muted = { color: theme.subtitleText }
  return (
    <View
      testID="post-mortem"
      style={[styles.card, { backgroundColor: theme.homeSurface }]}
    >
      <Text
        accessibilityRole="header"
        style={[Typography.headingMd, { color: theme.text }]}
      >
        Post-mortem
      </Text>
      {report.checks.map((check) => (
        <View
          key={check.id}
          accessible
          accessibilityLabel={`${check.label}, ${
            check.pass ? 'passed' : 'missed'
          }: ${check.detail}`}
          style={styles.row}
        >
          <Ionicons
            name={check.pass ? 'checkmark-circle' : 'alert-circle'}
            size={20}
            color={check.pass ? theme.accent : theme.danger}
          />
          <View style={styles.flex}>
            <Text style={[Typography.labelLg, { color: theme.text }]}>
              {check.label}
            </Text>
            <Text style={[Typography.bodySm, muted]}>{check.detail}</Text>
          </View>
        </View>
      ))}
      {previous ? (
        <Text testID="post-mortem-trend" style={[Typography.bodySm, muted]}>
          Since last time: fillers {previous.fillersPerMinute} →{' '}
          {report.fillersPerMinute} a minute, pace {previous.wordsPerMinute} →{' '}
          {report.wordsPerMinute} words a minute.
        </Text>
      ) : null}
      <View style={[styles.focus, { borderColor: theme.accent }]}>
        <Text style={[Typography.labelSm, { color: theme.accent }]}>
          NEXT FOCUS
        </Text>
        <Text style={[Typography.bodyMd, { color: theme.text }]}>
          {report.focus}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: Radii.lg, padding: Spacing.lg, gap: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.sm },
  flex: { flex: 1 },
  focus: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.sm,
    gap: Spacing.xxs,
  },
})

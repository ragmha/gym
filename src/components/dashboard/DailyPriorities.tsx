import { Ionicons } from '@expo/vector-icons'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import { CARDIO_MINUTES_GOAL, longestWorkout } from '@/lib/dailyGoals'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'

function Priority({
  title,
  status,
  complete = false,
  children,
}: {
  title: string
  status: string
  complete?: boolean
  children: ReactNode
}) {
  const theme = useTheme()
  return (
    <View style={[styles.trainingRow, { borderColor: theme.separator }]}>
      <View style={styles.heading}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: theme.text }]}
        >
          {title}
        </Text>
        <View style={styles.statusRow}>
          {complete && (
            <Ionicons
              name="checkmark-circle"
              size={17}
              color={theme.homeSuccessText}
            />
          )}
          <Text
            style={[
              styles.status,
              { color: complete ? theme.homeSuccessText : theme.subtitleText },
            ]}
          >
            {status}
          </Text>
        </View>
      </View>
      {children}
    </View>
  )
}

export function DailyPriorities({
  snapshot,
}: {
  snapshot: DailyHealthSnapshot | null
}) {
  const theme = useTheme()
  const running = longestWorkout(snapshot, 'running')
  const stairs = longestWorkout(snapshot, 'stairClimber')
  const lifting = longestWorkout(snapshot, 'strength')
  const runComplete =
    running !== null && running.durationMinutes >= CARDIO_MINUTES_GOAL
  const water = snapshot?.waterLiters ?? null
  const valueStyle = [styles.value, { color: theme.text }]
  const captionStyle = [Typography.bodySm, { color: theme.subtitleText }]

  return (
    <View style={styles.container}>
      <Text
        accessibilityRole="header"
        style={[Typography.headingMd, { color: theme.text }]}
      >
        Training
      </Text>
      <Priority
        title="Cardio"
        status={runComplete ? 'Goal met' : '30 min goal'}
        complete={runComplete}
      >
        <Text style={captionStyle}>
          Run 30 min or StairMaster 30 min at Zone 2+.
        </Text>
        {running && (
          <Text selectable style={valueStyle}>
            Run: {Math.floor(running.durationMinutes)} min synced
          </Text>
        )}
        {stairs && (
          <>
            <Text selectable style={valueStyle}>
              StairMaster: {Math.floor(stairs.durationMinutes)} min synced
              {stairs.averageHeartRate !== null
                ? ` / ${stairs.averageHeartRate} bpm avg`
                : ''}
            </Text>
            <Text style={captionStyle}>
              Zone 2+ time unavailable. Average heart rate cannot verify it.
            </Text>
          </>
        )}
        {!running && !stairs && (
          <Text style={captionStyle}>
            No running or Stair Stepper workout available.
          </Text>
        )}
      </Priority>

      <Priority title="Lift" status="8-week PPL">
        <Text selectable style={valueStyle}>
          {lifting
            ? `${Math.floor(lifting.durationMinutes)} min lifting synced`
            : 'No strength workout available'}
        </Text>
        <Text style={captionStyle}>Program not configured.</Text>
      </Priority>

      <View style={styles.waterRow}>
        <View
          style={[styles.waterIcon, { backgroundColor: theme.accentInactive }]}
        >
          <Ionicons name="water-outline" size={24} color={theme.homeAccent} />
        </View>
        <View style={styles.waterCopy}>
          <Text
            accessibilityRole="header"
            style={[Typography.headingSm, { color: theme.text }]}
          >
            Water
          </Text>
          <Text style={captionStyle}>
            {water === null
              ? 'No water reading available in Apple Health.'
              : water === 0
                ? 'No water logged'
                : 'Recorded in Apple Health.'}
          </Text>
        </View>
        <Text
          selectable
          style={[styles.waterValue, { color: theme.text }]}
          accessibilityLabel={
            water === null
              ? 'Water unavailable'
              : `Water ${water.toFixed(1)} liters recorded`
          }
        >
          {water === null ? '--' : water.toFixed(1)} L
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  trainingRow: {
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  heading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    ...Typography.headingSm,
    flexGrow: 1,
  },
  status: {
    ...Typography.labelMd,
    flexShrink: 1,
  },
  value: {
    ...Typography.bodyMd,
    fontVariant: ['tabular-nums'],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    flexShrink: 1,
  },
  waterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  waterIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterCopy: { flex: 1, minWidth: 100, gap: Spacing.xxs },
  waterValue: {
    ...Typography.numericMd,
    flexShrink: 1,
  },
})

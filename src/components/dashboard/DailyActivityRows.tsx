import { Ionicons } from '@expo/vector-icons'
import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Elevation, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import { presentCalories, presentSleep } from '@/lib/fitnessMetrics/presenter'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'

export function DailyActivityRows({
  snapshot,
  showSummaryMetrics = true,
}: {
  snapshot: DailyHealthSnapshot | null
  showSummaryMetrics?: boolean
}) {
  const theme = useTheme()
  const sleep = presentSleep(snapshot)
  const calories = presentCalories(snapshot)
  const metrics = [{ ...calories, label: 'Active calories' }, sleep].filter(
    (metric) => showSummaryMetrics && metric.status !== 'empty',
  )
  const workouts = useMemo(
    () =>
      [...(snapshot?.workouts ?? [])].sort(
        (a, b) => Date.parse(b.startISO) - Date.parse(a.startISO),
      ),
    [snapshot?.workouts],
  )

  if (metrics.length === 0 && workouts.length === 0) return null

  return (
    <View style={styles.container}>
      {metrics.length > 0 && (
        <View style={[styles.panel, { backgroundColor: theme.cardBackground }]}>
          {metrics.map((metric, index) => (
            <View
              key={metric.id}
              style={[
                styles.row,
                {
                  borderColor:
                    index < metrics.length - 1
                      ? theme.separator
                      : 'transparent',
                },
              ]}
              accessible
              accessibilityLabel={`${metric.label} ${metric.value} ${metric.unit}`}
            >
              <Ionicons
                name={metric.iconName}
                size={24}
                color={theme[metric.accentColorToken]}
              />
              <Text style={[styles.name, { color: theme.text }]}>
                {metric.label}
              </Text>
              <Text selectable style={[styles.value, { color: theme.text }]}>
                {metric.value} {metric.unit}
              </Text>
            </View>
          ))}
        </View>
      )}
      {workouts.length > 0 && (
        <Text
          accessibilityRole="header"
          style={[styles.heading, { color: theme.text }]}
        >
          Workouts
        </Text>
      )}
      {workouts.length > 0 && (
        <View style={[styles.panel, { backgroundColor: theme.cardBackground }]}>
          {workouts.map((workout, index) => {
            const start = new Date(workout.startISO).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })
            const duration = `${Math.round(workout.durationMinutes)} min`
            const calories =
              workout.calories === null
                ? null
                : `${Math.round(workout.calories).toLocaleString()} kcal`

            return (
              <View
                key={`${workout.startISO}-${workout.endISO}-${workout.activityName}-${index}`}
                style={[
                  styles.row,
                  {
                    borderColor:
                      index < workouts.length - 1
                        ? theme.separator
                        : 'transparent',
                  },
                ]}
                accessible
                accessibilityLabel={`${workout.activityName}, ${duration}, ${start}${calories ? `, ${calories}` : ''}`}
              >
                <Ionicons
                  name="fitness-outline"
                  size={24}
                  color={theme.homeAccent}
                />
                <View style={styles.workoutName}>
                  <Text style={[Typography.headingSm, { color: theme.text }]}>
                    {workout.activityName}
                  </Text>
                  {calories !== null && (
                    <Text
                      selectable
                      style={[Typography.bodySm, { color: theme.subtitleText }]}
                    >
                      {calories}
                    </Text>
                  )}
                </View>
                <View style={styles.timing}>
                  <Text
                    selectable
                    style={[styles.value, { color: theme.text }]}
                  >
                    {duration}
                  </Text>
                  <Text
                    selectable
                    style={[Typography.bodySm, { color: theme.subtitleText }]}
                  >
                    {start}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  heading: {
    ...Typography.headingMd,
    paddingHorizontal: Spacing.xxs,
  },
  panel: {
    ...Elevation.soft,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.panel,
    borderCurve: 'continuous',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: {
    ...Typography.bodyMd,
    flex: 1,
  },
  workoutName: {
    flex: 1,
    minWidth: 80,
    gap: Spacing.xxs,
  },
  timing: {
    alignItems: 'flex-end',
    gap: Spacing.xxs,
  },
  value: {
    ...Typography.headingSm,
    fontVariant: ['tabular-nums'],
  },
})

import { Ionicons } from '@expo/vector-icons'
import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import { presentSleep } from '@/lib/fitnessMetrics/presenter'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'

export function DailyActivityRows({
  snapshot,
}: {
  snapshot: DailyHealthSnapshot | null
}) {
  const theme = useTheme()
  const sleep = presentSleep(snapshot)
  const workouts = useMemo(
    () =>
      [...(snapshot?.workouts ?? [])].sort(
        (a, b) => Date.parse(b.startISO) - Date.parse(a.startISO),
      ),
    [snapshot?.workouts],
  )

  return (
    <View style={styles.container}>
      <Text
        accessibilityRole="header"
        style={[styles.heading, { color: theme.subtitleText }]}
      >
        This day
      </Text>
      <View
        style={[styles.row, { backgroundColor: theme.homeSurface }]}
        accessible
        accessibilityLabel={
          sleep.status === 'empty'
            ? 'Sleep unavailable'
            : `Sleep ${sleep.value} ${sleep.unit}`
        }
      >
        <Ionicons name="moon-outline" size={24} color={theme.metricSleep} />
        <Text style={[styles.name, { color: theme.text }]}>Sleep</Text>
        <Text selectable style={[styles.value, { color: theme.text }]}>
          {sleep.value}
          {sleep.status !== 'empty' ? ` ${sleep.unit}` : ''}
        </Text>
      </View>
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
            style={[styles.row, { backgroundColor: theme.homeSurface }]}
            accessible
            accessibilityLabel={`${workout.activityName}, ${duration}, ${start}${calories ? `, ${calories}` : ''}`}
          >
            <Ionicons
              name="fitness-outline"
              size={24}
              color={theme.homeAccent}
            />
            <View style={styles.workoutName}>
              <Text style={[Typography.headingXs, { color: theme.text }]}>
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
              <Text selectable style={[styles.value, { color: theme.text }]}>
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
      {workouts.length === 0 && (
        <Text style={[styles.empty, { color: theme.subtitleText }]}>
          No workouts available for this day
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  heading: {
    ...Typography.labelMd,
    textTransform: 'uppercase',
    marginBottom: Spacing.xxs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.sm,
    borderCurve: 'continuous',
  },
  name: {
    ...Typography.headingXs,
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
    ...Typography.labelLg,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    ...Typography.bodySm,
    paddingVertical: Spacing.xs,
  },
})

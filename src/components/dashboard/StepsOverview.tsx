import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import { DAILY_STEP_GOAL } from '@/lib/dailyGoals'
import { presentSteps } from '@/lib/fitnessMetrics/presenter'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'

export function StepsOverview({
  snapshot,
  onPress,
}: {
  snapshot: DailyHealthSnapshot | null
  onPress: () => void
}) {
  const theme = useTheme()
  const steps = presentSteps(snapshot)
  const count = snapshot?.steps ?? null
  const reached = count !== null && count >= DAILY_STEP_GOAL
  const remaining = count === null ? null : Math.max(DAILY_STEP_GOAL - count, 0)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { opacity: pressed ? 0.65 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        steps.status === 'empty' ? 'Steps unavailable' : `Steps ${steps.value}`
      }
      accessibilityValue={
        count === null
          ? undefined
          : {
              min: 0,
              max: DAILY_STEP_GOAL,
              now: Math.min(count, DAILY_STEP_GOAL),
              text: `${count.toLocaleString()} of ${DAILY_STEP_GOAL.toLocaleString()} steps`,
            }
      }
      accessibilityHint={`Daily target ${DAILY_STEP_GOAL.toLocaleString()} steps. Opens step details for the selected day.`}
    >
      <View style={styles.heading}>
        <View style={[styles.icon, { backgroundColor: theme.homeSurface }]}>
          <Ionicons name="walk-outline" size={24} color={theme.text} />
        </View>
        <Text style={[styles.label, { color: theme.text }]}>Daily steps</Text>
        <Ionicons name="arrow-forward" size={22} color={theme.homeAccent} />
      </View>
      <View style={styles.reading}>
        <Text
          selectable
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.value, { color: theme.text }]}
        >
          {steps.value}
        </Text>
        <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
          / {DAILY_STEP_GOAL.toLocaleString()} steps
        </Text>
      </View>
      {count !== null && (
        <View style={[styles.track, { backgroundColor: theme.separator }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${steps.progress * 100}%`,
                backgroundColor: theme.progress,
              },
            ]}
          />
        </View>
      )}
      <Text
        style={[
          Typography.bodySm,
          { color: reached ? theme.homeSuccessText : theme.subtitleText },
        ]}
      >
        {remaining === null
          ? 'No step reading available'
          : reached
            ? 'Daily goal met'
            : `${remaining.toLocaleString()} ${remaining === 1 ? 'step' : 'steps'} to go`}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Layout.gutter,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    ...Typography.headingSm,
    flex: 1,
  },
  value: {
    ...Typography.displayLg,
    fontVariant: ['tabular-nums'],
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reading: {
    paddingTop: Spacing.xxs,
    gap: Spacing.xxs,
  },
  track: {
    height: 4,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
})

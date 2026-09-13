import React from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'

import { CircularProgress } from '@/components/common/CircularProgress'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import {
  DASHBOARD_GOALS,
  presentCalories,
  presentHrv,
  presentRestingHr,
  presentSteps,
} from '@/lib/fitnessMetrics/presenter'
import type { MetricPresentation } from '@/lib/fitnessMetrics/types'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import { useRecoveryPresentation } from '@/utils/recovery'

const RING_RADIUS = 70
const RING_STROKE = 8

function SummaryMetric({
  metric,
  label = metric.label,
  stacked = false,
}: {
  metric: MetricPresentation
  label?: string
  stacked?: boolean
}) {
  const theme = useTheme()
  const description =
    metric.status === 'empty'
      ? `${label} unavailable`
      : `${label} ${metric.value}${metric.unit ? ` ${metric.unit}` : ''}`

  return (
    <View
      style={[styles.metric, stacked && styles.fullWidthMetric]}
      accessible
      accessibilityLabel={description}
    >
      <Text style={[Typography.labelMd, { color: theme.subtitleText }]}>
        {label}
      </Text>
      <Text selectable style={[styles.metricValue, { color: theme.text }]}>
        {metric.value}
        {metric.unit && (
          <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
            {' '}
            {metric.unit}
          </Text>
        )}
      </Text>
    </View>
  )
}

export function RecoveryOverview({
  snapshot,
}: {
  snapshot: DailyHealthSnapshot | null
}) {
  const theme = useTheme()
  const { width, fontScale } = useWindowDimensions()
  const stacked = width < 360 || fontScale > 1.3
  // Static web rendering has no measured viewport yet.
  const availableRadius =
    width > 0
      ? Math.max(RING_STROKE, (width - Spacing.lg * 2) / 2)
      : RING_RADIUS
  const radius = Math.min(RING_RADIUS * Math.max(1, fontScale), availableRadius)
  const recovery = useRecoveryPresentation({
    hrv: snapshot?.hrv ?? null,
    restingHR: snapshot?.restingHeartRate ?? null,
    sleepHours: snapshot?.sleepHours ?? null,
    sleepGoalHours: DASHBOARD_GOALS.sleepGoalHours,
  })
  const recoveryColor = recovery
    ? theme[recovery.accentColorToken]
    : theme.disabled
  const hrv = presentHrv(snapshot)
  const restingHr = presentRestingHr(snapshot)

  return (
    <View style={styles.container}>
      <Text
        accessibilityRole="header"
        accessibilityLabel="Recovery"
        style={[styles.heading, { color: theme.subtitleText }]}
      >
        Recovery
      </Text>
      <View style={styles.hero}>
        {!stacked && <SummaryMetric metric={hrv} />}
        <View
          accessible
          accessibilityLabel={
            recovery ? `Recovery ${recovery.score}%` : 'Recovery unavailable'
          }
        >
          <CircularProgress
            value={recovery?.score ?? 0}
            radius={radius}
            activeStrokeWidth={RING_STROKE}
            inActiveStrokeWidth={RING_STROKE}
            activeStrokeColor={recoveryColor}
            inActiveStrokeColor={theme.separator}
            duration={0}
          >
            <Text
              selectable
              style={[
                Typography.displayMd,
                { color: recovery ? recoveryColor : theme.text },
              ]}
            >
              {recovery ? `${recovery.score}%` : '--'}
            </Text>
          </CircularProgress>
        </View>
        {!stacked && <SummaryMetric metric={restingHr} />}
      </View>
      {stacked && (
        <View style={[styles.metricsRow, fontScale > 1.6 && styles.stacked]}>
          <SummaryMetric metric={hrv} stacked={fontScale > 1.6} />
          <SummaryMetric metric={restingHr} stacked={fontScale > 1.6} />
        </View>
      )}
      <View style={styles.explanation}>
        <Text
          style={[
            styles.status,
            { color: recovery ? recoveryColor : theme.subtitleText },
          ]}
        >
          {recovery?.label ?? 'Not enough recovery data'}
        </Text>
        {recovery && (
          <Text style={[styles.hint, { color: theme.subtitleText }]}>
            {recovery.shortHint}
          </Text>
        )}
      </View>
      <View
        style={[
          styles.dailyMetrics,
          stacked && styles.stacked,
          { borderColor: theme.separator },
        ]}
      >
        <SummaryMetric metric={presentSteps(snapshot)} stacked={stacked} />
        <View
          style={[
            styles.divider,
            stacked && styles.horizontalDivider,
            { backgroundColor: theme.separator },
          ]}
        />
        <SummaryMetric
          metric={presentCalories(snapshot)}
          label="Active calories"
          stacked={stacked}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  heading: {
    ...Typography.labelMd,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stacked: {
    flexDirection: 'column',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  fullWidthMetric: {
    flex: 0,
    width: '100%',
  },
  metricValue: {
    ...Typography.numericMd,
    textAlign: 'center',
  },
  explanation: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  status: {
    ...Typography.headingXs,
    textAlign: 'center',
  },
  hint: {
    ...Typography.bodySm,
    textAlign: 'center',
  },
  dailyMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  horizontalDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
  },
})

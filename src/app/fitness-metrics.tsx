import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useMemo, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ActivityHeatmap } from '@/components/charts/ActivityHeatmap'
import { ScreenHeader } from '@/components/common/ScreenHeader'
import { DailyActivityRows } from '@/components/dashboard/DailyActivityRows'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { CoachInsightCard } from '@/components/health/CoachInsightCard'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { HealthReadState } from '@/components/health/HealthReadState'
import {
  Elevation,
  Layout,
  Radii,
  Spacing,
  Typography,
} from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useDailyCoachInsight } from '@/hooks/useDailyCoachInsight'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useTheme } from '@/hooks/useThemeColor'
import {
  DASHBOARD_GOALS,
  presentBodyMass,
  presentCalories,
  presentFlightsClimbed,
  presentHeartRate,
  presentHrv,
  presentRestingHr,
  presentHydration,
  presentNutritionIntake,
  presentRecovery,
  presentSleep,
  presentSteps,
  type MetricPresentation,
  type MetricRoute,
} from '@/lib/fitnessMetrics'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import { useRecoveryPresentation } from '@/utils/recovery'

const METRIC_GROUPS: { title: string; ids: MetricPresentation['id'][] }[] = [
  { title: 'Activity', ids: ['steps', 'calories', 'flights-climbed'] },
  {
    title: 'Recovery & sleep',
    ids: ['recovery', 'sleep', 'heart-rate', 'hrv', 'resting-hr'],
  },
  {
    title: 'Body & intake',
    ids: ['body-mass', 'hydration', 'nutrition-intake'],
  },
]

function MetricRow({
  metric,
  onPress,
  last,
}: {
  metric: MetricPresentation
  onPress?: () => void
  last: boolean
}) {
  const theme = useTheme()
  const Wrapper = onPress ? Pressable : View
  const subtitle = [
    'calories',
    'flights-climbed',
    'hydration',
    'nutrition-intake',
    'sleep',
  ].includes(metric.id)
    ? metric.status === 'empty'
      ? 'No reading available'
      : 'Recorded in Apple Health'
    : metric.subtitle
  return (
    <Wrapper
      style={[
        styles.metricRow,
        { borderColor: last ? 'transparent' : theme.separator },
      ]}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={
        onPress ? `${metric.label} ${metric.value}` : undefined
      }
      accessibilityHint={
        onPress ? 'Opens step details for the selected day' : undefined
      }
    >
      <View style={styles.metricCopy}>
        <Text style={[Typography.bodyMd, { color: theme.text }]}>
          {metric.label}
        </Text>
        <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.metricReading}>
        <Text selectable style={[styles.metricValue, { color: theme.text }]}>
          {metric.value}
          {metric.unit ? (
            <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
              {' '}
              {metric.unit}
            </Text>
          ) : null}
        </Text>
        {onPress && (
          <Ionicons name="chevron-forward" size={18} color={theme.accent} />
        )}
      </View>
    </Wrapper>
  )
}

export default function FitnessMetricsScreen() {
  return (
    <HealthDateRoute>
      {(date) => <FitnessMetricsForDate date={date} />}
    </HealthDateRoute>
  )
}

function FitnessMetricsForDate({ date }: { date: Date }) {
  const router = useRouter()

  const theme = useTheme()
  const colorScheme = useColorScheme()
  const { snapshot, status, error, isDemoMode, refresh } =
    useHealthSnapshot(date)
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }, [refresh])
  const recovery = useRecoveryPresentation({
    hrv: snapshot?.hrv ?? null,
    restingHR: snapshot?.restingHeartRate ?? null,
    sleepHours: snapshot?.sleepHours ?? null,
    hrvBaseline: null,
    rhrBaseline: null,
    sleepGoalHours: DASHBOARD_GOALS.sleepGoalHours,
  })
  const { insight, status: insightStatus } = useDailyCoachInsight({
    snapshot,
    recovery,
  })
  const metrics = useMemo<MetricPresentation[]>(
    () => [
      presentRecovery(recovery),
      presentSteps(snapshot),
      presentCalories(snapshot),
      presentNutritionIntake(snapshot),
      presentSleep(snapshot),
      presentHydration(snapshot),
      presentHeartRate(snapshot),
      presentHrv(snapshot),
      presentRestingHr(snapshot),
      presentFlightsClimbed(snapshot),
      presentBodyMass(snapshot),
    ],
    [snapshot, recovery],
  )

  const createMetricPressHandler = (route?: MetricRoute) => {
    if (!route) {
      return undefined
    }

    return () =>
      router.push({ pathname: route, params: { date: localDateKey(date) } })
  }

  return (
    <SafeAreaView
      testID="fitness-metrics-screen"
      style={[styles.safe, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScreenHeader
        title="Fitness Metrics"
        subtitle={date.toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            testID="metrics-refresh"
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
          />
        }
      >
        {isDemoMode && (
          <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
            Demo data - Apple Health is available on iOS.
          </Text>
        )}
        {status === 'loading' && !snapshot ? (
          <HealthReadState loading />
        ) : status === 'error' ? (
          <HealthReadState error={error} onRetry={onRefresh} />
        ) : (
          <>
            <CoachInsightCard insight={insight} status={insightStatus} />
            {METRIC_GROUPS.map((group) => {
              const rows = metrics.filter((metric) =>
                group.ids.includes(metric.id),
              )
              return (
                <View key={group.title} style={styles.group}>
                  <Text
                    accessibilityRole="header"
                    style={[styles.groupTitle, { color: theme.text }]}
                  >
                    {group.title}
                  </Text>
                  <View
                    style={[
                      styles.panel,
                      { backgroundColor: theme.cardBackground },
                    ]}
                  >
                    {rows.map((metric, index) => (
                      <MetricRow
                        key={metric.id}
                        metric={metric}
                        last={index === rows.length - 1}
                        onPress={createMetricPressHandler(metric.route)}
                      />
                    ))}
                  </View>
                </View>
              )
            })}
            <DailyActivityRows snapshot={snapshot} showSummaryMetrics={false} />
            <ActivityHeatmap title="Recent activity" />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
  },
  group: { gap: Spacing.sm },
  groupTitle: { ...Typography.headingMd, paddingHorizontal: Spacing.xxs },
  panel: {
    ...Elevation.soft,
    borderRadius: Radii.panel,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.lg,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: Spacing.md,
    rowGap: Spacing.xs,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 80,
  },
  metricCopy: {
    flex: 1,
    minWidth: 120,
    gap: Spacing.xxs,
  },
  metricReading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  metricValue: {
    ...Typography.numericMd,
    flexShrink: 1,
  },
})

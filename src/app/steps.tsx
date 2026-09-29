import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader } from '@/components/common/ScreenHeader'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
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
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useTheme } from '@/hooks/useThemeColor'
import { DAILY_STEP_GOAL } from '@/lib/dailyGoals'

export default function StepsScreen() {
  return (
    <HealthDateRoute>{(date) => <StepsForDate date={date} />}</HealthDateRoute>
  )
}

function StepsForDate({ date }: { date: Date }) {
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
  const steps = snapshot?.steps ?? null
  const calories = snapshot?.calories ?? null
  const stepsProgress =
    steps === null ? 0 : Math.min(steps / DAILY_STEP_GOAL, 1)
  const remaining = steps === null ? null : Math.max(DAILY_STEP_GOAL - steps, 0)

  return (
    <SafeAreaView
      testID="steps-screen"
      style={[styles.container, { backgroundColor: theme.homeBackground }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScreenHeader
        title="Steps Taken"
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
            testID="steps-refresh"
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
          />
        }
      >
        {isDemoMode && (
          <Text style={[styles.demo, { color: theme.subtitleText }]}>
            Demo data - Apple Health is available on iOS.
          </Text>
        )}
        {status === 'loading' && !snapshot ? (
          <HealthReadState loading />
        ) : status === 'error' ? (
          <HealthReadState error={error} onRetry={onRefresh} />
        ) : (
          <>
            <View style={styles.overview}>
              <View style={styles.activityHeading}>
                <View
                  style={[
                    styles.activityIcon,
                    { backgroundColor: theme.cardSurface },
                  ]}
                >
                  <Ionicons name="walk-outline" size={32} color={theme.text} />
                </View>
                <Text style={[Typography.headingMd, { color: theme.text }]}>
                  Daily steps
                </Text>
              </View>
              <Text
                selectable
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[styles.heroSteps, { color: theme.text }]}
                accessibilityLabel={
                  steps === null ? 'Steps unavailable' : `${steps} steps`
                }
              >
                {steps === null ? '--' : steps.toLocaleString()}
              </Text>
              <Text style={[Typography.bodyLg, { color: theme.subtitleText }]}>
                of {DAILY_STEP_GOAL.toLocaleString()} daily steps
              </Text>
              {steps !== null && (
                <View
                  testID="steps-progress"
                  accessible
                  accessibilityRole="progressbar"
                  accessibilityLabel="Daily step goal"
                  accessibilityValue={{
                    min: 0,
                    max: DAILY_STEP_GOAL,
                    now: Math.min(steps, DAILY_STEP_GOAL),
                    text: `${steps.toLocaleString()} of ${DAILY_STEP_GOAL.toLocaleString()} steps`,
                  }}
                  style={[styles.track, { backgroundColor: theme.separator }]}
                >
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${stepsProgress * 100}%`,
                        backgroundColor: theme.progress,
                      },
                    ]}
                  />
                </View>
              )}
              <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
                {remaining === null
                  ? 'No step reading available'
                  : remaining === 0
                    ? 'Daily goal met'
                    : `${remaining.toLocaleString()} ${remaining === 1 ? 'step' : 'steps'} to go`}
              </Text>
            </View>

            <View
              style={[styles.panel, { backgroundColor: theme.cardBackground }]}
            >
              <Text
                accessibilityRole="header"
                style={[Typography.headingMd, { color: theme.text }]}
              >
                Daily readings
              </Text>
              <View style={[styles.statRow, { borderColor: theme.separator }]}>
                <Text style={[styles.statLabel, { color: theme.subtitleText }]}>
                  Active calories
                </Text>
                <Text
                  selectable
                  style={[styles.statValue, { color: theme.text }]}
                  accessibilityLabel={
                    calories === null
                      ? 'Calories unavailable'
                      : `${calories} kcal`
                  }
                >
                  {calories === null ? '--' : calories.toLocaleString()}{' '}
                  <Text style={Typography.bodySm}>kcal</Text>
                </Text>
              </View>
              <View style={[styles.statRow, { borderColor: theme.separator }]}>
                <Text style={[styles.statLabel, { color: theme.subtitleText }]}>
                  Walking distance
                </Text>
                <Text
                  selectable
                  style={[styles.statValue, { color: theme.text }]}
                  accessibilityLabel="Walking distance unavailable"
                >
                  -- <Text style={Typography.bodySm}>km</Text>
                </Text>
              </View>
              <View style={[styles.statRow, { borderColor: theme.separator }]}>
                <Text style={[styles.statLabel, { color: theme.subtitleText }]}>
                  Active minutes
                </Text>
                <Text
                  selectable
                  style={[styles.statValue, { color: theme.text }]}
                  accessibilityLabel="Active minutes unavailable"
                >
                  -- <Text style={Typography.bodySm}>min</Text>
                </Text>
              </View>
              <Text style={[styles.note, { color: theme.subtitleText }]}>
                Distance and active minutes are not included in this daily
                snapshot.
              </Text>
            </View>
            <Text style={[styles.source, { color: theme.subtitleText }]}>
              Read from Apple Health. Pull down to refresh.
            </Text>
          </>
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
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
  },
  overview: {
    paddingHorizontal: Layout.gutter,
    paddingTop: Spacing.xl,
    gap: Spacing.sm,
  },
  activityHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  activityIcon: {
    width: 64,
    height: 64,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSteps: {
    ...Typography.displayLg,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 4,
    borderRadius: Radii.pill,
    overflow: 'hidden',
    marginTop: Spacing.md,
  },
  fill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  panel: {
    ...Elevation.soft,
    marginHorizontal: Spacing.sm,
    borderRadius: Radii.panel,
    borderCurve: 'continuous',
    padding: Spacing.xl,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: Spacing.md,
    rowGap: Spacing.xxs,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statLabel: {
    ...Typography.bodyMd,
    flexGrow: 1,
    flexShrink: 1,
  },
  statValue: {
    ...Typography.numericMd,
    flexShrink: 1,
  },
  note: { ...Typography.bodySm, paddingTop: Spacing.lg },
  source: {
    ...Typography.bodySm,
    marginHorizontal: Layout.gutter,
  },
  demo: { ...Typography.bodySm, marginHorizontal: Layout.gutter },
})

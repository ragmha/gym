import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { SafeAreaView } from 'react-native-safe-area-context'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { HealthReadState } from '@/components/health/HealthReadState'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useTheme } from '@/hooks/useThemeColor'
import { DAILY_STEP_GOAL } from '@/lib/dailyGoals'
import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type { DailyActivityReading } from '@/lib/healthSnapshot/types'

const ARC_RADIUS = 130
const ARC_LENGTH = Math.PI * ARC_RADIUS
const CHART_WIDTH = 350
const CHART_TOP = 12
const CHART_BOTTOM = 126
const SELECTED_DAY_BG = '#F5F5F5'
const SELECTED_DAY_TEXT = '#090909'

export default function StepsScreen() {
  return (
    <HealthDateRoute>{(date) => <StepsForDate date={date} />}</HealthDateRoute>
  )
}

function StepsForDate({ date }: { date: Date }) {
  const router = useRouter()
  const theme = useTheme()
  const colorScheme = useColorScheme()
  const { snapshot, status, error, isDemoMode, refresh } =
    useHealthSnapshot(date)
  const dateKey = localDateKey(date)
  const requestRef = useRef(0)
  const [refreshing, setRefreshing] = useState(false)
  const [weekState, setWeekState] = useState<{
    dateKey: string
    status: 'loading' | 'ready' | 'error'
    readings: DailyActivityReading[]
  } | null>(null)
  const loadWeek = useCallback(async () => {
    const request = ++requestRef.current
    setWeekState((prev) =>
      prev?.dateKey === dateKey && prev.status === 'ready'
        ? prev
        : { dateKey, status: 'loading', readings: [] },
    )
    try {
      const readings = await healthSnapshot.getActivityHistory(date, 7)
      if (requestRef.current === request) {
        setWeekState({ dateKey, status: 'ready', readings })
      }
    } catch {
      if (requestRef.current === request) {
        setWeekState({ dateKey, status: 'error', readings: [] })
      }
    }
  }, [date, dateKey])

  // Each new snapshot (focus, foreground, workout change, pull-to-refresh)
  // rereads the week so the chart stays in step with the headline numbers.
  useEffect(() => {
    void loadWeek()
    return () => {
      requestRef.current += 1
    }
  }, [loadWeek, snapshot])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }, [refresh])

  const week = weekState?.dateKey === dateKey ? weekState : null
  const selectedReading = week?.readings.find(
    (reading) => reading.date === dateKey,
  )
  const steps = snapshot?.steps ?? null
  const calories = snapshot?.calories ?? null
  const progress = steps === null ? 0 : Math.min(steps / DAILY_STEP_GOAL, 1)
  const remaining = steps === null ? null : Math.max(DAILY_STEP_GOAL - steps, 0)
  const isToday = dateKey === localDateKey(new Date())
  const dateLabel = date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const changeDate = (days: number) => {
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + days)
    router.replace({
      pathname: '/steps',
      params: { date: localDateKey(nextDate) },
    })
  }

  return (
    <SafeAreaView
      testID="steps-screen"
      style={[styles.container, { backgroundColor: theme.homeBackground }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to Home"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/')
          }
          style={styles.homeButton}
        >
          <Text style={[Typography.bodyLg, { color: theme.text }]}>Home</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            testID="steps-refresh"
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.goalComplete}
          />
        }
      >
        {status === 'loading' && !snapshot ? (
          <HealthReadState loading />
        ) : status === 'error' ? (
          <HealthReadState error={error} onRetry={onRefresh} />
        ) : (
          <>
            <View style={styles.hero}>
              <View style={styles.gauge}>
                <View
                  testID="steps-progress"
                  accessible={steps !== null}
                  accessibilityRole={steps === null ? undefined : 'progressbar'}
                  accessibilityLabel="Daily step goal"
                  accessibilityValue={
                    steps === null
                      ? undefined
                      : {
                          min: 0,
                          max: DAILY_STEP_GOAL,
                          now: Math.min(steps, DAILY_STEP_GOAL),
                          text: `${steps.toLocaleString()} of ${DAILY_STEP_GOAL.toLocaleString()} steps`,
                        }
                  }
                >
                  <Svg
                    width="100%"
                    height={190}
                    viewBox="0 0 320 190"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <Path
                      d="M 30 170 A 130 130 0 0 1 290 170"
                      fill="none"
                      stroke={theme.separator}
                      strokeWidth={10}
                      strokeLinecap="round"
                    />
                    {steps !== null && (
                      <>
                        <Path
                          d="M 30 170 A 130 130 0 0 1 290 170"
                          fill="none"
                          stroke={theme.goalComplete}
                          strokeWidth={10}
                          strokeLinecap="round"
                          strokeDasharray={[ARC_LENGTH * progress, ARC_LENGTH]}
                        />
                        <Circle
                          cx={
                            160 +
                            ARC_RADIUS * Math.cos(Math.PI * (1 - progress))
                          }
                          cy={
                            170 -
                            ARC_RADIUS * Math.sin(Math.PI * (1 - progress))
                          }
                          r={24}
                          fill={theme.cardSurface}
                          stroke={theme.goalComplete}
                          strokeWidth={4}
                        />
                        <Path
                          d={`M ${
                            160 +
                            ARC_RADIUS * Math.cos(Math.PI * (1 - progress)) -
                            8
                          } ${
                            170 -
                            ARC_RADIUS * Math.sin(Math.PI * (1 - progress)) +
                            2
                          } l 4 -9 3 1 2 6 7 2 -1 4 h-15 z`}
                          fill={theme.text}
                        />
                      </>
                    )}
                  </Svg>
                </View>
                <View style={styles.dateRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Previous day"
                    onPress={() => changeDate(-1)}
                    style={styles.dateButton}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={22}
                      color={theme.subtitleText}
                    />
                  </Pressable>
                  <Text
                    accessibilityRole="header"
                    style={[styles.dateLabel, { color: theme.goalComplete }]}
                  >
                    {dateLabel}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next day"
                    disabled={isToday}
                    onPress={() => changeDate(1)}
                    style={[styles.dateButton, { opacity: isToday ? 0.35 : 1 }]}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={22}
                      color={theme.subtitleText}
                    />
                  </Pressable>
                </View>
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
                of {DAILY_STEP_GOAL.toLocaleString()} steps
              </Text>
              <Text
                style={[
                  Typography.bodySm,
                  { color: theme.subtitleText, marginTop: Spacing.xs },
                ]}
              >
                {remaining === null
                  ? 'No step reading available'
                  : remaining === 0
                    ? 'Daily goal met'
                    : `${remaining.toLocaleString()} steps to go`}
              </Text>

              <View style={[styles.stats, { borderColor: theme.separator }]}>
                <StepStat
                  icon="time-outline"
                  value={selectedReading?.activeMinutes ?? null}
                  unit="Min"
                  label="Active minutes"
                  color={theme.goalComplete}
                  textColor={theme.text}
                  subtitleColor={theme.subtitleText}
                />
                <View
                  style={[
                    styles.statDivider,
                    { backgroundColor: theme.separator },
                  ]}
                />
                <StepStat
                  icon="navigate-outline"
                  value={selectedReading?.walkingDistanceKm ?? null}
                  unit="Km"
                  label="Walking distance"
                  color={theme.goalComplete}
                  textColor={theme.text}
                  subtitleColor={theme.subtitleText}
                />
                <View
                  style={[
                    styles.statDivider,
                    { backgroundColor: theme.separator },
                  ]}
                />
                <StepStat
                  icon="flame-outline"
                  value={calories}
                  unit="Kcal"
                  label="Calories"
                  color={theme.goalComplete}
                  textColor={theme.text}
                  subtitleColor={theme.subtitleText}
                />
              </View>
            </View>

            <View style={styles.weekSection}>
              <Text
                accessibilityRole="header"
                style={[Typography.headingMd, { color: theme.text }]}
              >
                Week analytics
              </Text>
              {week?.status === 'error' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void loadWeek()}
                  style={styles.retry}
                >
                  <Text
                    style={[Typography.bodySm, { color: theme.goalComplete }]}
                  >
                    Weekly activity unavailable. Tap to retry.
                  </Text>
                </Pressable>
              ) : week?.status === 'ready' ? (
                <StepWeekChart
                  readings={week.readings}
                  selectedDate={dateKey}
                />
              ) : (
                <Text
                  style={[styles.weekLoading, { color: theme.subtitleText }]}
                >
                  Loading weekly activity…
                </Text>
              )}
            </View>

            <Text style={[styles.source, { color: theme.subtitleText }]}>
              {isDemoMode
                ? 'Demo data - Apple Health is available on iOS.'
                : 'Read from Apple Health. Pull down to refresh.'}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function StepStat({
  icon,
  value,
  unit,
  label,
  color,
  textColor,
  subtitleColor,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  value: number | null
  unit: string
  label: string
  color: string
  textColor: string
  subtitleColor: string
}) {
  return (
    <View
      accessible
      accessibilityLabel={
        value === null
          ? `${label} unavailable`
          : label === 'Calories'
            ? `${value} kcal`
            : `${label} ${value} ${unit}`
      }
      style={styles.stat}
    >
      <Ionicons name={icon} size={30} color={color} />
      <Text style={[styles.statValue, { color: textColor }]}>
        {value === null ? '--' : value.toLocaleString()}
      </Text>
      <Text style={[Typography.bodySm, { color: subtitleColor }]}>{unit}</Text>
    </View>
  )
}

function StepWeekChart({
  readings,
  selectedDate,
}: {
  readings: DailyActivityReading[]
  selectedDate: string
}) {
  const theme = useTheme()
  const plotHeight = CHART_BOTTOM - CHART_TOP
  const xForDay = (index: number) =>
    ((index + 0.5) * CHART_WIDTH) / Math.max(readings.length, 1)
  const yForSteps = (steps: number) =>
    CHART_BOTTOM - Math.min(steps / DAILY_STEP_GOAL, 1) * plotHeight
  const segments = readings.flatMap((reading, index) => {
    const previous = readings[index - 1]
    if (index === 0 || previous?.steps == null || reading.steps == null) {
      return []
    }
    const previousX = xForDay(index - 1)
    const currentX = xForDay(index)
    const previousY = yForSteps(previous.steps)
    const currentY = yForSteps(reading.steps)
    const middleX = (previousX + currentX) / 2
    return [
      `M ${previousX} ${previousY} C ${middleX} ${previousY} ${middleX} ${currentY} ${currentX} ${currentY}`,
    ]
  })

  return (
    <View testID="steps-week-chart" style={styles.chart}>
      <Svg
        width="100%"
        height={150}
        viewBox={`0 0 ${CHART_WIDTH} 150`}
        preserveAspectRatio="none"
      >
        {readings.map((reading, index) => {
          const x = xForDay(index)
          const barHeight =
            reading.steps === null
              ? 0
              : Math.min(reading.steps / DAILY_STEP_GOAL, 1) * plotHeight
          return (
            <React.Fragment key={reading.date}>
              <Rect
                x={x - 3}
                y={CHART_TOP}
                width={6}
                height={plotHeight}
                rx={3}
                fill={theme.separator}
                opacity={0.55}
              />
              {reading.steps !== null && (
                <Rect
                  x={x - 5}
                  y={CHART_BOTTOM - barHeight}
                  width={10}
                  height={barHeight}
                  rx={5}
                  fill={
                    reading.date === selectedDate
                      ? theme.goalComplete
                      : theme.progress
                  }
                  opacity={0.45}
                />
              )}
            </React.Fragment>
          )
        })}
        {segments.map((segment, index) => (
          <Path
            key={index}
            d={segment}
            fill="none"
            stroke={theme.goalComplete}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {readings.map((reading, index) =>
          reading.date === selectedDate && reading.steps !== null ? (
            <Circle
              key={reading.date}
              cx={xForDay(index)}
              cy={yForSteps(reading.steps)}
              r={7}
              fill={theme.goalComplete}
              stroke={theme.cardBackground}
              strokeWidth={3}
            />
          ) : null,
        )}
      </Svg>
      <View style={styles.chartLabels}>
        {readings.map((reading) => {
          const day = new Date(`${reading.date}T12:00:00`)
          const selected = reading.date === selectedDate
          return (
            <View
              key={reading.date}
              accessible
              accessibilityLabel={
                reading.steps === null
                  ? `${day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}: no step reading`
                  : `${day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}: ${reading.steps.toLocaleString()} steps`
              }
              accessibilityState={{ selected }}
              style={styles.chartDay}
            >
              <Text
                style={[
                  styles.chartDayLabel,
                  {
                    color: selected ? SELECTED_DAY_TEXT : theme.subtitleText,
                  },
                  selected && {
                    backgroundColor: SELECTED_DAY_BG,
                    borderRadius: Radii.pill,
                  },
                ]}
              >
                {day.toLocaleDateString(undefined, { weekday: 'short' })}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
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
  topBar: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.gutter,
    paddingVertical: Spacing.xs,
  },
  homeButton: {
    width: 64,
    height: Layout.controlSize,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: Layout.gutter,
    paddingTop: Spacing.xs,
  },
  dateRow: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButton: {
    width: Layout.controlSize,
    height: Layout.controlSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: {
    ...Typography.headingSm,
    textAlign: 'center',
  },
  gauge: {
    width: '100%',
    maxWidth: 440,
    height: 190,
    position: 'relative',
    marginTop: Spacing.xs,
    marginBottom: -44,
  },
  heroSteps: {
    width: '100%',
    textAlign: 'center',
    ...Typography.displayLg,
    fontVariant: ['tabular-nums'],
  },
  stats: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
  },
  stat: { flex: 1, alignItems: 'center', gap: Spacing.xxs },
  statValue: { ...Typography.numericMd },
  statDivider: { width: StyleSheet.hairlineWidth, height: 72 },
  weekSection: {
    paddingHorizontal: Layout.gutter,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  chart: { width: '100%' },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-around' },
  chartDay: { flex: 1, alignItems: 'center' },
  chartDayLabel: {
    minWidth: 36,
    textAlign: 'center',
    overflow: 'hidden',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    ...Typography.bodySm,
  },
  retry: { paddingVertical: Spacing.md },
  weekLoading: { ...Typography.bodySm },
  source: {
    ...Typography.bodySm,
    marginHorizontal: Layout.gutter,
  },
})

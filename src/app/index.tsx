import { useRouter } from 'expo-router'
import React, { useCallback, useMemo, useState } from 'react'
import {
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native'

import { ActivityHeatmap } from '@/components/charts/ActivityHeatmap'
import { CalendarStrip } from '@/components/dashboard/CalendarStrip'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import {
  SLEEP_GOAL_HOURS,
  buildFitnessRings,
} from '@/components/dashboard/fitnessRings'
import { WeightCard } from '@/components/dashboard/WeightCard'
import { FitnessRingsCard } from '@/components/dashboard/WorkoutXPCard'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useTheme } from '@/hooks/useThemeColor'
import { computeRecoveryScore } from '@/utils/recovery'

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

function recoveryColorFor(score: number) {
  if (score >= 67) return '#30D158'
  if (score >= 34) return '#E8C558'
  return '#E8707A'
}

export default function HomeScreen() {
  const router = useRouter()
  const {
    background: backgroundColor,
    text: textColor,
    accent: accentColor,
  } = useTheme()

  const [focusDate, setFocusDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [refreshing, setRefreshing] = useState(false)

  const handleDateSelected = useCallback((date: Date) => {
    setSelectedDate(date)
    setFocusDate(date)
  }, [])

  const { snapshot, refresh } = useHealthSnapshot(selectedDate)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  const shiftWeek = useCallback(
    (weeks: number) => {
      const next = new Date(focusDate)
      next.setDate(next.getDate() + weeks * 7)
      if (weeks > 0 && next > new Date()) return
      setFocusDate(next)
      handleDateSelected(next)
    },
    [focusDate, handleDateSelected],
  )

  const recovery = useMemo(
    () =>
      computeRecoveryScore({
        hrv: snapshot?.hrv ?? 0,
        restingHR: snapshot?.restingHeartRate ?? 0,
        sleepHours: snapshot?.sleepHours ?? 0,
        hrvBaseline: null,
        rhrBaseline: null,
        sleepGoalHours: SLEEP_GOAL_HOURS,
      }),
    [snapshot?.hrv, snapshot?.restingHeartRate, snapshot?.sleepHours],
  )

  const dateLabel = useMemo(() => {
    if (isSameDay(selectedDate, new Date())) return 'TODAY'
    return selectedDate
      .toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      .toUpperCase()
  }, [selectedDate])

  const fitnessMetrics = useMemo(() => buildFitnessRings(snapshot), [snapshot])

  const openFitnessMetrics = useCallback(
    () => router.push('/fitness-metrics'),
    [router],
  )

  return (
    <ScrollView
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <StatusBar barStyle="light-content" />

      <DashboardHeader
        recoveryScore={recovery.score}
        recoveryColor={recoveryColorFor(recovery.score)}
        dateLabel={dateLabel}
        onPreviousWeek={() => shiftWeek(-1)}
        onNextWeek={() => shiftWeek(1)}
        onCoachPress={() => router.push('/coach')}
        onSettingsPress={() => router.push('/settings')}
      />

      <CalendarStrip
        focusDate={focusDate}
        selectedDate={selectedDate}
        onFocusDateChange={setFocusDate}
        onDateSelected={handleDateSelected}
        compact
      />

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          Fitness Metrics
        </Text>
        <TouchableOpacity
          onPress={openFitnessMetrics}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <Text style={[styles.seeAll, { color: accentColor }]}>See All</Text>
        </TouchableOpacity>
      </View>

      <FitnessRingsCard metrics={fitnessMetrics} onPress={openFitnessMetrics} />

      <WeightCard bodyMassKg={snapshot?.bodyMassKg ?? null} />

      <ActivityHeatmap />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
  },
})

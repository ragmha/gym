import { Ionicons } from '@expo/vector-icons'
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

import { ActivityHeatmap } from '@/components/ActivityHeatmap'
import { CalendarStrip } from '@/components/CalendarStrip'
import type { MetricRing } from '@/components/WorkoutXPCard'
import { FitnessRingsCard } from '@/components/WorkoutXPCard'
import { useHealthKit } from '@/hooks/useHealthKit'
import { useTheme } from '@/hooks/useThemeColor'
import { useTodayHydration } from '@/stores/HydrationStore'
import { useWeightStore } from '@/stores/WeightStore'
import { computeRecoveryScore } from '@/utils/recoveryScore'

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const SLEEP_GOAL_HOURS = 8
const KG_TO_LBS = 2.20462

// ── Icon badge component ──────────────────────────────────────
function IconBadge({
  name,
  color,
  bg,
  size = 18,
}: {
  name: React.ComponentProps<typeof Ionicons>['name']
  color: string
  bg: string
  size?: number
}) {
  return (
    <View style={[styles.iconBadge, { backgroundColor: bg }]}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  )
}

export default function HomeScreen() {
  const router = useRouter()
  const {
    background: backgroundColor,
    cardBackground: cardBg,
    text: textColor,
    subtitleText: subtitleColor,
    accent: accentColor,
    border: borderColor,
  } = useTheme()

  const [focusDate, setFocusDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const handleDateSelected = useCallback((date: Date) => {
    setSelectedDate(date)
    setFocusDate(date)
  }, [])

  const {
    sleepHours,
    steps,
    calories,
    workouts,
    hrv,
    restingHeartRate,
    refresh,
  } = useHealthKit(selectedDate)

  const { latestEntry, distanceToGoal, goalKg, unit, trendDelta } =
    useWeightStore()

  const { totalMl: hydrationMl, goalMl: hydrationGoal } = useTodayHydration()

  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  const recovery = useMemo(
    () =>
      computeRecoveryScore({
        hrv,
        restingHR: restingHeartRate,
        sleepHours,
        hrvBaseline: null,
        rhrBaseline: null,
        sleepGoalHours: SLEEP_GOAL_HOURS,
      }),
    [hrv, restingHeartRate, sleepHours],
  )

  const recoveryColor =
    recovery.score >= 67
      ? '#30D158'
      : recovery.score >= 34
        ? '#E8C558'
        : '#E8707A'

  // ── Weight display helpers ────────────────────────────────────
  const weightDisplay = latestEntry
    ? unit === 'lbs'
      ? (latestEntry.weightKg * KG_TO_LBS).toFixed(1)
      : latestEntry.weightKg.toFixed(1)
    : '--'

  const goalDistDisplay =
    distanceToGoal !== null
      ? `${Math.abs(unit === 'lbs' ? distanceToGoal * KG_TO_LBS : distanceToGoal).toFixed(1)} ${unit} to goal`
      : goalKg
        ? ''
        : 'Set a goal'

  const trendIcon =
    trendDelta !== null
      ? trendDelta < 0
        ? 'trending-down'
        : trendDelta > 0
          ? 'trending-up'
          : 'remove-outline'
      : null

  const trendColor =
    trendDelta !== null
      ? trendDelta < 0
        ? '#30D158'
        : trendDelta > 0
          ? '#FF3B30'
          : subtitleColor
      : subtitleColor

  // ── Date helpers ──────────────────────────────────────────────
  const today = useMemo(() => new Date(), [])
  const isToday = useMemo(() => {
    const d = selectedDate
    const t = today
    return (
      d.getFullYear() === t.getFullYear() &&
      d.getMonth() === t.getMonth() &&
      d.getDate() === t.getDate()
    )
  }, [selectedDate, today])
  const dateStr = selectedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // ── Fitness ring metrics ──────────────────────────────────────
  const cardioMinutes = Math.round(
    workouts.reduce((sum, w) => sum + (w.duration ?? 0), 0),
  )

  const weightLostKg =
    distanceToGoal !== null ? Math.max(-distanceToGoal, 0) : 0
  const weightLostDisplay =
    unit === 'lbs' ? weightLostKg * KG_TO_LBS : weightLostKg
  const weightGoalDisplay =
    goalKg != null
      ? unit === 'lbs'
        ? (goalKg > 0 ? goalKg : 5) * KG_TO_LBS
        : goalKg > 0
          ? goalKg
          : 5
      : unit === 'lbs'
        ? 10
        : 5

  const fitnessMetrics: MetricRing[] = useMemo(
    () => [
      {
        label: 'Calories',
        value: calories,
        goal: 600,
        unit: 'kcal',
        color: '#FF6B35',
        icon: 'flame',
      },
      {
        label: 'Hydration',
        value: hydrationMl,
        goal: hydrationGoal,
        unit: 'ml',
        color: '#2563EB',
        icon: 'water',
      },
      {
        label: 'Weight Loss',
        value: Math.round(weightLostDisplay * 10) / 10,
        goal: Math.round(weightGoalDisplay * 10) / 10,
        unit,
        color: '#30D158',
        icon: 'trending-down',
      },
      {
        label: 'Steps',
        value: steps,
        goal: 10_000,
        unit: 'steps',
        color: '#0EA5E9',
        icon: 'footsteps',
      },
      {
        label: 'Cardio',
        value: cardioMinutes,
        goal: 45,
        unit: 'min',
        color: '#E8707A',
        icon: 'heart-circle',
      },
    ],
    [
      calories,
      hydrationMl,
      hydrationGoal,
      weightLostDisplay,
      weightGoalDisplay,
      unit,
      steps,
      cardioMinutes,
    ],
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

      {/* ── Compact header ────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {/* Health score pill */}
          <View style={styles.healthPill}>
            <View
              style={[styles.healthDot, { backgroundColor: recoveryColor }]}
            />
            <Text style={[styles.healthPillText, { color: recoveryColor }]}>
              {recovery.score}%
            </Text>
          </View>

          {/* Date nav */}
          <View style={styles.dateNav}>
            <TouchableOpacity
              onPress={() => {
                const prev = new Date(focusDate)
                prev.setDate(prev.getDate() - 7)
                setFocusDate(prev)
                handleDateSelected(prev)
              }}
              hitSlop={12}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={18} color={subtitleColor} />
            </TouchableOpacity>
            <Text style={[styles.dateNavLabel, { color: textColor }]}>
              {isToday ? 'TODAY' : dateStr.toUpperCase()}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const next = new Date(focusDate)
                next.setDate(next.getDate() + 7)
                if (next <= new Date()) {
                  setFocusDate(next)
                  handleDateSelected(next)
                }
              }}
              hitSlop={12}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={subtitleColor}
              />
            </TouchableOpacity>
          </View>

          {/* Notification bell */}
          <TouchableOpacity
            style={[styles.settingsBtn, { backgroundColor: cardBg }]}
            activeOpacity={0.7}
            accessibilityLabel="Notifications"
            accessibilityHint="Opens your notifications"
          >
            <Ionicons
              name="notifications-outline"
              size={18}
              color={textColor}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Compact calendar strip ─────────────────────────────── */}
      <CalendarStrip
        focusDate={focusDate}
        selectedDate={selectedDate}
        onFocusDateChange={setFocusDate}
        onDateSelected={handleDateSelected}
        compact
      />

      {/* ── Fitness Metrics Card ─────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          Fitness Metrics
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/fitness-metrics')}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <Text style={[styles.seeAll, { color: accentColor }]}>See All</Text>
        </TouchableOpacity>
      </View>

      <FitnessRingsCard
        metrics={fitnessMetrics}
        onPress={() => router.push('/fitness-metrics')}
      />

      {/* ── Weight ─────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.weightCard, { backgroundColor: cardBg, borderColor }]}
        onPress={() => router.push('/weight')}
        activeOpacity={0.7}
      >
        <View style={styles.weightLeft}>
          <View style={styles.weightHeaderRow}>
            <IconBadge name="scale" color="#FFF" bg={accentColor} size={14} />
            <Text style={[styles.weightLabel, { color: subtitleColor }]}>
              Weight
            </Text>
          </View>
          <View style={styles.weightRow}>
            <Text style={[styles.weightValue, { color: textColor }]}>
              {weightDisplay}
            </Text>
            <Text style={[styles.weightUnit, { color: subtitleColor }]}>
              {unit}
            </Text>
            {trendIcon && (
              <Ionicons
                name={trendIcon as 'trending-down'}
                size={16}
                color={trendColor}
                style={styles.trendIcon}
              />
            )}
          </View>
          {goalDistDisplay ? (
            <Text style={[styles.goalText, { color: accentColor }]}>
              {goalDistDisplay}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={subtitleColor} />
      </TouchableOpacity>

      {/* ── Activity heatmap ───────────────────────────────────── */}
      <ActivityHeatmap />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },
  // ── Header ────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  healthPillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateNavLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Section header ────────────────────────────────────────────
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
  // ── Icon badge ────────────────────────────────────────────────
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Weight card ───────────────────────────────────────────────
  weightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  weightLeft: {
    flex: 1,
  },
  weightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  weightLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  weightValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  weightUnit: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendIcon: {
    marginLeft: 6,
  },
  goalText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
})

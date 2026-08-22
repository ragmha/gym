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

import { ActivityHeatmap } from '@/components/charts/ActivityHeatmap'
import { CalendarStrip } from '@/components/dashboard/CalendarStrip'
import type { MetricRing } from '@/components/dashboard/WorkoutXPCard'
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

const SLEEP_GOAL_HOURS = 8

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

  const { snapshot, refresh } = useHealthSnapshot(selectedDate)
  const sleepHours = snapshot?.sleepHours ?? 0
  const steps = snapshot?.steps ?? 0
  const calories = snapshot?.calories ?? 0
  const workouts = snapshot?.workouts ?? []
  const hrv = snapshot?.hrv ?? 0
  const restingHeartRate = snapshot?.restingHeartRate ?? 0
  const bodyMassKg = snapshot?.bodyMassKg ?? null
  const waterLiters = snapshot?.waterLiters ?? 0

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
  // HealthKit reports body mass in kilograms; there is no user-set unit
  // preference to honour now that the manual weight tracker is gone.
  const weightDisplay = bodyMassKg != null ? bodyMassKg.toFixed(1) : '--'

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
    workouts.reduce((sum, w) => sum + (w.durationMinutes ?? 0), 0),
  )

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
        value: Math.round(waterLiters * 10) / 10,
        goal: 2.5,
        unit: 'L',
        color: '#2563EB',
        icon: 'water',
      },
      {
        label: 'Sleep',
        value: Math.round(sleepHours * 10) / 10,
        goal: SLEEP_GOAL_HOURS,
        unit: 'hrs',
        color: '#30D158',
        icon: 'moon',
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
    [calories, waterLiters, sleepHours, steps, cardioMinutes],
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

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.coachBtn, { backgroundColor: cardBg }]}
              activeOpacity={0.7}
              accessibilityLabel="Open coach"
              accessibilityHint="Opens your AI coach chat"
              onPress={() => router.push('/coach')}
            >
              <Ionicons name="chatbubbles" size={16} color={accentColor} />
              <Text style={[styles.coachBtnText, { color: textColor }]}>
                Coach
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingsBtn, { backgroundColor: cardBg }]}
              activeOpacity={0.7}
              onPress={() => router.push('/settings')}
              accessibilityLabel="Settings"
              accessibilityHint="Opens app settings"
            >
              <Ionicons name="settings-outline" size={18} color={textColor} />
            </TouchableOpacity>
          </View>
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
      <View
        style={[styles.weightCard, { backgroundColor: cardBg, borderColor }]}
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
              kg
            </Text>
          </View>
          <Text style={[styles.goalText, { color: subtitleColor }]}>
            {bodyMassKg != null
              ? 'Latest weigh-in from Health'
              : 'No weigh-in recorded'}
          </Text>
        </View>
      </View>

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
    paddingBottom: 40,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coachBtn: {
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
  },
  coachBtnText: {
    fontSize: 13,
    fontWeight: '700',
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

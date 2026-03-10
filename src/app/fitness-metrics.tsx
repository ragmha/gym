import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useMemo } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useHealthKit } from '@/hooks/useHealthKit'
import { useTheme } from '@/hooks/useThemeColor'
import { useTodayHydration } from '@/stores/HydrationStore'
import { computeRecoveryScore } from '@/utils/recoveryScore'

const SLEEP_GOAL_HOURS = 8
const STEPS_GOAL = 10_000
const CALORIES_GOAL = 600
const HRV_OPTIMAL = 80
const HR_MIN = 50
const HR_MAX = 200

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max)
}

// ── Mini bar chart ───────────────────────────────────────────────────

function MiniBars({
  progress,
  color,
  pattern,
}: {
  progress: number
  color: string
  pattern?: number[]
}) {
  const bars = pattern ?? [0.35, 0.55, 0.45, 0.7, 0.5, 0.8, 0.6, 0.75, 0.65]
  return (
    <View style={miniBarStyles.row}>
      {bars.map((h, i) => {
        const filled = (i + 1) / bars.length <= progress
        return (
          <View
            key={i}
            style={[
              miniBarStyles.bar,
              {
                height: h * 32,
                backgroundColor: filled ? `${color}CC` : `${color}30`,
              },
            ]}
          />
        )
      })}
    </View>
  )
}

const miniBarStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 32,
    marginVertical: 10,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 4,
  },
})

// ── Metric card ──────────────────────────────────────────────────────

interface MetricCardProps {
  label: string
  value: string
  unit?: string
  subtitle?: string
  icon: React.ComponentProps<typeof Ionicons>['name']
  iconColor: string
  progress: number // 0–1
  onPress?: () => void
  cardBg: string
  textColor: string
  subtitleColor: string
  borderColor: string
}

function MetricCard({
  label,
  value,
  unit,
  subtitle,
  icon,
  iconColor,
  progress,
  onPress,
  cardBg,
  textColor,
  subtitleColor,
  borderColor,
}: MetricCardProps) {
  const Wrapper = onPress ? TouchableOpacity : View

  return (
    <Wrapper
      style={[styles.card, { backgroundColor: cardBg, borderColor }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconBadge, { backgroundColor: `${iconColor}1A` }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text style={[styles.cardLabel, { color: subtitleColor }]}>
          {label}
        </Text>
        {onPress && (
          <Ionicons
            name="chevron-forward"
            size={14}
            color={subtitleColor}
            style={styles.chevron}
          />
        )}
      </View>

      <MiniBars progress={clamp(progress, 0, 1)} color={iconColor} />

      <View style={styles.cardFooter}>
        <Text style={[styles.cardValue, { color: textColor }]}>
          {value}
          {unit ? (
            <Text style={[styles.cardUnit, { color: subtitleColor }]}>
              {' '}
              {unit}
            </Text>
          ) : null}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.cardSubtitle, { color: subtitleColor }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Progress bar */}
      <View
        style={[styles.progressTrack, { backgroundColor: `${iconColor}20` }]}
      >
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: iconColor,
              width: `${Math.round(clamp(progress, 0, 1) * 100)}%`,
            },
          ]}
        />
      </View>
    </Wrapper>
  )
}

// ── Screen ───────────────────────────────────────────────────────────

export default function FitnessMetricsScreen() {
  const router = useRouter()

  const theme = useTheme()
  const {
    cardBackground: cardBg,
    text: textColor,
    subtitleText: subtitleColor,
    border: borderColor,
    background: backgroundColor,
  } = theme

  const {
    steps,
    calories,
    sleepHours,
    heartRate,
    hrv,
    restingHeartRate,
    flightsClimbed,
  } = useHealthKit()

  const { totalMl: hydrationMl, goalMl: hydrationGoal } = useTodayHydration()
  const hydrationProgress = hydrationGoal > 0 ? hydrationMl / hydrationGoal : 0

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

  const metrics: MetricCardProps[] = [
    {
      label: 'Recovery Score',
      value: `${recovery.score}`,
      unit: '%',
      subtitle: recovery.label,
      icon: 'shield-checkmark',
      iconColor: recoveryColor,
      progress: recovery.score / 100,
      cardBg,
      textColor,
      subtitleColor,
      borderColor,
    },
    {
      label: 'Steps',
      value: steps > 0 ? steps.toLocaleString() : '--',
      subtitle: `Goal: ${STEPS_GOAL.toLocaleString()}`,
      icon: 'footsteps',
      iconColor: '#2563EB',
      progress: steps / STEPS_GOAL,
      onPress: () => router.push('/steps'),
      cardBg,
      textColor,
      subtitleColor,
      borderColor,
    },
    {
      label: 'Calories',
      value: calories > 0 ? calories.toLocaleString() : '--',
      unit: 'kcal',
      subtitle: `Goal: ${CALORIES_GOAL} kcal`,
      icon: 'flame',
      iconColor: '#F97316',
      progress: calories / CALORIES_GOAL,
      cardBg,
      textColor,
      subtitleColor,
      borderColor,
    },
    {
      label: 'Sleep',
      value: sleepHours > 0 ? sleepHours.toFixed(1) : '--',
      unit: 'hrs',
      subtitle: `Goal: ${SLEEP_GOAL_HOURS} hrs`,
      icon: 'moon',
      iconColor: '#8B5CF6',
      progress: sleepHours / SLEEP_GOAL_HOURS,
      cardBg,
      textColor,
      subtitleColor,
      borderColor,
    },
    {
      label: 'Hydration',
      value: hydrationMl > 0 ? hydrationMl.toLocaleString() : '--',
      unit: 'ml',
      subtitle: `Goal: ${hydrationGoal} ml`,
      icon: 'water',
      iconColor: '#0EA5E9',
      progress: hydrationProgress,
      onPress: () => router.push('/hydration'),
      cardBg,
      textColor,
      subtitleColor,
      borderColor,
    },
    {
      label: 'Heart Rate',
      value: heartRate > 0 ? `${heartRate}` : '--',
      unit: 'bpm',
      subtitle: 'Latest reading',
      icon: 'heart',
      iconColor: '#EF4444',
      progress:
        heartRate > 0 ? 1 - (heartRate - HR_MIN) / (HR_MAX - HR_MIN) : 0,
      cardBg,
      textColor,
      subtitleColor,
      borderColor,
    },
    {
      label: 'HRV',
      value: hrv > 0 ? `${hrv}` : '--',
      unit: 'ms',
      subtitle: 'Heart rate variability',
      icon: 'pulse',
      iconColor: '#10B981',
      progress: hrv > 0 ? hrv / HRV_OPTIMAL : 0,
      cardBg,
      textColor,
      subtitleColor,
      borderColor,
    },
    {
      label: 'Resting HR',
      value: restingHeartRate > 0 ? `${restingHeartRate}` : '--',
      unit: 'bpm',
      subtitle: 'Resting heart rate',
      icon: 'heart-half',
      iconColor: '#F59E0B',
      progress:
        restingHeartRate > 0 ? 1 - (restingHeartRate - 40) / (100 - 40) : 0,
      cardBg,
      textColor,
      subtitleColor,
      borderColor,
    },
    {
      label: 'Flights Climbed',
      value: flightsClimbed > 0 ? `${flightsClimbed}` : '--',
      subtitle: 'Floors climbed today',
      icon: 'trending-up',
      iconColor: '#6366F1',
      progress: flightsClimbed / 20,
      cardBg,
      textColor,
      subtitleColor,
      borderColor,
    },
  ]

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>
          Fitness Metrics
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 'auto',
  },
  cardFooter: {
    gap: 2,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cardUnit: {
    fontSize: 13,
    fontWeight: '500',
  },
  cardSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
})

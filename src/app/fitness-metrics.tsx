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

import { CoachInsightCard } from '@/components/health/CoachInsightCard'
import { useDailyCoachInsight } from '@/hooks/useDailyCoachInsight'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useTheme, useThemeColor } from '@/hooks/useThemeColor'
import {
  DASHBOARD_GOALS,
  presentCalories,
  presentFlightsClimbed,
  presentHeartRate,
  presentHrv,
  presentRestingHr,
  presentSleep,
  presentSteps,
  type MetricPresentation,
  type MetricRoute,
} from '@/lib/fitnessMetrics'
import { useDailyHydration } from '@/stores/HydrationStore'
import { useDailyNutrition } from '@/stores/MealStore'
import { useRecoveryPresentation } from '@/utils/recovery'

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
  metric: MetricPresentation
  iconColor: string
  onPress?: () => void
  cardBg: string
  textColor: string
  subtitleColor: string
  borderColor: string
}

function MetricCard({
  metric,
  iconColor,
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
          <Ionicons name={metric.iconName} size={16} color={iconColor} />
        </View>
        <Text style={[styles.cardLabel, { color: subtitleColor }]}>
          {metric.label}
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

      <MiniBars progress={metric.progress} color={iconColor} />

      <View style={styles.cardFooter}>
        <Text style={[styles.cardValue, { color: textColor }]}>
          {metric.value}
          {metric.unit ? (
            <Text style={[styles.cardUnit, { color: subtitleColor }]}>
              {' '}
              {metric.unit}
            </Text>
          ) : null}
        </Text>
        <Text
          style={[styles.cardSubtitle, { color: subtitleColor }]}
          numberOfLines={1}
        >
          {metric.subtitle}
        </Text>
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
              width: `${Math.round(clamp(metric.progress, 0, 1) * 100)}%`,
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
  const cardBg = useThemeColor({}, 'cardBackground')
  const textColor = useThemeColor({}, 'text')
  const subtitleColor = useThemeColor({}, 'subtitleText')
  const borderColor = useThemeColor({}, 'border')
  const backgroundColor = useThemeColor({}, 'background')
  const { snapshot } = useHealthSnapshot()
  const sleepHours = snapshot?.sleepHours ?? 0
  const hrv = snapshot?.hrv ?? 0
  const restingHeartRate = snapshot?.restingHeartRate ?? 0
  const recoveryPresentation = useRecoveryPresentation({
    hrv,
    restingHR: restingHeartRate,
    sleepHours,
    hrvBaseline: null,
    rhrBaseline: null,
    sleepGoalHours: DASHBOARD_GOALS.sleepGoalHours,
  })
  const recovery = snapshot ? recoveryPresentation : null
  const hydration = useDailyHydration()
  const nutrition = useDailyNutrition()
  const { insight, status: insightStatus } = useDailyCoachInsight({
    snapshot,
    recovery,
  })
  const metrics = useMemo<MetricPresentation[]>(
    () => [
      {
        id: 'recovery',
        label: 'Recovery Score',
        value: `${recoveryPresentation.score}`,
        unit: '%',
        subtitle: recoveryPresentation.label,
        iconName: 'shield-checkmark',
        accentColorToken: recoveryPresentation.accentColorToken,
        progress: Math.min(Math.max(recoveryPresentation.score / 100, 0), 1),
        status:
          recoveryPresentation.score <= 0
            ? 'empty'
            : recoveryPresentation.score >= 100
              ? 'reached'
              : 'progress',
      },
      presentSteps(snapshot),
      presentCalories(snapshot),
      {
        id: 'nutrition-intake',
        label: 'Calories Eaten',
        value:
          nutrition.totals.caloriesKcal > 0
            ? Math.round(nutrition.totals.caloriesKcal).toLocaleString()
            : '--',
        unit: 'kcal',
        subtitle: `Goal: ${nutrition.targets.caloriesKcal.toLocaleString()} kcal`,
        iconName: 'restaurant',
        accentColorToken: 'metricNutrition',
        progress: Math.min(Math.max(nutrition.progress.calories, 0), 1),
        route: '/nutrition',
        status:
          nutrition.totals.caloriesKcal === 0
            ? 'empty'
            : nutrition.totals.caloriesKcal >= nutrition.targets.caloriesKcal
              ? nutrition.totals.caloriesKcal >
                nutrition.targets.caloriesKcal * 1.05
                ? 'over'
                : 'reached'
              : 'progress',
      },
      presentSleep(snapshot),
      {
        id: 'hydration',
        label: 'Hydration',
        value: hydration.totalMl > 0 ? hydration.formattedTotal : '--',
        unit: 'ml',
        subtitle: `Goal: ${hydration.goalMl} ml`,
        iconName: 'water',
        accentColorToken: 'metricHydration',
        progress: Math.min(Math.max(hydration.progress, 0), 1),
        route: '/hydration',
        status: hydration.status,
      },
      presentHeartRate(snapshot),
      presentHrv(snapshot),
      presentRestingHr(snapshot),
      presentFlightsClimbed(snapshot),
    ],
    [snapshot, recoveryPresentation, hydration, nutrition],
  )

  const createMetricPressHandler = (route?: MetricRoute) => {
    if (!route) {
      return undefined
    }

    return () => router.push(route)
  }

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
        <CoachInsightCard insight={insight} status={insightStatus} />
        {metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            metric={metric}
            iconColor={theme[metric.accentColorToken]}
            onPress={createMetricPressHandler(metric.route)}
            cardBg={cardBg}
            textColor={textColor}
            subtitleColor={subtitleColor}
            borderColor={borderColor}
          />
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

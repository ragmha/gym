import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useCallback, useMemo, useState } from 'react'
import {
  LayoutAnimation,
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
import { RecoveryGauge } from '@/components/RecoveryGauge'
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

  const [recoveryExpanded, setRecoveryExpanded] = useState(false)
  const [focusDate, setFocusDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const handleDateSelected = useCallback((date: Date) => {
    setSelectedDate(date)
    setFocusDate(date)
  }, [])

  const {
    steps,
    calories,
    sleepHours,
    heartRate,
    hrv,
    restingHeartRate,
    refresh,
  } = useHealthKit(selectedDate)

  const { latestEntry, distanceToGoal, goalKg, unit, trendDelta } =
    useWeightStore()

  const { totalMl: hydrationMl, goalMl: hydrationGoal } = useTodayHydration()
  const hydrationProgress =
    hydrationGoal > 0 ? Math.min(hydrationMl / hydrationGoal, 1) : 0
  const hydrationProgressLabel = Math.round(hydrationProgress * 100)
  const hydrationBars = useMemo(
    () =>
      [0.24, 0.3, 0.36, 0.43, 0.5, 0.58, 0.66, 0.75, 0.84].map((base, i) =>
        Math.min(
          0.96,
          Math.max(0.22, base * 0.45 + hydrationProgress * (0.4 + i * 0.03)),
        ),
      ),
    [hydrationProgress],
  )

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

  const sleepPercent = Math.round((sleepHours / SLEEP_GOAL_HOURS) * 100)

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

  // ── Greeting ──────────────────────────────────────────────────
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
  const hour = today.getHours()
  const greeting =
    hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'

  const toggleRecovery = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setRecoveryExpanded((v) => !v)
  }, [])

  return (
    <ScrollView
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <StatusBar barStyle="light-content" />

      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.dateLabel, { color: subtitleColor }]}>
            {dateStr.toUpperCase()}
          </Text>
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
        <Text style={[styles.greeting, { color: textColor }]}>
          {isToday ? `${greeting}!` : dateStr}
        </Text>
        {/* Health badge */}
        <View style={styles.healthBadgeRow}>
          <View
            style={[styles.healthBadge, { backgroundColor: recoveryColor }]}
          >
            <Ionicons name="star" size={10} color="#000" />
          </View>
          <Text style={[styles.healthBadgeText, { color: recoveryColor }]}>
            {recovery.score}% Healthy
          </Text>
        </View>
      </View>

      {/* ── Calendar strip ─────────────────────────────────────── */}
      <CalendarStrip
        focusDate={focusDate}
        selectedDate={selectedDate}
        onFocusDateChange={setFocusDate}
        onDateSelected={handleDateSelected}
      />

      {/* ── Fitness Metrics — horizontal scroll ────────────────── */}
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.metricsScroll}
      >
        {/* Score — orange solid */}
        <TouchableOpacity
          style={[styles.metricChip, { backgroundColor: accentColor }]}
          onPress={toggleRecovery}
          activeOpacity={0.7}
        >
          <View style={styles.metricChipTop}>
            <Text style={styles.metricChipLabelLight}>Score</Text>
            <IconBadge
              name="shield-checkmark"
              color={accentColor}
              bg="rgba(255,255,255,0.25)"
              size={14}
            />
          </View>
          <View style={styles.miniBars}>
            {[0.35, 0.6, 0.45, 0.8, 0.5, 0.7, 0.55, 0.9, 0.65].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.miniBar,
                  {
                    height: h * 38,
                    backgroundColor: 'rgba(255,255,255,0.3)',
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.metricChipValueLight}>
            {recovery.score}
            <Text style={styles.metricChipUnitLight}>%</Text>
          </Text>
        </TouchableOpacity>

        {/* Steps — blue solid */}
        <TouchableOpacity
          style={[styles.metricChip, { backgroundColor: '#2563EB' }]}
          onPress={() => router.push('/steps')}
          activeOpacity={0.7}
        >
          <View style={styles.metricChipTop}>
            <Text style={styles.metricChipLabelLight}>Steps</Text>
            <IconBadge
              name="footsteps"
              color="#2563EB"
              bg="rgba(255,255,255,0.25)"
              size={14}
            />
          </View>
          <View style={styles.miniBars}>
            {[0.3, 0.5, 0.75, 0.4, 0.65, 0.85, 0.5, 0.7, 0.6].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.miniBar,
                  {
                    height: h * 38,
                    backgroundColor: 'rgba(255,255,255,0.25)',
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.metricChipValueLight}>
            {steps > 0 ? steps.toLocaleString() : '--'}
          </Text>
        </TouchableOpacity>

        {/* Hydration — blue solid */}
        <TouchableOpacity
          style={[styles.metricChip, { backgroundColor: '#2563EB' }]}
          onPress={() => router.push('/hydration')}
          activeOpacity={0.7}
          accessibilityLabel="Hydration metric"
          accessibilityHint="Opens the hydration screen"
        >
          <View style={styles.metricChipTop}>
            <Text style={styles.metricChipLabelLight}>Hydration</Text>
            <IconBadge
              name="water"
              color="#2563EB"
              bg="rgba(255,255,255,0.25)"
              size={14}
            />
          </View>
          <View style={styles.miniBars}>
            {hydrationBars.map((h, i) => (
              <View
                key={i}
                style={[
                  styles.miniBar,
                  {
                    height: h * 38,
                    backgroundColor:
                      i / hydrationBars.length < hydrationProgress
                        ? 'rgba(255,255,255,0.42)'
                        : 'rgba(255,255,255,0.18)',
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.metricChipValueLight}>
            {hydrationMl > 0 ? hydrationMl.toLocaleString() : '--'}
            <Text style={styles.metricChipUnitLight}> ml</Text>
          </Text>
          <Text style={styles.metricChipMetaLight}>
            {hydrationProgressLabel}% of {hydrationGoal}ml goal
          </Text>
        </TouchableOpacity>

        {/* Calories — orange solid */}
        <View style={[styles.metricChip, { backgroundColor: accentColor }]}>
          <View style={styles.metricChipTop}>
            <Text style={styles.metricChipLabelLight}>Calories</Text>
            <IconBadge
              name="flame"
              color={accentColor}
              bg="rgba(255,255,255,0.25)"
              size={14}
            />
          </View>
          <View style={styles.miniBars}>
            {[0.55, 0.4, 0.7, 0.45, 0.85, 0.35, 0.75, 0.6, 0.5].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.miniBar,
                  {
                    height: h * 38,
                    backgroundColor: 'rgba(255,255,255,0.3)',
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.metricChipValueLight}>
            {calories > 0 ? calories.toLocaleString() : '--'}
            <Text style={styles.metricChipUnitLight}> kcal</Text>
          </Text>
        </View>

        {/* Sleep — blue solid */}
        <View style={[styles.metricChip, { backgroundColor: '#2563EB' }]}>
          <View style={styles.metricChipTop}>
            <Text style={styles.metricChipLabelLight}>Sleep</Text>
            <IconBadge
              name="moon"
              color="#2563EB"
              bg="rgba(255,255,255,0.25)"
              size={14}
            />
          </View>
          <View style={styles.miniBars}>
            {[0.65, 0.5, 0.6, 0.8, 0.4, 0.9, 0.55, 0.7, 0.6].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.miniBar,
                  {
                    height: h * 38,
                    backgroundColor: 'rgba(255,255,255,0.25)',
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.metricChipValueLight}>
            {sleepHours > 0 ? sleepHours.toFixed(1) : '--'}
            <Text style={styles.metricChipUnitLight}> hrs</Text>
          </Text>
        </View>
      </ScrollView>

      {/* ── Expandable recovery detail ─────────────────────────── */}
      {recoveryExpanded && (
        <>
          <RecoveryGauge
            recovery={recovery.score}
            strain={0}
            heartRate={heartRate}
            sleepPercent={sleepPercent}
          />
          <View
            style={[
              styles.insightCard,
              {
                backgroundColor: cardBg,
                borderLeftColor: recoveryColor,
                borderColor,
              },
            ]}
          >
            <Text style={[styles.insightTitle, { color: textColor }]}>
              {recovery.label}
            </Text>
            <Text style={[styles.insightBody, { color: subtitleColor }]}>
              {recovery.description}
            </Text>
          </View>
        </>
      )}

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
    paddingBottom: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
  },
  healthBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  healthBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthBadgeText: {
    fontSize: 13,
    fontWeight: '700',
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
  // ── Metric chips (horizontal scroll) ──────────────────────────
  metricsScroll: {
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 4,
    marginBottom: 16,
  },
  metricChip: {
    width: 162,
    borderRadius: 20,
    padding: 16,
  },
  metricChipTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricChipLabelLight: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  metricChipValueLight: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  metricChipUnitLight: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  metricChipMetaLight: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
  },
  miniBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 40,
    marginBottom: 10,
  },
  miniBar: {
    flex: 1,
    marginHorizontal: 1.5,
    borderRadius: 4,
    minWidth: 8,
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
  // ── Insight card ──────────────────────────────────────────────
  insightCard: {
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  insightBody: {
    fontSize: 13,
    lineHeight: 18,
  },
})

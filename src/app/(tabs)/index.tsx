import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useMemo, useState } from 'react'
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { ActivityCardGrid } from '@/components/ActivityCardGrid'
import { CalendarStrip } from '@/components/CalendarStrip'
import { DailyProgressRings } from '@/components/DailyProgressRings'
import Header from '@/components/Header'
import { KeyStatistics } from '@/components/KeyStatistics'
import { RecoveryGauge } from '@/components/RecoveryGauge'
import { SummaryTabs } from '@/components/SummaryTabs'
import { useHealthKit } from '@/hooks/useHealthKit'
import { useThemeColor } from '@/hooks/useThemeColor'
import { useWeightStore } from '@/stores/WeightStore'
import { computeRecoveryScore } from '@/utils/recoveryScore'

type Tab = 'Overview' | 'Sleep' | 'Recovery' | 'Strain'

const STEPS_GOAL = 10_000
const CALORIES_GOAL = 500
const SLEEP_GOAL_HOURS = 8
const WATER_BOTTLE_LITERS = 0.5
const KG_TO_LBS = 2.20462

export default function HomeScreen() {
  const router = useRouter()
  const backgroundColor = useThemeColor({}, 'background')
  const cardBg = useThemeColor({}, 'cardBackground')
  const textColor = useThemeColor({}, 'text')
  const subtitleColor = useThemeColor({}, 'subtitleText')

  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  const {
    steps,
    calories,
    sleepHours,
    heartRate,
    hrv,
    restingHeartRate,
    waterLiters,
  } = useHealthKit()

  const { latestEntry, distanceToGoal, goalKg, unit, trendDelta } =
    useWeightStore()

  const waterBottles = Math.round(waterLiters / WATER_BOTTLE_LITERS)

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

  // ── Tab content renderers ─────────────────────────────────────
  const renderOverview = () => (
    <>
      {/* Recovery summary */}
      <RecoveryGauge
        recovery={recovery.score}
        strain={0}
        heartRate={heartRate}
        sleepPercent={sleepPercent}
      />

      {/* Weight widget */}
      <TouchableOpacity
        style={[styles.weightCard, { backgroundColor: cardBg }]}
        onPress={() => router.push('/weight')}
        activeOpacity={0.7}
      >
        <View style={styles.weightLeft}>
          <Text style={[styles.weightLabel, { color: subtitleColor }]}>
            WEIGHT
          </Text>
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
                size={18}
                color={trendColor}
                style={styles.trendIcon}
              />
            )}
          </View>
          {goalDistDisplay ? (
            <Text style={[styles.goalText, { color: '#FFB800' }]}>
              {goalDistDisplay}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={subtitleColor} />
      </TouchableOpacity>

      {/* Progress rings */}
      <DailyProgressRings
        sleepMinutes={Math.round(sleepHours * 60)}
        sleepGoalMinutes={SLEEP_GOAL_HOURS * 60}
        calories={calories}
        caloriesGoal={CALORIES_GOAL}
        steps={steps}
        stepsGoal={STEPS_GOAL}
      />

      {/* Insight card */}
      <View
        style={[
          styles.insightCard,
          {
            backgroundColor: cardBg,
            borderLeftColor:
              recovery.score >= 67
                ? '#30D158'
                : recovery.score >= 34
                  ? '#E8C558'
                  : '#E8707A',
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

      {/* Activity cards + key stats */}
      <ActivityCardGrid
        steps={steps}
        stepsGoal={STEPS_GOAL}
        sleepHours={sleepHours}
        waterBottles={waterBottles}
        heartRate={heartRate}
      />
      <KeyStatistics
        stats={[
          {
            icon: 'pulse-outline',
            iconColor: '#30D158',
            label: 'HRV',
            value: hrv > 0 ? String(hrv) : '--',
            trend: 'up',
          },
          {
            icon: 'heart-outline',
            iconColor: '#E8707A',
            label: 'Resting HR',
            value: restingHeartRate > 0 ? `${restingHeartRate}` : '--',
            trend: 'neutral',
          },
          {
            icon: 'moon-outline',
            iconColor: '#5B9BD5',
            label: 'Sleep',
            value: sleepHours > 0 ? `${sleepHours}h` : '--',
            trend: 'neutral',
          },
          {
            icon: 'flame-outline',
            iconColor: '#E8707A',
            label: 'Calories',
            value: calories > 0 ? calories.toLocaleString() : '--',
            trend: 'up',
          },
        ]}
      />
    </>
  )

  const renderRecovery = () => (
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
            borderLeftColor:
              recovery.score >= 67
                ? '#30D158'
                : recovery.score >= 34
                  ? '#E8C558'
                  : '#E8707A',
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
      <View style={styles.statsSection}>
        <Text style={[styles.statsSectionTitle, { color: textColor }]}>
          RECOVERY STATISTICS
        </Text>
        {[
          {
            label: 'HRV',
            value: hrv > 0 ? `${hrv} ms` : '--',
            icon: 'pulse-outline' as const,
            color: '#30D158',
          },
          {
            label: 'Resting HR',
            value: restingHeartRate > 0 ? `${restingHeartRate} bpm` : '--',
            icon: 'heart-outline' as const,
            color: '#E8707A',
          },
          {
            label: 'SpO2',
            value: '--',
            icon: 'water-outline' as const,
            color: '#5B9BD5',
          },
          {
            label: 'Skin Temp',
            value: '--',
            icon: 'thermometer-outline' as const,
            color: '#E8C558',
          },
        ].map((stat) => (
          <View
            key={stat.label}
            style={[
              styles.statRow,
              { borderBottomColor: `${subtitleColor}20` },
            ]}
          >
            <Ionicons name={stat.icon} size={20} color={stat.color} />
            <Text style={[styles.statRowLabel, { color: textColor }]}>
              {stat.label}
            </Text>
            <Text style={[styles.statRowValue, { color: textColor }]}>
              {stat.value}
            </Text>
          </View>
        ))}
      </View>
    </>
  )

  const renderPlaceholder = (label: string) => (
    <View style={styles.placeholder}>
      <Ionicons name="construct-outline" size={48} color={subtitleColor} />
      <Text style={[styles.placeholderText, { color: subtitleColor }]}>
        {label} — Coming soon
      </Text>
    </View>
  )

  return (
    <ScrollView
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={styles.content}
    >
      <StatusBar barStyle="light-content" />
      <Header />
      <CalendarStrip />
      <SummaryTabs onTabChange={(tab) => setActiveTab(tab)} />

      {activeTab === 'Overview' && renderOverview()}
      {activeTab === 'Recovery' && renderRecovery()}
      {activeTab === 'Sleep' && renderPlaceholder('Sleep')}
      {activeTab === 'Strain' && renderPlaceholder('Strain')}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  // ── Weight card ───────────────────────────────────────────────
  weightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  weightLeft: {
    flex: 1,
  },
  weightLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  weightValue: {
    fontSize: 28,
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
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  // ── Insight card ──────────────────────────────────────────────
  insightCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  insightBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  // ── Recovery stats ────────────────────────────────────────────
  statsSection: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  statsSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  statRowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  statRowValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  // ── Placeholder ───────────────────────────────────────────────
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '500',
  },
})

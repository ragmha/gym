import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useCallback, useMemo, useState } from 'react'
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { CalendarStrip } from '@/components/CalendarStrip'
import Header from '@/components/Header'
import { RecoveryGauge } from '@/components/RecoveryGauge'
import { SummaryTabs, type Tab } from '@/components/SummaryTabs'
import { useHealthKit } from '@/hooks/useHealthKit'
import { useThemeColor } from '@/hooks/useThemeColor'
import { useWeightStore } from '@/stores/WeightStore'
import { computeRecoveryScore } from '@/utils/recoveryScore'

const SLEEP_GOAL_HOURS = 8
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
    refresh,
  } = useHealthKit()

  const { latestEntry, distanceToGoal, goalKg, unit, trendDelta } =
    useWeightStore()

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
      {/* Compact recovery banner — tap to switch to Recovery tab */}
      <TouchableOpacity
        style={[styles.recoveryBanner, { backgroundColor: cardBg }]}
        onPress={() => setActiveTab('Recovery')}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.recoveryDot,
            {
              backgroundColor:
                recovery.score >= 67
                  ? '#30D158'
                  : recovery.score >= 34
                    ? '#E8C558'
                    : '#E8707A',
            },
          ]}
        />
        <View style={styles.recoveryBannerText}>
          <Text style={[styles.recoveryBannerScore, { color: textColor }]}>
            Recovery {recovery.score}%
          </Text>
          <Text
            style={[styles.recoveryBannerLabel, { color: subtitleColor }]}
            numberOfLines={1}
          >
            {recovery.label}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={subtitleColor} />
      </TouchableOpacity>

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

      {/* Quick stats — 2 key metrics */}
      <View style={styles.quickStats}>
        <TouchableOpacity
          style={[styles.quickStatItem, { backgroundColor: cardBg }]}
          onPress={() => router.push('/steps')}
          activeOpacity={0.7}
        >
          <Text style={[styles.quickStatValue, { color: textColor }]}>
            {steps > 0 ? steps.toLocaleString() : '--'}
          </Text>
          <Text style={[styles.quickStatUnit, { color: '#E8C558' }]}>
            steps
          </Text>
          <Text style={[styles.quickStatLabel, { color: subtitleColor }]}>
            Steps
          </Text>
        </TouchableOpacity>
        <View style={[styles.quickStatItem, { backgroundColor: cardBg }]}>
          <Text style={[styles.quickStatValue, { color: textColor }]}>
            {calories > 0 ? `${calories}` : '--'}
          </Text>
          <Text style={[styles.quickStatUnit, { color: '#E8707A' }]}>kcal</Text>
          <Text style={[styles.quickStatLabel, { color: subtitleColor }]}>
            Calories
          </Text>
        </View>
      </View>
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <StatusBar barStyle="light-content" />
      <Header />
      <CalendarStrip />
      <SummaryTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'Overview' && renderOverview()}
      {activeTab === 'Recovery' && renderRecovery()}
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
  // ── Quick stats ───────────────────────────────────────────────
  quickStats: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  quickStatItem: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  quickStatUnit: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  // ── Recovery banner ───────────────────────────────────────────
  recoveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  recoveryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  recoveryBannerText: {
    flex: 1,
  },
  recoveryBannerScore: {
    fontSize: 16,
    fontWeight: '700',
  },
  recoveryBannerLabel: {
    fontSize: 12,
    marginTop: 2,
  },
})

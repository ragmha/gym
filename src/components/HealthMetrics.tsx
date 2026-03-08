import React from 'react'
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { ProgressCard } from '@/components/ProgressCard'
import { useThemeColor } from '@/hooks/useThemeColor'
import type { HealthKitWorkout } from '@/lib/healthkit'

interface HealthMetricsProps {
  isAvailable: boolean
  isAuthorized: boolean
  isLoading: boolean
  calories: number
  workouts: HealthKitWorkout[]
  onRequestAuth: () => void
  onRefresh: () => void
}

const CALORIE_GOAL = 500

export function HealthMetrics({
  isAvailable,
  isAuthorized,
  isLoading,
  calories,
  workouts,
  onRequestAuth,
  onRefresh,
}: HealthMetricsProps) {
  const cardBackgroundColor = useThemeColor({}, 'cardBackground')
  const textColor = useThemeColor({}, 'text')
  const subtextColor = useThemeColor({}, 'icon')

  // Show fallback on non-iOS platforms
  if (Platform.OS !== 'ios' || !isAvailable) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          Health Data
        </Text>
        <View
          style={[styles.connectCard, { backgroundColor: cardBackgroundColor }]}
        >
          <Text style={styles.connectIcon}>💪</Text>
          <View style={styles.connectTextContainer}>
            <Text style={[styles.connectTitle, { color: textColor }]}>
              Health tracking unavailable
            </Text>
            <Text style={[styles.connectSubtitle, { color: subtextColor }]}>
              Calories and workout data require Apple Health on iOS
            </Text>
          </View>
        </View>
      </View>
    )
  }

  // Not authorized — show connect prompt
  if (!isAuthorized) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          Apple Health
        </Text>
        <TouchableOpacity
          style={[styles.connectCard, { backgroundColor: cardBackgroundColor }]}
          onPress={onRequestAuth}
          activeOpacity={0.7}
        >
          <Text style={styles.connectIcon}>❤️</Text>
          <View style={styles.connectTextContainer}>
            <Text style={[styles.connectTitle, { color: textColor }]}>
              Connect Apple Health
            </Text>
            <Text style={[styles.connectSubtitle, { color: subtextColor }]}>
              View your steps, calories, and workouts
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          {"Today's Health"}
        </Text>
        <ActivityIndicator size="small" style={styles.loader} />
      </View>
    )
  }

  const todayWorkouts = workouts.filter((w) => {
    const workoutDate = new Date(w.start)
    const today = new Date()
    return workoutDate.toDateString() === today.toDateString()
  })

  const totalWorkoutMinutes = Math.round(
    todayWorkouts.reduce((sum, w) => sum + (w.duration ?? 0), 0),
  )

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          {"Today's Health"}
        </Text>
        <TouchableOpacity onPress={onRefresh} hitSlop={8}>
          <Text style={[styles.refreshText, { color: subtextColor }]}>
            Refresh
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <ProgressCard
            title="Calories"
            subtitle={`${calories} / ${CALORIE_GOAL} kcal`}
            progress={Math.min(calories / CALORIE_GOAL, 1)}
            progressColor="#FF9500"
            cardBackgroundColor={cardBackgroundColor}
            textColor={textColor}
            progressCircleSize={44}
            strokeWidth={6}
          />
        </View>
      </View>

      {todayWorkouts.length > 0 && (
        <View
          style={[
            styles.workoutSummary,
            { backgroundColor: cardBackgroundColor },
          ]}
        >
          <Text style={[styles.workoutTitle, { color: textColor }]}>
            {'🏋️ '}
            {todayWorkouts.length} workout
            {todayWorkouts.length > 1 ? 's' : ''} today
          </Text>
          <Text style={[styles.workoutDetail, { color: subtextColor }]}>
            {totalWorkoutMinutes} min total
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  refreshText: {
    fontSize: 14,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
  },
  connectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  connectIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  connectTextContainer: {
    flex: 1,
  },
  connectTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  connectSubtitle: {
    fontSize: 13,
  },
  workoutSummary: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workoutTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  workoutDetail: {
    fontSize: 13,
  },
  loader: {
    marginTop: 20,
  },
})

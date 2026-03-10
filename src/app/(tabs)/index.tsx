import React, { useMemo } from 'react'
import { ScrollView, StatusBar, StyleSheet, Text } from 'react-native'

import { CalendarStrip } from '@/components/CalendarStrip'
import { DailyProgressRings } from '@/components/DailyProgressRings'
import { OverviewStats } from '@/components/OverviewStats'
import { WeightTracker } from '@/components/WeightTracker'
import { useHealthKit } from '@/hooks/useHealthKit'
import { useThemeColor } from '@/hooks/useThemeColor'
import { useExerciseStore } from '@/stores/ExerciseStore'

// Demo defaults used when HealthKit is unavailable
const DEMO_SLEEP_MINUTES = 365 // 6h 5min
const SLEEP_GOAL_MINUTES = 480 // 8h
const CALORIES_GOAL = 2_000
const STEPS_GOAL = 6_000

export default function HomeScreen() {
  const textColor = useThemeColor({}, 'text')

  const { isDemoMode, steps, calories, workouts } = useHealthKit()

  const { exercises } = useExerciseStore()

  // Compute overview stats from exercise store + health data
  const totalExerciseCount = useMemo(
    () =>
      Object.values(exercises).reduce(
        (sum, ex) => sum + ex.exercises.length,
        0,
      ),
    [exercises],
  )

  const totalWorkoutMinutes = useMemo(
    () => Math.round(workouts.reduce((sum, w) => sum + (w.duration ?? 0), 0)),
    [workouts],
  )

  const totalCaloriesBurnt = useMemo(
    () =>
      Math.round(workouts.reduce((sum, w) => sum + (w.calories ?? 0), 0)) ||
      calories,
    [workouts, calories],
  )

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar />
      <Text style={[styles.screenTitle, { color: textColor }]}>Statistics</Text>
      <CalendarStrip />
      <OverviewStats
        caloriesBurnt={totalCaloriesBurnt}
        totalMinutes={totalWorkoutMinutes}
        exerciseCount={totalExerciseCount}
      />
      <DailyProgressRings
        sleepMinutes={isDemoMode ? DEMO_SLEEP_MINUTES : 0}
        sleepGoalMinutes={SLEEP_GOAL_MINUTES}
        calories={calories}
        caloriesGoal={CALORIES_GOAL}
        steps={steps}
        stepsGoal={STEPS_GOAL}
      />
      <WeightTracker />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  content: {
    paddingBottom: 32,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
})

import React from 'react'
import { ScrollView, StatusBar, StyleSheet } from 'react-native'

import { CalendarStrip } from '@/components/CalendarStrip'
import { DailySteps } from '@/components/DailySteps'
import { HealthMetrics } from '@/components/HealthMetrics'
import { WorkoutProgress } from '@/components/WorkoutProgress'
import { useHealthKit } from '@/hooks/useHealthKit'

export default function HomeScreen() {
  const {
    isAvailable,
    isAuthorized,
    isLoading,
    steps,
    calories,
    workouts,
    requestAuthorization,
    refresh,
  } = useHealthKit()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar />
      <CalendarStrip />
      <WorkoutProgress />
      {isAuthorized && <DailySteps steps={steps} />}
      <HealthMetrics
        isAvailable={isAvailable}
        isAuthorized={isAuthorized}
        isLoading={isLoading}
        calories={calories}
        workouts={workouts}
        onRequestAuth={requestAuthorization}
        onRefresh={refresh}
      />
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
})

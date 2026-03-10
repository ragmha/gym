import React from 'react'
import { ScrollView, StatusBar, StyleSheet } from 'react-native'

import { ActivityCardGrid } from '@/components/ActivityCardGrid'
import { CalendarStrip } from '@/components/CalendarStrip'
import Header from '@/components/Header'
import { KeyStatistics } from '@/components/KeyStatistics'
import { useHealthKit } from '@/hooks/useHealthKit'
import { useThemeColor } from '@/hooks/useThemeColor'

// Demo defaults used when HealthKit is unavailable
const DEMO_SLEEP_HOURS = 6
const STEPS_GOAL = 10_000

export default function HomeScreen() {
  const backgroundColor = useThemeColor({}, 'background')

  const { isDemoMode, steps, calories } = useHealthKit()

  const displaySteps = isDemoMode ? 8104 : steps
  const displayHeartRate = isDemoMode ? 95 : 72
  const displaySleepHours = isDemoMode ? DEMO_SLEEP_HOURS : 0

  return (
    <ScrollView
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={styles.content}
    >
      <StatusBar barStyle="light-content" />

      {/* Date header */}
      <Header />

      {/* Calendar strip */}
      <CalendarStrip />

      {/* Activity cards 2×2 grid */}
      <ActivityCardGrid
        steps={displaySteps}
        stepsGoal={STEPS_GOAL}
        sleepHours={displaySleepHours}
        waterBottles={isDemoMode ? 3 : 0}
        heartRate={displayHeartRate}
      />

      {/* Key Statistics */}
      <KeyStatistics
        stats={[
          {
            icon: 'pulse-outline',
            iconColor: '#30D158',
            label: 'HRV',
            value: isDemoMode ? '88' : '--',
            subValue: isDemoMode ? '65' : undefined,
            trend: 'up',
          },
          {
            icon: 'moon-outline',
            iconColor: '#5B9BD5',
            label: 'Sleep Performance',
            value: isDemoMode ? '38%' : '--',
            subValue: isDemoMode ? '67%' : undefined,
            trend: 'down',
          },
          {
            icon: 'flame-outline',
            iconColor: '#E8707A',
            label: 'Calories',
            value: isDemoMode ? '1,250' : calories.toLocaleString(),
            trend: 'up',
          },
        ]}
      />
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
})

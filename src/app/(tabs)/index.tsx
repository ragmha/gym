import React from 'react'
import { ScrollView, StatusBar, StyleSheet } from 'react-native'

import { ActivityCardGrid } from '@/components/ActivityCardGrid'
import { CalendarStrip } from '@/components/CalendarStrip'
import Header from '@/components/Header'
import { KeyStatistics } from '@/components/KeyStatistics'
import { useHealthKit } from '@/hooks/useHealthKit'
import { useThemeColor } from '@/hooks/useThemeColor'

const STEPS_GOAL = 10_000
const WATER_BOTTLE_LITERS = 0.5 // 500 ml per "bottle"

export default function HomeScreen() {
  const backgroundColor = useThemeColor({}, 'background')

  const { steps, calories, sleepHours, heartRate, hrv, waterLiters } =
    useHealthKit()

  // Convert liters to bottle count (rounded)
  const waterBottles = Math.round(waterLiters / WATER_BOTTLE_LITERS)

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
        steps={steps}
        stepsGoal={STEPS_GOAL}
        sleepHours={sleepHours}
        waterBottles={waterBottles}
        heartRate={heartRate}
      />

      {/* Key Statistics */}
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

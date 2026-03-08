import React from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'

import { CircularProgress } from '@/components/CircularProgress'
import { useThemeColor } from '@/hooks/useThemeColor'

export interface DailyStepsProps {
  steps: number
  goal?: number
}

const DEFAULT_STEP_GOAL = 10_000

export function DailySteps({
  steps,
  goal = DEFAULT_STEP_GOAL,
}: DailyStepsProps) {
  const cardBg = useThemeColor({}, 'cardBackground')
  const textColor = useThemeColor({}, 'text')
  const subtextColor = useThemeColor({}, 'icon')

  if (Platform.OS !== 'ios') {
    return (
      <View
        style={[styles.container, { backgroundColor: cardBg }]}
        testID="daily-steps-card"
      >
        <View style={styles.details}>
          <Text style={[styles.title, { color: textColor }]}>Daily Steps</Text>
          <Text style={[styles.subtitle, { color: subtextColor }]}>
            Step tracking requires Apple Health on iOS
          </Text>
        </View>
      </View>
    )
  }

  const progress = Math.min((steps / goal) * 100, 100)
  const remaining = Math.max(goal - steps, 0)
  const goalReached = steps >= goal

  return (
    <View
      style={[styles.container, { backgroundColor: cardBg }]}
      testID="daily-steps-card"
    >
      <View style={styles.progressWrapper}>
        <CircularProgress
          value={progress}
          radius={40}
          duration={1200}
          activeStrokeWidth={10}
          inActiveStrokeWidth={10}
          activeStrokeColor={goalReached ? '#34C759' : '#007AFF'}
          inActiveStrokeColor={
            goalReached ? 'rgba(52,199,89,0.2)' : 'rgba(0,122,255,0.15)'
          }
          maxValue={100}
        >
          <Text style={[styles.progressValue, { color: textColor }]}>
            {Math.round(progress)}%
          </Text>
        </CircularProgress>
      </View>

      <View style={styles.details}>
        <Text style={[styles.title, { color: textColor }]}>Daily Steps</Text>
        <Text style={[styles.stepCount, { color: textColor }]}>
          {steps.toLocaleString()}
        </Text>
        <Text style={[styles.subtitle, { color: subtextColor }]}>
          {goalReached
            ? `Goal reached! 🎉`
            : `${remaining.toLocaleString()} steps to go`}
        </Text>
        <View style={styles.goalBadge}>
          <Text style={[styles.goalText, { color: subtextColor }]}>
            Goal: {goal.toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  progressWrapper: {
    marginRight: 16,
  },
  details: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  stepCount: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 6,
  },
  goalBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.1)',
  },
  goalText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '700',
  },
})

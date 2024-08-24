import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { ProgressCircle } from 'react-native-svg-charts'
import { useThemeColor } from '@/hooks/useThemeColor'
import { useExerciseStore } from '@/data/store'

export function WorkoutProgress() {
  const cardBackgroundColor = useThemeColor({}, 'cardBackground')
  const textColor = useThemeColor({}, 'text')
  const progressColor = useThemeColor({}, 'selectedCircle')

  const exercisesCompleted = useExerciseStore((store) => store.completedCount)
  const totalExercises = useExerciseStore((store) => store.exercises).length

  const progress =
    totalExercises > 0 ? exercisesCompleted() / totalExercises : 0
  const percentage = Math.round(progress * 100)

  return (
    <View style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: textColor }]}>
          Workout Progress
        </Text>
        <Text style={[styles.subtitle, { color: textColor }]}>
          {totalExercises - exercisesCompleted()} Workouts left
        </Text>
      </View>
      <View style={styles.progressContainer}>
        <ProgressCircle
          style={styles.progressCircle}
          progress={progress}
          progressColor={progressColor}
          backgroundColor={'#333'}
          strokeWidth={8}
        />
        <View style={styles.progressTextContainer}>
          <Text style={[styles.percentageText, { color: textColor }]}>
            {percentage}%
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 5,
  },
  progressContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircle: {
    height: 50,
    width: 50,
  },
  progressTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  percentageText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
})

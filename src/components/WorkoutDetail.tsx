import { useThemeColor } from '@/hooks/useThemeColor'
import React, { useEffect, useLayoutEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, {
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

type Exercise = {
  id: string
  title: string
  sets: number
  reps: number
  variation: string | null
}

type WorkoutDetailProps = {
  item: Exercise
  onComplete?: (isComplete: boolean) => void
}

export default function WorkoutDetail({
  item,
  onComplete,
}: WorkoutDetailProps) {
  const defaultSets = isNaN(item.sets) ? 1 : item.sets

  const [selectedCircles, setSelectedCircles] = useState(
    Array.from({ length: defaultSets }, () => false)
  )

  const opacity = useSharedValue(1)

  useEffect(() => {
    opacity.value = withTiming(0.2, { duration: 100 }, () => {
      opacity.value = withTiming(1, { duration: 200 })
    })
  }, [])

  const toggleCircle = (index: number) => {
    const newSelectedCircles = [...selectedCircles]
    const wasCircleSelected = newSelectedCircles[index]

    newSelectedCircles[index] = !wasCircleSelected
    setSelectedCircles(newSelectedCircles)

    const allCompleted = newSelectedCircles.every((circle) => circle === true)
    onComplete?.(allCompleted)
  }

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    }
  })

  const backgroundColor = useThemeColor({}, 'background')
  const textColor = useThemeColor({}, 'text')
  const selectedCircleColor = useThemeColor({}, 'selectedCircle')
  const shadowColor = useThemeColor({}, 'shadow')

  return (
    <Animated.View
      style={[
        styles.workoutItem,
        animatedStyle,
        { backgroundColor, shadowColor },
      ]}
      entering={SlideInDown}
    >
      <View style={styles.workoutDetails}>
        <View style={styles.workoutTitleWithSets}>
          <Text style={[styles.workoutTitle, { color: textColor }]}>
            {item.title}
          </Text>
          <Text style={[styles.setDetails, { color: textColor }]}>
            {Number.isNaN(item.sets) ? 1 : item.sets} × {item.reps} 20kg
          </Text>
        </View>
        <View style={styles.circlesContainer}>
          {Array.from({ length: defaultSets }).map((_, index) => {
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.circle,
                  selectedCircles[index] && {
                    backgroundColor: selectedCircleColor,
                    borderColor: '#FFFFFF',
                  },
                ]}
                onPress={() => toggleCircle(index)}
              >
                <Text
                  style={[
                    styles.repsText,
                    { color: selectedCircles[index] ? '#FFFFFF' : textColor },
                  ]}
                >
                  {item.reps}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  workoutDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  workoutTitleWithSets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutTitle: {
    fontSize: 16,
  },
  setDetails: {
    fontSize: 14,
  },
  circlesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  repsText: {
    fontWeight: '400',
    fontSize: 16,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
})

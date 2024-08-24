import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { Link } from 'expo-router'

import { useThemeColor } from '@/hooks/useThemeColor'

type WorkoutItem = {
  id: string
  title: string
  date: string
  color: string
  completed: boolean
  duration?: string
}

const Workout = ({ item }: { item: WorkoutItem }) => {
  const opacity = useSharedValue(1)

  useEffect(() => {
    opacity.value = withTiming(0.2, { duration: 100 }, () => {
      opacity.value = withTiming(1, { duration: 200 })
    })
  }, [])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    }
  })

  const backgroundColor = useThemeColor({}, 'background')
  const textColor = useThemeColor({}, 'text')
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
      <Link
        href={{
          pathname: '/details/[id]',
          params: { id: item.id, title: item.title },
        }}
      >
        <View style={styles.container}>
          <View
            style={[styles.workoutColorBlock, { backgroundColor: item.color }]}
          />
          <View style={styles.workoutDetails}>
            <Text
              style={[
                styles.workoutTitle,
                { color: textColor },
                item.completed && styles.completed,
              ]}
            >
              {item.title}
            </Text>
            <Text style={[styles.workoutDate, { color: textColor }]}>
              {item.date}
            </Text>
          </View>
        </View>
      </Link>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  workoutItem: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  workoutColorBlock: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginRight: 15,
  },
  workoutDetails: {
    flexShrink: 1,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  workoutDate: {
    marginTop: 5,
    fontSize: 14,
  },
  completed: {
    textDecorationLine: 'line-through',
    color: 'gray',
  },
})

export default Workout

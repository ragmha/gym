import VideoPlayer from '@/components/VideoPlayer'
import { useExerciseStore } from '@/stores/ExerciseStore'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

const DetailsScreen = () => {
  const navigation = useNavigation()
  const { id, title } = useLocalSearchParams()
  
  // Memoize selector to prevent unnecessary re-renders
  const exerciseSelector = useMemo(
    () => (state: ReturnType<typeof useExerciseStore.getState>) => {
      const byLocalId = state.exercises[id as string]
      if (byLocalId) return byLocalId
      return Object.values(state.exercises).find((item) => item.id === id)
    },
    [id]
  )
  
  const exercise = useExerciseStore(exerciseSelector)

  useEffect(() => {
    navigation.setOptions({
      title,
    })
  }, [navigation, title])

  return (
    <View style={styles.container}>
      {exercise?.videoURL && <VideoPlayer uri={exercise.videoURL} />}
    </View>
  )
}

export default DetailsScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

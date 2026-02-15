import VideoPlayer from '@/components/VideoPlayer'
import { useExerciseStore } from '@/stores/ExerciseStore'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'

const DetailsScreen = () => {
  const navigation = useNavigation()
  const { id, title } = useLocalSearchParams()
  const exercise = useExerciseStore((state) => {
    const byLocalId = state.exercises[id as string]
    if (byLocalId) return byLocalId
    return Object.values(state.exercises).find((item) => item.id === id)
  })

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

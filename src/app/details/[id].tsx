import VideoPlayer from '@/components/VideoPlayer'
import { useExerciseStore } from '@/stores/ExerciseStore'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'

function DetailsScreen() {
  const navigation = useNavigation()
  const { localId, title } = useLocalSearchParams()
  const { exercises } = useExerciseStore()
  const exercise = exercises[localId as string]

  useEffect(() => {
    navigation.setOptions({
      title,
    })
  }, [navigation, title])

  return (
    <View style={styles.container}>
      {exercise && <VideoPlayer uri={exercise.videoURL} />}
    </View>
  )
}

export default DetailsScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

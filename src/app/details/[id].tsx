import VideoPlayer from '@/components/VideoPlayer'
import { state$ } from '@/stores/ExerciseStore'
import { observer } from '@legendapp/state/react'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'

const DetailsScreen = observer(() => {
  const navigation = useNavigation()
  const { localId, title } = useLocalSearchParams()
  const exercise = state$.exercises[localId as string].get()

  useEffect(() => {
    navigation.setOptions({
      title,
    })
  }, [title])

  return (
    <View style={styles.container}>
      {exercise && <VideoPlayer uri={exercise.videoURL} />}
    </View>
  )
})

export default DetailsScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

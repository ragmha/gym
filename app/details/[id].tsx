import { FlatList, View, StyleSheet } from "react-native"

import WorkoutDetail from "@/components/WorkoutDetail"
import { useLocalSearchParams } from "expo-router"
import VideoPlayer from "@/components/VideoPlayer"
import { useExerciseStore } from "@/data/store"

export default function DetailsScreen() {
  const { id } = useLocalSearchParams()
  const exercises = useExerciseStore((store) =>
    store.exercises.find((e) => e.id === id)
  )
  const exercise = useExerciseStore((store) => store.exercise(id))
  const detail = useExerciseStore((store) => store.detail(id))
  console.log({ detail, exercise, exercises })

  return (
    <View style={styles.container}>
      {exercise && <VideoPlayer uri={exercise.videoURL} />}
      <FlatList
        data={detail}
        renderItem={({ item }) => <WorkoutDetail item={item} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

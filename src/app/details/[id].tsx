import { FlatList, View, StyleSheet } from 'react-native'
import WorkoutDetail from '@/components/WorkoutDetail'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import VideoPlayer from '@/components/VideoPlayer'
import { useExerciseStore } from '@/stores/ExerciseStore'
import { useState, useCallback, useLayoutEffect } from 'react'

export default function DetailsScreen() {
  const { id, title } = useLocalSearchParams()

  const exercise = useExerciseStore((store) => store.exercise(id))
  const detail = useExerciseStore((store) => store.detail(id))

  const navigation = useNavigation()

  const [completedStatus, setCompletedStatus] = useState(
    detail.map((d) => d.completed),
  )

  const completeExerciseDetail = useExerciseStore(
    (store) => store.completeExerciseDetail,
  )

  const onExerciseComplete = useCallback(
    (index: number, isComplete: boolean, selectedSets: boolean[]) => {
      const newCompletedStatus = [...completedStatus]
      newCompletedStatus[index] = isComplete
      setCompletedStatus(newCompletedStatus)

      // Update the store with the new detail completion status
      completeExerciseDetail(id, detail[index].id, isComplete, selectedSets)
    },
    [completedStatus, id, detail, completeExerciseDetail],
  )

  useLayoutEffect(() => {
    const completedCount = completedStatus.filter(Boolean).length
    navigation.setOptions({
      title: `${title} (${completedCount}/${detail.length})`,
    })
  }, [completedStatus, title, navigation, detail.length])

  return (
    <View style={styles.container}>
      {exercise && (
        <>
          <VideoPlayer uri={exercise.videoURL} />
          <FlatList
            data={detail}
            renderItem={({ item, index }) => (
              <WorkoutDetail
                item={item}
                onComplete={(isComplete, selectedSets) =>
                  onExerciseComplete(index, isComplete, selectedSets)
                }
                exerciseId={exercise?.id}
              />
            )}
            keyExtractor={(item) => item.id}
          />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

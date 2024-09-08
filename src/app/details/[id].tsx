import { View, StyleSheet, FlatList } from 'react-native'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import VideoPlayer from '@/components/VideoPlayer'
import { useExerciseStore } from '@/stores/ExerciseStore'
import React, { useState, useCallback, useLayoutEffect, useEffect } from 'react'
import { CardioDetails } from '@/components/CardioDetails'
import WorkoutDetail from '@/components/WorkoutDetail'

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

  const completeExercise = useExerciseStore((store) => store.completeExercise)

  const onExerciseComplete = useCallback(
    (index: number, isComplete: boolean, selectedSets: boolean[]) => {
      const newCompletedStatus = [...completedStatus]
      newCompletedStatus[index] = isComplete
      setCompletedStatus(newCompletedStatus)

      // Update the store with the new detail completion status
      completeExerciseDetail(id, detail[index].id, isComplete, selectedSets)
    },
    [completedStatus, completeExerciseDetail, id, detail],
  )

  useLayoutEffect(() => {
    const completedCount = completedStatus.filter(Boolean).length
    navigation.setOptions({
      title: `${title} (${completedCount}/${detail.length})`,
    })
  }, [completedStatus, detail.length, navigation, title])

  useEffect(() => {
    if (completedStatus.every(Boolean)) {
      completeExercise(id)
    }
  }, [completedStatus, completeExercise, id])

  console.log(exercise)

  return (
    <View style={styles.container}>
      {exercise && (
        <>
          <VideoPlayer uri={exercise.videoURL} />
          <CardioDetails
            morning={exercise.cardio.morning}
            evening={exercise.cardio.evening}
          />
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

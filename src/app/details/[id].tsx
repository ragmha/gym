import { CardioDetails } from '@/components/CardioDetails'
import VideoPlayer from '@/components/VideoPlayer'
import WorkoutDetail from '@/components/WorkoutDetail'
import { useThemeColor } from '@/hooks/useThemeColor'
import { useExerciseStore } from '@/stores/ExerciseStore'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useCallback, useEffect } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

function DetailsScreen() {
  const navigation = useNavigation()
  const { id, title } = useLocalSearchParams()
  const { exercises, completeExerciseDetail, completeExercise } =
    useExerciseStore()
  const exercise = exercises[id as string]
  const textColor = useThemeColor({}, 'text')

  useEffect(() => {
    navigation.setOptions({
      title,
    })
  }, [navigation, title])

  const handleExerciseComplete = useCallback(
    (detailId: string, isComplete: boolean, selectedSets: boolean[]) => {
      if (!exercise) return
      completeExerciseDetail(
        exercise.localId,
        detailId,
        isComplete,
        selectedSets,
      )

      const allCompleted = exercise.exercises.every((e) =>
        e.id === detailId ? isComplete : e.completed,
      )
      if (allCompleted) {
        completeExercise(exercise.localId)
      }
    },
    [exercise, completeExerciseDetail, completeExercise],
  )

  return (
    <ScrollView style={styles.container}>
      {exercise && (
        <>
          <VideoPlayer uri={exercise.videoURL} />

          {exercise.cardio && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Cardio
              </Text>
              <CardioDetails
                morning={exercise.cardio.morning}
                evening={exercise.cardio.evening}
              />
            </View>
          )}

          {exercise.exercises.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Exercises
              </Text>
              {exercise.exercises.map((detail) => (
                <WorkoutDetail
                  key={detail.id}
                  item={detail}
                  exerciseId={exercise.localId}
                  onComplete={(isComplete, selectedSets) =>
                    handleExerciseComplete(detail.id, isComplete, selectedSets)
                  }
                />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  )
}

export default DetailsScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
    marginBottom: 8,
  },
})

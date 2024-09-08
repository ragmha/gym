import { useExerciseStore } from '@/stores/ExerciseStore'
import { useThemeColor } from '@/hooks/useThemeColor'
import { ProgressCard } from './ProgessCard'
import { TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useCallback } from 'react'

export function WorkoutProgress() {
  const router = useRouter()
  const cardBackgroundColor = useThemeColor({}, 'cardBackground')
  const textColor = useThemeColor({}, 'text')
  const progressColor = useThemeColor({}, 'selectedCircle')

  const exercisesCompleted = useExerciseStore((store) => store.completedCount)
  const totalExercises = useExerciseStore((store) => store.exercises).length

  const progress =
    totalExercises > 0 ? exercisesCompleted() / totalExercises : 0

  const handleNavigation = useCallback(() => {
    router.push('/workouts')
  }, [router])

  return (
    <TouchableOpacity onPress={handleNavigation}>
      <ProgressCard
        title="Workout Progress"
        subtitle={`${totalExercises - exercisesCompleted()} Workouts left`}
        progress={progress}
        progressColor={progressColor}
        cardBackgroundColor={cardBackgroundColor}
        textColor={textColor}
      />
    </TouchableOpacity>
  )
}

import { useThemeColor } from '@/hooks/useThemeColor'
import { useExerciseStore } from '@/stores/ExerciseStore'
import { useRouter } from 'expo-router'
import { useCallback } from 'react'
import { TouchableOpacity } from 'react-native'
import { ProgressCard } from './ProgessCard'

export function WorkoutProgress() {
  const router = useRouter()
  const cardBackgroundColor = useThemeColor({}, 'cardBackground')
  const textColor = useThemeColor({}, 'text')
  const progressColor = useThemeColor({}, 'selectedCircle')

  const { completedCount, exercises } = useExerciseStore()
  const totalExercises = Object.keys(exercises).length

  const progress = totalExercises > 0 ? completedCount / totalExercises : 0

  const handleNavigation = useCallback(() => {
    router.push('/workouts')
  }, [router])

  return (
    <TouchableOpacity onPress={handleNavigation}>
      <ProgressCard
        title="Workout Progress"
        subtitle={`${totalExercises - completedCount} Workouts left`}
        progress={progress}
        progressColor={progressColor}
        cardBackgroundColor={cardBackgroundColor}
        textColor={textColor}
      />
    </TouchableOpacity>
  )
}

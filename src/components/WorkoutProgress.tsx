import { useExerciseStore } from '@/data/store'
import { useThemeColor } from '@/hooks/useThemeColor'
import { ProgressCard } from './ProgessCard'

export function WorkoutProgress() {
  const cardBackgroundColor = useThemeColor({}, 'cardBackground')
  const textColor = useThemeColor({}, 'text')
  const progressColor = useThemeColor({}, 'selectedCircle')

  const exercisesCompleted = useExerciseStore((store) => store.completedCount)
  const totalExercises = useExerciseStore((store) => store.exercises).length

  const progress =
    totalExercises > 0 ? exercisesCompleted() / totalExercises : 0

  return (
    <ProgressCard
      title="Workout Progress"
      subtitle={`${totalExercises - exercisesCompleted()} Workouts left`}
      progress={progress}
      progressColor={progressColor}
      cardBackgroundColor={cardBackgroundColor}
      textColor={textColor}
    />
  )
}

export interface ExerciseDetail {
  id: string
  title: string
  sets: number | 'To Failure'
  reps: number
  variation: string | null
  completed: boolean
  selectedSets: boolean[]
}

export interface Exercise {
  id: string
  title: string
  videoURL: string
  date: string
  color: string
  completed: boolean
  cardio: {
    morning: number
    evening: number
  }
  exercises: ExerciseDetail[]
  localId: string
  synced: boolean
  deleted?: boolean
}

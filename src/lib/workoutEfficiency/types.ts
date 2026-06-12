export interface WorkoutEfficiencyExercise {
  detailId: string
  title: string
  volumeKg: number
  completedSets: number
  totalSets: number
  topSetKg: number
}

export interface PriorSessionAggregate {
  completedAt: string
  totalVolumeKg: number
}

export interface WorkoutEfficiency {
  totalVolumeKg: number
  completedSets: number
  totalSets: number
  completionRate: number
  durationMinutes: number | null
  sessionDensityKgPerMin: number | null
  perExercise: WorkoutEfficiencyExercise[]
  weekOverWeekVolumePct: number | null
}

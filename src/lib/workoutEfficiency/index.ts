import type { WorkoutSession, WorkoutTemplate } from '@/types/models'
import type { PriorSessionAggregate, WorkoutEfficiency } from './types'

export { fetchPriorAggregates } from './fetchPriorAggregates'
export type {
  PriorSessionAggregate,
  WorkoutEfficiency,
  WorkoutEfficiencyExercise,
} from './types'

export function computeWorkoutEfficiency(
  session: WorkoutSession,
  template: WorkoutTemplate,
  history: readonly PriorSessionAggregate[] = [],
): WorkoutEfficiency {
  const perExercise = template.exercises.map((exercise) => {
    const progress = session.exerciseProgress[exercise.id]
    const totalSets = Math.max(0, progress?.setsOverride ?? exercise.sets)
    const reps = Math.max(0, progress?.repsOverride ?? exercise.reps)
    const selectedSets = progress?.selectedSets ?? []
    const weights = progress?.weightPerSet ?? []

    let volumeKg = 0
    let completedSets = 0
    let topSetKg = 0

    for (let index = 0; index < totalSets; index++) {
      if (!selectedSets[index]) {
        continue
      }

      completedSets += 1
      const weightKg = Math.max(0, weights[index] ?? 0)
      volumeKg += reps * weightKg
      topSetKg = Math.max(topSetKg, weightKg)
    }

    return {
      detailId: exercise.id,
      title: exercise.title,
      volumeKg,
      completedSets,
      totalSets,
      topSetKg,
    }
  })

  const totalVolumeKg = sum(perExercise.map((exercise) => exercise.volumeKg))
  const completedSets = sum(
    perExercise.map((exercise) => exercise.completedSets),
  )
  const totalSets = sum(perExercise.map((exercise) => exercise.totalSets))
  const completionRate = totalSets > 0 ? completedSets / totalSets : 0
  const durationMinutes = getDurationMinutes(session)
  const sessionDensityKgPerMin =
    durationMinutes !== null && durationMinutes > 0
      ? totalVolumeKg / durationMinutes
      : null

  return {
    totalVolumeKg,
    completedSets,
    totalSets,
    completionRate,
    durationMinutes,
    sessionDensityKgPerMin,
    perExercise,
    weekOverWeekVolumePct: findWeekOverWeekVolumePct(totalVolumeKg, history),
  }
}

function getDurationMinutes(session: WorkoutSession): number | null {
  if (!session.completedAt) {
    return null
  }

  const started = new Date(session.startedAt).getTime()
  const completed = new Date(session.completedAt).getTime()

  if (!Number.isFinite(started) || !Number.isFinite(completed)) {
    return null
  }

  return Math.max(0, (completed - started) / 60000)
}

function findWeekOverWeekVolumePct(
  totalVolumeKg: number,
  history: readonly PriorSessionAggregate[],
): number | null {
  const previous = history
    .filter((entry) => Number.isFinite(new Date(entry.completedAt).getTime()))
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    )[0]

  if (!previous || previous.totalVolumeKg <= 0) {
    return null
  }

  return (
    ((totalVolumeKg - previous.totalVolumeKg) / previous.totalVolumeKg) * 100
  )
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

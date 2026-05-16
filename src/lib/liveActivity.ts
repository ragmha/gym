import {
  areActivitiesEnabled,
  endActivity,
  startActivity,
  updateActivity,
  type WorkoutActivityStateInput,
} from '../../modules/live-activity'

type WorkoutActivityUpdate = {
  exerciseName: string
  currentSet: number
  totalSets: number
  restEndsAt: Date | null
}

let activeActivityId: string | null = null

function toStateInput(
  update: WorkoutActivityUpdate,
): WorkoutActivityStateInput {
  return {
    exerciseName: update.exerciseName,
    currentSet: Math.max(1, Math.round(update.currentSet)),
    totalSets: Math.max(1, Math.round(update.totalSets)),
    restEndsAt: update.restEndsAt ? update.restEndsAt.toISOString() : null,
  }
}

export async function startWorkoutActivity(
  workoutName: string,
  initialState: WorkoutActivityUpdate,
): Promise<void> {
  if (!(await areActivitiesEnabled())) return

  activeActivityId = await startActivity(
    {
      workoutName,
      startedAt: new Date().toISOString(),
    },
    toStateInput(initialState),
  )
}

export async function updateWorkoutActivity(
  update: WorkoutActivityUpdate,
): Promise<void> {
  if (!activeActivityId) return
  await updateActivity(activeActivityId, toStateInput(update))
}

export async function endWorkoutActivity(): Promise<void> {
  if (!activeActivityId) return
  await endActivity(activeActivityId)
  activeActivityId = null
}

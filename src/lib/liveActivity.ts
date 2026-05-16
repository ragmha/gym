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

const activeActivityIds = new Map<string, string>()

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
  sessionId: string,
  workoutName: string,
  initialState: WorkoutActivityUpdate,
): Promise<void> {
  if (!(await areActivitiesEnabled())) return
  if (activeActivityIds.has(sessionId)) return

  const activityId = await startActivity(
    {
      workoutName,
      startedAt: new Date().toISOString(),
    },
    toStateInput(initialState),
  )
  if (activityId) {
    activeActivityIds.set(sessionId, activityId)
  }
}

export async function updateWorkoutActivity(
  sessionId: string,
  update: WorkoutActivityUpdate,
): Promise<void> {
  const activeActivityId = activeActivityIds.get(sessionId)
  if (!activeActivityId) return
  await updateActivity(activeActivityId, toStateInput(update))
}

export async function endWorkoutActivity(sessionId: string): Promise<void> {
  const activeActivityId = activeActivityIds.get(sessionId)
  if (!activeActivityId) return
  await endActivity(activeActivityId)
  activeActivityIds.delete(sessionId)
}

import { Platform } from 'react-native'

const APP_GROUP = 'group.io.raghib.gym'
const SNAPSHOT_KEY = 'todaySnapshot'
const WIDGET_KIND = 'GymTodayWidget'
let lastSerializedSnapshot: string | null = null

export interface TodaySnapshot {
  date: string
  steps: number
  stepsGoal: number
  workoutXp: number
  lastWorkoutAt: string | null
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function buildTodaySnapshot(
  steps: number | null | undefined,
  stepsGoal: number | null | undefined,
  workoutXp: number | null | undefined,
  lastWorkoutAt: Date | string | null | undefined,
): TodaySnapshot {
  const safeSteps = Math.max(0, Math.round(steps ?? 0))
  const safeGoal = Math.max(1, Math.round(stepsGoal ?? 10_000))
  const safeXp = Math.max(0, Math.round(workoutXp ?? 0))

  const parsedLastWorkout =
    lastWorkoutAt instanceof Date
      ? lastWorkoutAt
      : typeof lastWorkoutAt === 'string' && lastWorkoutAt.length > 0
        ? new Date(lastWorkoutAt)
        : null

  return {
    date: toISODate(new Date()),
    steps: safeSteps,
    stepsGoal: safeGoal,
    workoutXp: safeXp,
    lastWorkoutAt:
      parsedLastWorkout && !Number.isNaN(parsedLastWorkout.getTime())
        ? parsedLastWorkout.toISOString()
        : null,
  }
}

export function pushTodaySnapshot(snapshot: TodaySnapshot): void {
  if (Platform.OS !== 'ios') {
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ExtensionStorage } = require('@bacons/apple-targets') as {
    ExtensionStorage: {
      new (group: string): { set: (key: string, value: string) => void }
      reloadWidget: (name?: string) => void
    }
  }

  const storage = new ExtensionStorage(APP_GROUP)
  const serialized = JSON.stringify(snapshot)
  if (serialized === lastSerializedSnapshot) {
    return
  }
  storage.set(SNAPSHOT_KEY, serialized)
  lastSerializedSnapshot = serialized
  ExtensionStorage.reloadWidget(WIDGET_KIND)
}

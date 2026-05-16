import { requireNativeModule } from 'expo-modules-core'
import { Platform } from 'react-native'

export type WorkoutActivityAttributesInput = {
  workoutName: string
  startedAt: string
}

export type WorkoutActivityStateInput = {
  exerciseName: string
  currentSet: number
  totalSets: number
  restEndsAt: string | null
}

type LiveActivityNativeModule = {
  startActivity: (
    attrs: WorkoutActivityAttributesInput,
    state: WorkoutActivityStateInput,
  ) => Promise<string | null>
  updateActivity: (
    id: string,
    state: WorkoutActivityStateInput,
  ) => Promise<void>
  endActivity: (id: string) => Promise<void>
  areActivitiesEnabled: () => Promise<boolean>
}

function getNativeModule(): LiveActivityNativeModule | null {
  if (Platform.OS !== 'ios') return null
  try {
    return requireNativeModule<LiveActivityNativeModule>('LiveActivity')
  } catch {
    return null
  }
}

export async function startActivity(
  attrs: WorkoutActivityAttributesInput,
  state: WorkoutActivityStateInput,
): Promise<string | null> {
  const nativeModule = getNativeModule()
  if (!nativeModule) return null
  return nativeModule.startActivity(attrs, state)
}

export async function updateActivity(
  id: string,
  state: WorkoutActivityStateInput,
): Promise<void> {
  const nativeModule = getNativeModule()
  if (!nativeModule) return
  await nativeModule.updateActivity(id, state)
}

export async function endActivity(id: string): Promise<void> {
  const nativeModule = getNativeModule()
  if (!nativeModule) return
  await nativeModule.endActivity(id)
}

export async function areActivitiesEnabled(): Promise<boolean> {
  const nativeModule = getNativeModule()
  if (!nativeModule) return false
  return nativeModule.areActivitiesEnabled()
}

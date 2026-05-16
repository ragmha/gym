import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import {
  endWorkoutActivity,
  startWorkoutActivity,
  updateWorkoutActivity,
} from '@/lib/liveActivity'
import { supabase } from '@/lib/supabase'
import { workoutSessionInsertSchema } from '@/lib/validators'
import type { WorkoutSessionInsert } from '@/lib/validators'
import type { WorkoutSession, WorkoutTemplate } from '@/types/models'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'

interface SessionState {
  sessions: Record<string, WorkoutSession>
  startSession: (template: WorkoutTemplate) => WorkoutSession
  toggleSet: (sessionId: string, detailId: string, setIdx: number) => void
  setWeightForExercise: (
    sessionId: string,
    detailId: string,
    kg: number,
  ) => void
  setWeightForSet: (
    sessionId: string,
    detailId: string,
    setIdx: number,
    kg: number,
  ) => void
  updateCardio: (
    sessionId: string,
    cardio: { morning: number; evening: number },
  ) => void
  toggleCardioDone: (sessionId: string, slot: 'morning' | 'evening') => void
  updateExerciseOverrides: (
    sessionId: string,
    detailId: string,
    updates: {
      sets?: number
      reps?: number
      defaultWeight?: number
      variation?: string | null
    },
  ) => void
  complete: (sessionId: string) => Promise<void>
  setRestEndsAt: (sessionId: string, restEndsAt: string | null) => void
  getActiveSessionForTemplate: (
    templateId: string,
  ) => WorkoutSession | undefined
}

const templateBySessionId = new Map<string, WorkoutTemplate>()
const restEndsAtBySessionId = new Map<string, string | null>()

function getLiveActivityState(
  session: WorkoutSession,
  template: WorkoutTemplate,
) {
  const details = template.exercises
  let focused = details[0]
  let focusedProgress = focused
    ? session.exerciseProgress[focused.id]
    : undefined

  for (const detail of details) {
    const progress = session.exerciseProgress[detail.id]
    if (!progress?.selectedSets.every(Boolean)) {
      focused = detail
      focusedProgress = progress
      break
    }
  }

  const totalSets = Math.max(
    1,
    focusedProgress?.setsOverride ?? focused?.sets ?? 1,
  )
  const completedSets = focusedProgress
    ? focusedProgress.selectedSets.filter(Boolean).length
    : 0
  const currentSet = Math.min(totalSets, completedSets + 1)
  const restEndsAtRaw = restEndsAtBySessionId.get(session.id)

  return {
    exerciseName: focused?.title ?? 'Exercise',
    currentSet,
    totalSets,
    restEndsAt: restEndsAtRaw ? new Date(restEndsAtRaw) : null,
  }
}

function syncLiveActivity(
  sessionId: string,
  fallbackSession?: WorkoutSession,
): void {
  const state = useWorkoutSessionStoreBase.getState()
  const session = state.sessions[sessionId] ?? fallbackSession
  const template = templateBySessionId.get(sessionId)
  if (!session || !template || session.status !== 'in-progress') return

  void updateWorkoutActivity(sessionId, getLiveActivityState(session, template))
}

function createProgress(
  template: WorkoutTemplate,
): WorkoutSession['exerciseProgress'] {
  return Object.fromEntries(
    template.exercises.map((detail) => [
      detail.id,
      {
        detailId: detail.id,
        selectedSets: Array.from({ length: detail.sets }, () => false),
        weightPerSet: Array.from({ length: detail.sets }, () => 0),
      },
    ]),
  )
}

export function completedSetCount(session: WorkoutSession): number {
  return Object.values(session.exerciseProgress).reduce(
    (count, progress) => count + progress.selectedSets.filter(Boolean).length,
    0,
  )
}

export function totalSetCount(session: WorkoutSession): number {
  return Object.values(session.exerciseProgress).reduce(
    (count, progress) => count + progress.selectedSets.length,
    0,
  )
}

export function totalVolumeKg(
  session: WorkoutSession,
  template: WorkoutTemplate,
): number {
  let volume = 0
  for (const detail of template.exercises) {
    const progress = session.exerciseProgress[detail.id]
    if (!progress) continue
    const reps = progress.repsOverride ?? detail.reps
    for (let index = 0; index < progress.selectedSets.length; index++) {
      if (progress.selectedSets[index]) {
        volume += (progress.weightPerSet[index] ?? 0) * reps
      }
    }
  }
  return Math.round(volume * 100) / 100
}

export function cardioMinutes(session: WorkoutSession): number {
  return (
    Math.max(0, session.cardio.morning) + Math.max(0, session.cardio.evening)
  )
}

export function isComplete(
  session: WorkoutSession,
  _template: WorkoutTemplate,
): boolean {
  return (
    totalSetCount(session) > 0 &&
    completedSetCount(session) === totalSetCount(session)
  )
}

function completedExerciseCount(
  session: WorkoutSession,
  template: WorkoutTemplate,
): number {
  return template.exercises.filter((detail) => {
    const progress = session.exerciseProgress[detail.id]
    return (
      progress?.selectedSets.length > 0 && progress.selectedSets.every(Boolean)
    )
  }).length
}

export const useWorkoutSessionStoreBase = create<SessionState>((set, get) => ({
  sessions: {},

  startSession: (template) => {
    const activeSession = get().getActiveSessionForTemplate(template.id)
    if (activeSession) return activeSession

    const session: WorkoutSession = {
      id: uuidv4(),
      templateId: template.id,
      startedAt: new Date().toISOString(),
      completedAt: null,
      exerciseProgress: createProgress(template),
      cardio: { ...template.cardio },
      cardioCompleted: { morning: false, evening: false },
      status: 'in-progress',
    }

    templateBySessionId.set(session.id, template)

    set((state) => ({
      sessions: {
        ...state.sessions,
        [session.id]: session,
      },
    }))

    restEndsAtBySessionId.set(session.id, null)
    void startWorkoutActivity(
      session.id,
      template.title,
      getLiveActivityState(session, template),
    )

    return session
  },

  toggleSet: (sessionId, detailId, setIdx) => {
    let nextSession: WorkoutSession | undefined
    set((state) => {
      const session = state.sessions[sessionId]
      const progress = session?.exerciseProgress[detailId]
      if (
        !session ||
        !progress ||
        setIdx < 0 ||
        setIdx >= progress.selectedSets.length
      ) {
        return state
      }

      const selectedSets = [...progress.selectedSets]
      const wasSelected = selectedSets[setIdx]
      selectedSets[setIdx] = !wasSelected

      // When marking a set DONE (not undoing), cascade its weight to the
      // next blank set so the user only types kg once per "weight change".
      // We never overwrite a non-zero weight the user already entered.
      let weightPerSet = progress.weightPerSet
      if (!wasSelected) {
        const currentKg = weightPerSet[setIdx] ?? 0
        const nextIdx = setIdx + 1
        if (
          currentKg > 0 &&
          nextIdx < weightPerSet.length &&
          (weightPerSet[nextIdx] ?? 0) === 0
        ) {
          weightPerSet = [...weightPerSet]
          weightPerSet[nextIdx] = currentKg
        }
      }

      nextSession = {
        ...session,
        exerciseProgress: {
          ...session.exerciseProgress,
          [detailId]: {
            ...progress,
            selectedSets,
            weightPerSet,
          },
        },
      }

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: nextSession!,
        },
      }
    })
    syncLiveActivity(sessionId, nextSession)
  },

  setWeightForExercise: (sessionId, detailId, kg) => {
    set((state) => {
      const session = state.sessions[sessionId]
      const progress = session?.exerciseProgress[detailId]
      if (!session || !progress) return state

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            exerciseProgress: {
              ...session.exerciseProgress,
              [detailId]: {
                ...progress,
                weightPerSet: progress.weightPerSet.map(() => Math.max(0, kg)),
              },
            },
          },
        },
      }
    })
  },

  setWeightForSet: (sessionId, detailId, setIdx, kg) => {
    set((state) => {
      const session = state.sessions[sessionId]
      const progress = session?.exerciseProgress[detailId]
      if (
        !session ||
        !progress ||
        setIdx < 0 ||
        setIdx >= progress.weightPerSet.length
      ) {
        return state
      }

      const weightPerSet = [...progress.weightPerSet]
      weightPerSet[setIdx] = Math.max(0, kg)

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            exerciseProgress: {
              ...session.exerciseProgress,
              [detailId]: {
                ...progress,
                weightPerSet,
              },
            },
          },
        },
      }
    })
  },

  updateCardio: (sessionId, cardio) => {
    set((state) => {
      const session = state.sessions[sessionId]
      if (!session) return state

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            cardio: {
              morning: Math.max(0, cardio.morning),
              evening: Math.max(0, cardio.evening),
            },
          },
        },
      }
    })
  },

  toggleCardioDone: (sessionId, slot) => {
    set((state) => {
      const session = state.sessions[sessionId]
      if (!session) return state

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            cardioCompleted: {
              ...session.cardioCompleted,
              [slot]: !session.cardioCompleted[slot],
            },
          },
        },
      }
    })
  },

  updateExerciseOverrides: (sessionId, detailId, updates) => {
    let nextSession: WorkoutSession | undefined
    set((state) => {
      const session = state.sessions[sessionId]
      const progress = session?.exerciseProgress[detailId]
      if (!session || !progress) return state

      const nextSetCount =
        updates.sets ?? progress.setsOverride ?? progress.selectedSets.length
      const selectedSets = Array.from(
        { length: nextSetCount },
        (_, index) => progress.selectedSets[index] ?? false,
      )
      const defaultWeight =
        updates.defaultWeight ?? progress.weightPerSet[0] ?? 0
      const weightPerSet = Array.from(
        { length: nextSetCount },
        (_, index) => progress.weightPerSet[index] ?? defaultWeight,
      ).map((weight) =>
        updates.defaultWeight == null
          ? weight
          : Math.max(0, updates.defaultWeight),
      )

      nextSession = {
        ...session,
        exerciseProgress: {
          ...session.exerciseProgress,
          [detailId]: {
            ...progress,
            selectedSets,
            weightPerSet,
            setsOverride: updates.sets ?? progress.setsOverride,
            repsOverride: updates.reps ?? progress.repsOverride,
            variationOverride:
              updates.variation !== undefined
                ? updates.variation
                : progress.variationOverride,
          },
        },
      }

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: nextSession!,
        },
      }
    })
    syncLiveActivity(sessionId, nextSession)
  },

  complete: async (sessionId) => {
    const session = get().sessions[sessionId]
    const template = templateBySessionId.get(sessionId)
    if (!session || !template || session.status === 'complete') return

    const completedAt = new Date().toISOString()
    const durationSeconds = Math.max(
      0,
      Math.round(
        (new Date(completedAt).getTime() -
          new Date(session.startedAt).getTime()) /
          1000,
      ),
    )
    const minutes = cardioMinutes(session)
    const payload: WorkoutSessionInsert = {
      exercise_day: template.day,
      exercise_week: template.week,
      title: template.title,
      started_at: session.startedAt,
      completed_at: completedAt,
      duration_seconds: durationSeconds,
      total_volume_kg: totalVolumeKg(session, template),
      sets_completed: completedSetCount(session),
      total_sets: totalSetCount(session),
      exercises_completed: completedExerciseCount(session, template),
      total_exercises: template.exercises.length,
      cardio_minutes: minutes,
    }

    const parsed = workoutSessionInsertSchema.safeParse(payload)
    if (!parsed.success) {
      console.error('[WorkoutSession] Validation failed:', parsed.error.issues)
      return
    }

    try {
      const { error } = await supabase
        .from('workout_sessions')
        .insert(parsed.data)
      if (error) {
        // Don't mark complete — leave the session in-progress so the next
        // attempt (e.g. a remount of the detail screen) can retry. Marking
        // complete here would silently drop the workout: the idempotency
        // guard at the top of complete() blocks every subsequent call.
        console.warn('[WorkoutSession] Supabase insert error:', error.message)
        return
      }
    } catch (error) {
      console.warn('[WorkoutSession] Save failed:', error)
      return
    }

    if (minutes > 0) {
      const endDate = new Date(completedAt)
      const startDate = new Date(endDate.getTime() - minutes * 60_000)
      try {
        await healthSnapshot.saveCardioWorkout({
          durationMinutes: minutes,
          startDate,
          endDate,
        })
      } catch (error) {
        console.warn('[WorkoutSession] HealthKit sync failed:', error)
      }
    }

    set((state) => {
      const current = state.sessions[sessionId]
      if (!current || current.status === 'complete') return state
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...current,
            completedAt,
            status: 'complete',
          },
        },
      }
    })
    restEndsAtBySessionId.delete(sessionId)
    templateBySessionId.delete(sessionId)
    void endWorkoutActivity(sessionId)
  },

  setRestEndsAt: (sessionId, restEndsAt) => {
    restEndsAtBySessionId.set(sessionId, restEndsAt)
    syncLiveActivity(sessionId)
  },

  getActiveSessionForTemplate: (templateId) =>
    Object.values(get().sessions).find(
      (session) =>
        session.templateId === templateId && session.status === 'in-progress',
    ),
}))

export const useWorkoutSessionStore = useWorkoutSessionStoreBase

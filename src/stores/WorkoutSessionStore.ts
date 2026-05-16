import {
  commitWorkout,
  completedSetCount,
  totalSetCount,
  totalVolumeKg,
  cardioMinutes,
  isComplete as isCompleteHelper,
} from '@/lib/workoutCommit'
import type { WorkoutSession, WorkoutTemplate } from '@/types/models'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'

export { completedSetCount, totalSetCount, totalVolumeKg, cardioMinutes }
export { isCompleteHelper as isComplete }

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
  getActiveSessionForTemplate: (
    templateId: string,
  ) => WorkoutSession | undefined
}

const templateBySessionId = new Map<string, WorkoutTemplate>()

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

    return session
  },

  toggleSet: (sessionId, detailId, setIdx) => {
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

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            exerciseProgress: {
              ...session.exerciseProgress,
              [detailId]: {
                ...progress,
                selectedSets,
                weightPerSet,
              },
            },
          },
        },
      }
    })
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

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
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
          },
        },
      }
    })
  },

  complete: async (sessionId) => {
    const session = get().sessions[sessionId]
    const template = templateBySessionId.get(sessionId)
    if (!session || !template || session.status === 'complete') return

    const outcome = await commitWorkout(session, template)
    if (outcome.kind === 'invalid') {
      console.error('[WorkoutSession] Validation failed:', outcome.issues)
      return
    }
    if (outcome.kind === 'persistence-failed') {
      console.warn('[WorkoutSession] Save failed:', outcome.error)
      return
    }
    // outcome.kind === 'committed'
    set((state) => {
      const current = state.sessions[sessionId]
      if (!current || current.status === 'complete') return state
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...current,
            completedAt: outcome.payload.completed_at,
            status: 'complete',
          },
        },
      }
    })
    templateBySessionId.delete(sessionId)
  },

  getActiveSessionForTemplate: (templateId) =>
    Object.values(get().sessions).find(
      (session) =>
        session.templateId === templateId && session.status === 'in-progress',
    ),
}))

export const useWorkoutSessionStore = useWorkoutSessionStoreBase

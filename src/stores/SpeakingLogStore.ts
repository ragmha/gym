import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * One practice session, kept so its post-mortem can be revisited. Only the
 * raw inputs are stored; scores are recomputed from them by `postMortem`.
 */
export interface SpeakingLog {
  /** ISO start time; also the session's id. */
  at: string
  topicId: string
  style: 'shadow' | 'solo'
  capture: 'live' | 'video'
  seconds: number
  transcript: string
}

interface SpeakingLogState {
  /** Newest first. */
  sessions: SpeakingLog[]
  save: (log: SpeakingLog) => void
  remove: (at: string) => void
}

export const useSpeakingLogStore = create<SpeakingLogState>()(
  persist(
    (set) => ({
      sessions: [],
      save: (log) =>
        set((state) =>
          log.transcript.trim()
            ? {
                sessions: [
                  log,
                  ...state.sessions.filter((s) => s.at !== log.at),
                ],
              }
            : state,
        ),
      remove: (at) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.at !== at),
        })),
    }),
    {
      name: 'speaking-log',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ sessions }) => ({ sessions }),
    },
  ),
)

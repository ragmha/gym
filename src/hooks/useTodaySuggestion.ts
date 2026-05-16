/**
 * "Today's session" suggestion engine for the home dashboard.
 *
 * Pure decision tree on top of:
 *   - readiness (HRV / RHR / Sleep deltas from baseline)
 *   - the most recent session's pillar from `useWeeklyTraining`
 *
 * Output is a single suggestion the dashboard renders in big type at the top.
 * It's deliberately advisory, not a hard schedule — the user is in control.
 *
 * Decision rules (priority order, first match wins):
 *
 *   1. Two-or-more "bad" readiness signals → REST.
 *      The athlete is under-recovered; pushing now risks digging a hole.
 *   2. Sleep deficit > 1.5h vs baseline → MOBILITY / EASY AEROBIC.
 *      Acute sleep debt; keep load low.
 *   3. RHR elevated > +5bpm vs baseline → EASY ZONE 2 (Conditioning).
 *      Heart hasn't bounced back; aerobic-only.
 *   4. Last session was STRENGTH → RUN (alternate stress).
 *   5. Last session was RUN → STRENGTH or CONDITIONING (alternate).
 *   6. Last session was CONDITIONING → STRENGTH or RUN.
 *   7. No session in last 48h → STRENGTH (default kick-back-in workout).
 *   8. Default → CONDITIONING (mid-week tempo / Hyrox simulator).
 *
 * Returns a plain object the UI can render directly. No business logic in
 * the component layer.
 */

import { useMemo } from 'react'

import type { Pillar } from '@/lib/training/pillars'
import type { TrainingSession } from '@/lib/training/load'

import type { ReadinessSummary } from './useReadiness'

export type SuggestionKind = 'rest' | 'mobility' | 'pillar'

export interface TodaySuggestion {
  /** Big headline text — short, command-tense. */
  headline: string
  /** One-line reason shown under the headline. */
  reason: string
  /** Suggested pillar (null for rest / mobility days). */
  pillar: Pillar | null
  kind: SuggestionKind
}

interface SuggestionInput {
  readiness: ReadinessSummary
  sessions: readonly TrainingSession[]
  /** Optional override clock for tests. */
  now?: Date
}

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

function lastSessionPillar(
  sessions: readonly TrainingSession[],
  now: Date,
): { pillar: Pillar | null; hoursAgo: number | null } {
  if (sessions.length === 0) return { pillar: null, hoursAgo: null }
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.startISO).getTime() - new Date(a.startISO).getTime(),
  )
  const latest = sorted[0]
  if (!latest) return { pillar: null, hoursAgo: null }
  const hoursAgo =
    (now.getTime() - new Date(latest.startISO).getTime()) / (60 * 60 * 1000)
  return { pillar: latest.pillar, hoursAgo }
}

function countBadSignals(readiness: ReadinessSummary): number {
  let n = 0
  if (readiness.hrv.direction === 'bad') n++
  if (readiness.restingHeartRate.direction === 'bad') n++
  if (readiness.sleepHours.direction === 'bad') n++
  return n
}

export function computeTodaySuggestion(
  input: SuggestionInput,
): TodaySuggestion {
  const { readiness, sessions } = input
  const now = input.now ?? new Date()

  // 1. Two-or-more bad signals → rest.
  if (countBadSignals(readiness) >= 2) {
    return {
      headline: 'Rest',
      reason: 'Recovery is below baseline on multiple signals',
      pillar: null,
      kind: 'rest',
    }
  }

  // 2. Sleep deficit > 1.5h.
  const sleepDelta = readiness.sleepHours.delta
  if (sleepDelta != null && sleepDelta < -1.5) {
    return {
      headline: 'Mobility + walk',
      reason: `Sleep is ${sleepDelta.toFixed(1)}h below baseline — keep it light`,
      pillar: null,
      kind: 'mobility',
    }
  }

  // 3. RHR elevated > +5bpm.
  const rhrDelta = readiness.restingHeartRate.delta
  if (rhrDelta != null && rhrDelta > 5) {
    return {
      headline: 'Easy Zone 2',
      reason: `Resting HR is +${Math.round(rhrDelta)}bpm — aerobic only today`,
      pillar: 'conditioning',
      kind: 'pillar',
    }
  }

  const { pillar: lastPillar, hoursAgo } = lastSessionPillar(sessions, now)

  // 7. Nothing in 48h → strength.
  if (hoursAgo == null || hoursAgo > 48) {
    return {
      headline: 'Strength',
      reason:
        hoursAgo == null
          ? "Let's get back to it"
          : `${Math.round(hoursAgo / 24)} days since last session`,
      pillar: 'strength',
      kind: 'pillar',
    }
  }

  // 4–6. Alternate the previous pillar.
  if (lastPillar === 'strength') {
    return {
      headline: 'Run',
      reason: 'You lifted yesterday — get the legs ticking',
      pillar: 'run',
      kind: 'pillar',
    }
  }
  if (lastPillar === 'run') {
    return {
      headline: 'Strength',
      reason: 'You ran yesterday — hit the bar',
      pillar: 'strength',
      kind: 'pillar',
    }
  }
  if (lastPillar === 'conditioning') {
    return {
      headline: 'Strength',
      reason: 'You conditioned yesterday — back to the iron',
      pillar: 'strength',
      kind: 'pillar',
    }
  }

  // 8. Default.
  return {
    headline: 'Conditioning',
    reason: 'Mid-week Hyrox / tempo work',
    pillar: 'conditioning',
    kind: 'pillar',
  }
}

export function useTodaySuggestion(
  readiness: ReadinessSummary,
  sessions: readonly TrainingSession[],
): TodaySuggestion {
  return useMemo(
    () => computeTodaySuggestion({ readiness, sessions }),
    [readiness, sessions],
  )
}

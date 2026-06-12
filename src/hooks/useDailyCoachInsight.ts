import { useEffect, useMemo, useState } from 'react'

import { activeCoachEngine, buildDailyContext } from '@/lib/coach'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import type { CoachInsight } from '@/lib/validators'
import type { RecoveryResult } from '@/utils/recovery'

export type DailyCoachInsightStatus = 'idle' | 'loading' | 'ready' | 'error'

interface DailyCoachInsightState {
  insight: CoachInsight | null
  status: DailyCoachInsightStatus
}

const insightCache = new Map<string, CoachInsight | Promise<CoachInsight>>()

export function clearInsightCache(): void {
  insightCache.clear()
}

export function useDailyCoachInsight({
  snapshot,
  recovery,
}: {
  snapshot: DailyHealthSnapshot | null
  recovery: RecoveryResult | null
}): DailyCoachInsightState {
  const cacheKey = useMemo(
    () => (snapshot ? buildCacheKey(snapshot, recovery) : null),
    [recovery, snapshot],
  )
  const [state, setState] = useState<DailyCoachInsightState>({
    insight: null,
    status: 'idle',
  })

  useEffect(() => {
    if (!snapshot || !cacheKey) {
      setState({ insight: null, status: 'idle' })
      return
    }

    const cached = insightCache.get(cacheKey)
    let cancelled = false

    if (cached && !isPromise(cached)) {
      setState({ insight: cached, status: 'ready' })
      return
    }

    setState({ insight: null, status: 'loading' })

    const request = cached ?? generateInsight(snapshot, recovery)
    insightCache.set(cacheKey, request)

    request
      .then((insight) => {
        insightCache.set(cacheKey, insight)
        if (!cancelled) {
          setState({ insight, status: 'ready' })
        }
      })
      .catch(() => {
        insightCache.delete(cacheKey)
        if (!cancelled) {
          setState({ insight: null, status: 'error' })
        }
      })

    return () => {
      cancelled = true
    }
  }, [cacheKey, recovery, snapshot])

  return state
}

async function generateInsight(
  snapshot: DailyHealthSnapshot,
  recovery: RecoveryResult | null,
): Promise<CoachInsight> {
  const ctx = buildDailyContext({
    dateISO: snapshot.date,
    snapshot,
    recovery,
  })

  return activeCoachEngine.generateDailyInsight(ctx)
}

function buildCacheKey(
  snapshot: DailyHealthSnapshot,
  recovery: RecoveryResult | null,
): string {
  return `${snapshot.date}:${JSON.stringify({
    steps: snapshot.steps,
    calories: snapshot.calories,
    sleepHours: snapshot.sleepHours,
    heartRate: snapshot.heartRate,
    hrv: snapshot.hrv,
    restingHeartRate: snapshot.restingHeartRate,
    waterLiters: snapshot.waterLiters,
    flightsClimbed: snapshot.flightsClimbed,
    workouts: snapshot.workouts.map((workout) => ({
      activityName: workout.activityName,
      calories: workout.calories,
      distance: workout.distance,
      durationMinutes: workout.durationMinutes,
      startISO: workout.startISO,
      endISO: workout.endISO,
    })),
    recovery: recovery
      ? {
          score: recovery.score,
          label: recovery.label,
          description: recovery.description,
        }
      : null,
  })}`
}

function isPromise(
  value: CoachInsight | Promise<CoachInsight>,
): value is Promise<CoachInsight> {
  return typeof (value as Promise<CoachInsight>).then === 'function'
}

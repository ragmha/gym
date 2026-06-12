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
const MAX_INSIGHT_CACHE_ENTRIES = 8

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
    setInsightCacheEntry(cacheKey, request)

    request
      .then((insight) => {
        if (insightCache.get(cacheKey) === request) {
          setInsightCacheEntry(cacheKey, insight)
        }
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
  // Bucket volatile intra-day metrics so the on-device model regenerates only
  // when coaching inputs meaningfully change, not on every HealthKit refresh.
  return `${snapshot.date}:${JSON.stringify({
    workouts: snapshot.workouts.length,
    stepsBucket: bucketNumber(snapshot.steps, 2000),
    sleepHoursBucket: bucketNumber(snapshot.sleepHours, 0.5),
    recoveryTone: recovery ? getRecoveryTone(recovery.score) : 'unknown',
  })}`
}

function setInsightCacheEntry(
  key: string,
  value: CoachInsight | Promise<CoachInsight>,
): void {
  insightCache.set(key, value)

  while (insightCache.size > MAX_INSIGHT_CACHE_ENTRIES) {
    const oldestKey = insightCache.keys().next().value
    if (oldestKey === undefined) {
      return
    }
    insightCache.delete(oldestKey)
  }
}

function bucketNumber(value: number | null, bucketSize: number): number | null {
  return value === null ? null : Math.round(value / bucketSize) * bucketSize
}

function getRecoveryTone(score: number): 'caution' | 'celebrate' | 'steady' {
  if (score < 34) {
    return 'caution'
  }

  if (score >= 67) {
    return 'celebrate'
  }

  return 'steady'
}

function isPromise(
  value: CoachInsight | Promise<CoachInsight>,
): value is Promise<CoachInsight> {
  return typeof (value as Promise<CoachInsight>).then === 'function'
}

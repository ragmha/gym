/**
 * Recovery score algorithm.
 *
 * Computes a 0–100 recovery score from HRV, resting heart rate, and sleep data.
 * Weights: 40% HRV, 30% RHR, 30% Sleep.
 *
 * Pure function — no React, no stores, no side effects.
 */

// ── Constants ───────────────────────────────────────────────────────

/** Population-average fallback baselines (used when <7 days of history) */
export const DEFAULT_HRV_BASELINE = 50 // ms
export const DEFAULT_RHR_BASELINE = 65 // bpm
export const DEFAULT_SLEEP_GOAL_HOURS = 8

/** Component weights (must sum to 1) */
const HRV_WEIGHT = 0.4
const RHR_WEIGHT = 0.3
const SLEEP_WEIGHT = 0.3

// ── Types ───────────────────────────────────────────────────────────

export interface RecoveryInput {
  hrv: number // Today's HRV in ms
  restingHR: number // Today's resting HR in bpm
  sleepHours: number // Hours slept last night
  hrvBaseline?: number | null // 30-day HRV average (null = use default)
  rhrBaseline?: number | null // 30-day RHR average (null = use default)
  sleepGoalHours?: number | null // Target sleep hours (null = use default)
}

export interface RecoveryResult {
  score: number // 0–100
  label: string // "Primed to Perform" | "Adequate Recovery" | "Under-recovered"
  description: string // Rule-based explanation
}

// ── Algorithm ───────────────────────────────────────────────────────

/**
 * Compute a recovery score from health metrics.
 *
 * @param input - Today's metrics + optional baselines
 * @returns Score (0–100), label, and descriptive explanation
 */
export function computeRecoveryScore(input: RecoveryInput): RecoveryResult {
  const {
    hrv,
    restingHR,
    sleepHours,
    hrvBaseline: hrvBaselineRaw,
    rhrBaseline: rhrBaselineRaw,
    sleepGoalHours: sleepGoalRaw,
  } = input

  const hrvBaseline = hrvBaselineRaw ?? DEFAULT_HRV_BASELINE
  const rhrBaseline = rhrBaselineRaw ?? DEFAULT_RHR_BASELINE
  const sleepGoal = sleepGoalRaw ?? DEFAULT_SLEEP_GOAL_HOURS

  // ── HRV component (40%) ───────────────────────────────────────
  // Above baseline → bonus, below → penalty. Normalized to 0–100.
  // A 50% deviation from baseline maps to the full 0 or 100 range.
  const hrvRatio = hrvBaseline > 0 ? hrv / hrvBaseline : 1
  const hrvScore = Math.min(100, Math.max(0, hrvRatio * 100 - 50 + 50))
  // ratio=1.0 → score=100, ratio=0.5 → score=0, ratio=1.5 → score=100 (capped)

  // ── RHR component (30%) ───────────────────────────────────────
  // Lower is better. Below baseline → bonus, above → penalty.
  const rhrRatio = rhrBaseline > 0 ? restingHR / rhrBaseline : 1
  const rhrScore = Math.min(100, Math.max(0, (2 - rhrRatio) * 100 - 50))
  // ratio=1.0 → score=50, ratio=0.85 → score=65, ratio=1.15 → score=35

  // ── Sleep component (30%) ─────────────────────────────────────
  // sleepHours / sleepGoal clamped to [0, 1], then multiplied by 100.
  const sleepRatio = sleepGoal > 0 ? sleepHours / sleepGoal : 1
  const sleepScore = Math.min(100, Math.max(0, sleepRatio * 100))

  // ── Weighted total ────────────────────────────────────────────
  const rawScore =
    hrvScore * HRV_WEIGHT + rhrScore * RHR_WEIGHT + sleepScore * SLEEP_WEIGHT
  const score = Math.round(Math.min(100, Math.max(0, rawScore)))

  // ── Label ─────────────────────────────────────────────────────
  const label =
    score >= 67
      ? 'Primed to Perform'
      : score >= 34
        ? 'Adequate Recovery'
        : 'Under-recovered'

  // ── Description ───────────────────────────────────────────────
  const description = buildDescription({
    hrv,
    hrvBaseline,
    restingHR,
    rhrBaseline,
    sleepHours,
    sleepGoal,
    score,
  })

  return { score, label, description }
}

// ── Description builder ─────────────────────────────────────────────

function buildDescription(params: {
  hrv: number
  hrvBaseline: number
  restingHR: number
  rhrBaseline: number
  sleepHours: number
  sleepGoal: number
  score: number
}): string {
  const { hrv, hrvBaseline, restingHR, rhrBaseline, sleepHours, sleepGoal } =
    params
  const parts: string[] = []

  // HRV insight
  const hrvDiff = Math.round(hrv - hrvBaseline)
  if (hrvDiff > 5) {
    parts.push(
      `Your HRV is ${hrvDiff}ms above your baseline, indicating strong recovery.`,
    )
  } else if (hrvDiff < -5) {
    parts.push(
      `Your HRV is ${Math.abs(hrvDiff)}ms below your baseline, suggesting incomplete recovery.`,
    )
  } else {
    parts.push('Your HRV is close to your baseline.')
  }

  // RHR insight
  const rhrDiff = Math.round(restingHR - rhrBaseline)
  if (rhrDiff > 3) {
    parts.push(
      `Resting heart rate is ${rhrDiff}bpm above average, which may indicate stress or fatigue.`,
    )
  } else if (rhrDiff < -3) {
    parts.push(
      `Resting heart rate is ${Math.abs(rhrDiff)}bpm below average — a positive sign.`,
    )
  }

  // Sleep insight
  const sleepPercent = Math.round((sleepHours / sleepGoal) * 100)
  if (sleepPercent >= 95) {
    parts.push('Sleep was sufficient for full recovery.')
  } else if (sleepPercent >= 75) {
    parts.push(
      `You got ${sleepHours.toFixed(1)}h of sleep (${sleepPercent}% of goal). Aim for a bit more.`,
    )
  } else {
    parts.push(
      `Sleep was only ${sleepPercent}% of your goal — this is likely limiting your recovery.`,
    )
  }

  return parts.join(' ')
}

export const DEFAULT_REST_SECONDS = 120
export const MIN_REST_SECONDS = 30
export const MAX_REST_SECONDS = 600

const COMPOUND =
  /\b(squats?|deadlifts?|press(es)?|rows?|pull-?ups?|chin-?ups?|pull-?downs?|dips?|lunges?|push-?ups?|split|thrusts?|step-?ups?|good mornings?)\b/i
const ISOLATION = /\b(calf|straight-arm)\b/i

export const clampRest = (seconds: number) =>
  Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, seconds))

/** Rule-based rest before the next set: heavier, harder sets rest longer. */
export function restSeconds(
  exercise: { title: string; reps: number },
  set: { reps: number },
): number {
  let seconds = DEFAULT_REST_SECONDS
  if (COMPOUND.test(exercise.title) && !ISOLATION.test(exercise.title))
    seconds += 30
  if (exercise.reps <= 8) seconds += 30
  else if (exercise.reps >= 15) seconds -= 30
  if (set.reps < exercise.reps) seconds += 30
  return clampRest(seconds)
}

export type Joint = 'knee' | 'hip' | 'elbow'

export type RepCount = {
  reps: number
  phase: 'ready' | 'straight' | 'bent'
}

export const emptyRepCount: RepCount = { reps: 0, phase: 'ready' }

/** Count only an observed straight -> bent -> straight cycle, never across a tracking gap. */
export function countRep(
  count: RepCount,
  angle: number | null,
  bendAngle = 110,
): RepCount {
  if (angle === null || !Number.isFinite(angle) || angle < 0 || angle > 180)
    return { reps: count.reps, phase: 'ready' }
  if (angle > 150) {
    return {
      reps: Math.min(500, count.reps + (count.phase === 'bent' ? 1 : 0)),
      phase: 'straight',
    }
  }
  if (angle < bendAngle && count.phase === 'straight')
    return { ...count, phase: 'bent' }
  return count
}

export function defaultJoint(title: string): Joint {
  if (
    /squat|lunge|split|leg press|leg extension|leg curl|hamstring curl/i.test(
      title,
    )
  )
    return 'knee'
  if (/deadlift|good morning|leg raise|hyperextension|glute.?ham/i.test(title))
    return 'hip'
  return 'elbow'
}

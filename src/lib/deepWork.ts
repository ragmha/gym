export const FOCUS_MS = 25 * 60_000
export const BREAK_MS = 5 * 60_000

export type DeepWorkPhase = 'focus' | 'break'

/** endsAt is null while paused; remainingMs is then the frozen time left. */
export interface DeepWorkSession {
  phase: DeepWorkPhase
  endsAt: number | null
  remainingMs: number
}

const blockMs = (phase: DeepWorkPhase) =>
  phase === 'focus' ? FOCUS_MS : BREAK_MS

export function startDeepWork(now: number): DeepWorkSession {
  return { phase: 'focus', endsAt: now + FOCUS_MS, remainingMs: FOCUS_MS }
}

/** Rolls a running session through every block that ended while away. */
export function advanceDeepWork(
  session: DeepWorkSession,
  now: number,
): DeepWorkSession {
  if (session.endsAt === null) return session
  let { phase, endsAt } = session
  // ponytail: one step per elapsed block; a day away is only 48 steps.
  while (endsAt <= now) {
    phase = phase === 'focus' ? 'break' : 'focus'
    endsAt += blockMs(phase)
  }
  return { phase, endsAt, remainingMs: endsAt - now }
}

export function pauseDeepWork(
  session: DeepWorkSession,
  now: number,
): DeepWorkSession {
  return { ...advanceDeepWork(session, now), endsAt: null }
}

export function resumeDeepWork(
  session: DeepWorkSession,
  now: number,
): DeepWorkSession {
  return { ...session, endsAt: now + session.remainingMs }
}

/** The block's start, for a countdown over the whole block. */
export function deepWorkBlockStart(session: DeepWorkSession, now: number) {
  return (session.endsAt ?? now + session.remainingMs) - blockMs(session.phase)
}

export function formatRemaining(ms: number): string {
  const seconds = Math.ceil(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

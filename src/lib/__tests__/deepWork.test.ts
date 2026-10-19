import {
  advanceDeepWork,
  BREAK_MS,
  FOCUS_MS,
  formatRemaining,
  pauseDeepWork,
  resumeDeepWork,
  startDeepWork,
} from '@/lib/deepWork'

describe('deep work cycle', () => {
  it('alternates 25 minute focus and 5 minute break blocks', () => {
    const session = startDeepWork(0)
    expect(advanceDeepWork(session, FOCUS_MS - 1)).toMatchObject({
      phase: 'focus',
      remainingMs: 1,
    })
    expect(advanceDeepWork(session, FOCUS_MS)).toMatchObject({
      phase: 'break',
      endsAt: FOCUS_MS + BREAK_MS,
    })
    // Two full cycles plus a minute away lands in the third focus block.
    expect(
      advanceDeepWork(session, 2 * (FOCUS_MS + BREAK_MS) + 60_000),
    ).toMatchObject({ phase: 'focus', remainingMs: FOCUS_MS - 60_000 })
  })

  it('freezes the remaining time while paused', () => {
    const paused = pauseDeepWork(startDeepWork(0), FOCUS_MS + 60_000)
    expect(paused).toEqual({
      phase: 'break',
      endsAt: null,
      remainingMs: BREAK_MS - 60_000,
    })
    expect(advanceDeepWork(paused, 10 * FOCUS_MS)).toBe(paused)
    expect(resumeDeepWork(paused, 1_000_000).endsAt).toBe(
      1_000_000 + BREAK_MS - 60_000,
    )
  })

  it('formats the remaining time as m:ss', () => {
    expect(formatRemaining(16 * 60_000 + 7_000)).toBe('16:07')
    expect(formatRemaining(FOCUS_MS)).toBe('25:00')
  })
})

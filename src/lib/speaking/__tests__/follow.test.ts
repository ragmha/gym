import { followScript, normalizeWord } from '@/lib/speaking/follow'

const script = 'Small changes get real reviews. Big changes get rubber stamps.'
  .split(' ')
  .map(normalizeWord)

describe('followScript', () => {
  it('advances through the script and ignores fillers and punctuation', () => {
    expect(followScript(script, '')).toBe(0)
    expect(followScript(script, 'Um, small changes... uh get REAL')).toBe(4)
  })

  it('skips a misheard word but not a distant common word', () => {
    expect(followScript(script, 'small changes got real reviews')).toBe(5)
    expect(followScript(script, 'small stamps')).toBe(1)
  })

  it('starts the next pass after the last word', () => {
    const pass = 'small changes get real reviews big changes get rubber stamps'
    expect(followScript(script, pass)).toBe(10)
    expect(followScript(script, `${pass} small changes`)).toBe(2)
  })
  it('wraps into the next pass when the last word is missed', () => {
    const missed = 'small changes get real reviews big changes get rubber'
    expect(followScript(script, `${missed} small changes`)).toBe(2)
  })

  it('resyncs on a run of words after a skipped passage', () => {
    const long = Array.from({ length: 30 }, (_, i) => `w${i}`)
    expect(followScript(long, 'w0 w1 w2 w15 w16 w17')).toBe(18)
  })
})

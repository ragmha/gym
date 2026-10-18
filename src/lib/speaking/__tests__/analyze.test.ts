import { analyzeTranscript, postMortem } from '@/lib/speaking/analyze'

describe('analyzeTranscript', () => {
  it('counts words, pace and repeated or multi-word fillers', () => {
    const stats = analyzeTranscript(
      'Um, um so the agent, you know, basically runs. Like a loop. I like it.',
      30,
    )

    expect(stats.words).toBe(15)
    expect(stats.wordsPerMinute).toBe(30)
    expect(stats.fillers).toEqual([
      { word: 'um', count: 2 },
      { word: 'like', count: 2 },
      { word: 'basically', count: 1 },
      { word: 'you know', count: 1 },
    ])
    expect(stats.fillerTotal).toBe(6)
  })

  it('does not match fillers inside other words or before any time passes', () => {
    expect(analyzeTranscript('Umbrella likes erosion.', 0)).toEqual({
      words: 3,
      wordsPerMinute: 0,
      fillerTotal: 0,
      fillers: [],
    })
  })
})

describe('postMortem', () => {
  const words = (n: number) =>
    Array.from({ length: n }, () => 'point').join(' ')

  it('passes a steady shadow read and suggests going solo', () => {
    const report = postMortem(words(145), 60, 'shadow')
    expect(report.checks.map((c) => [c.id, c.pass])).toEqual([
      ['fillers', true],
      ['pace', true],
    ])
    expect(report.focus).toBe(
      'Everything measured passed. Now give this topic solo.',
    )
  })

  it('targets the most common filler first', () => {
    const report = postMortem(`like ${words(140)} like um like`, 60, 'solo')
    expect(report.fillersPerMinute).toBe(4)
    expect(report.focus).toBe('Pause instead of saying “like”.')
  })

  it('checks the solo opening promise and close', () => {
    const missed = postMortem(`So ${words(140)} thank you`, 60, 'solo')
    expect(missed.checks.filter((c) => !c.pass).map((c) => c.id)).toEqual([
      'promise',
      'close',
    ])
    expect(missed.focus).toBe(
      'Open with a promise: what they will know by the end.',
    )

    const kept = postMortem(
      `By the end you’ll know why ${words(135)} that is my contribution`,
      60,
      'solo',
    )
    expect(kept.checks.every((c) => c.pass)).toBe(true)
  })

  it('flags a rushed pace', () => {
    expect(postMortem(words(200), 60, 'shadow').focus).toBe(
      'Slow down: pause between points.',
    )
  })
})

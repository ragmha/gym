import { analyzeTranscript } from '@/lib/speaking/analyze'

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

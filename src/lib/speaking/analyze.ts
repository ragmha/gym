// ponytail: "so" and "right" are left out; they are often real verbal
// punctuation and would flood the count with false positives.
const FILLERS = [
  'um',
  'uh',
  'er',
  'like',
  'basically',
  'actually',
  'literally',
  'you know',
  'i mean',
  'kind of',
  'sort of',
]

export type TranscriptStats = {
  words: number
  wordsPerMinute: number
  fillerTotal: number
  fillers: { word: string; count: number }[]
}

export function analyzeTranscript(
  text: string,
  seconds: number,
): TranscriptStats {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? []
  const joined = words.join(' ')
  const fillers = FILLERS.map((word) => ({
    word,
    count: joined.match(new RegExp(`(?:^| )${word}(?= |$)`, 'g'))?.length ?? 0,
  }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count)

  return {
    words: words.length,
    wordsPerMinute: seconds > 0 ? Math.round((words.length * 60) / seconds) : 0,
    fillerTotal: fillers.reduce((sum, { count }) => sum + count, 0),
    fillers,
  }
}

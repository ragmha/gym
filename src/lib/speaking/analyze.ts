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

const tokens = (text: string) =>
  text
    .toLowerCase()
    .replace(/’/g, "'")
    .match(/[a-z']+/g) ?? []

export function analyzeTranscript(
  text: string,
  seconds: number,
): TranscriptStats {
  const words = tokens(text)
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

export const PACE = { min: 130, max: 160 }
const MAX_FILLERS_PER_MINUTE = 2
// Winston: open with an empowerment promise; close on contributions.
const PROMISES = [
  'by the end',
  "you'll",
  'you will',
  "i'll show",
  'i will show',
]
const THANKS = ['thank you', 'thanks']

export type CheckId = 'fillers' | 'pace' | 'promise' | 'close'
export type Check = {
  id: CheckId
  label: string
  pass: boolean
  detail: string
}
export type PostMortem = TranscriptStats & {
  fillersPerMinute: number
  checks: Check[]
  focus: string
}

const includesPhrase = (words: string[], phrases: string[]) => {
  const joined = ` ${words.join(' ')} `
  return phrases.some((phrase) => joined.includes(` ${phrase} `))
}

/**
 * Rule-based review of one session. Promise and close are only judged in
 * solo mode; a shadow script supplies its own opening and ending.
 */
export function postMortem(
  text: string,
  seconds: number,
  style: 'shadow' | 'solo',
): PostMortem {
  const stats = analyzeTranscript(text, seconds)
  const words = tokens(text)
  const fillersPerMinute =
    seconds > 0 ? Math.round((stats.fillerTotal * 600) / seconds) / 10 : 0
  const pace = stats.wordsPerMinute
  const checks: Check[] = [
    {
      id: 'fillers',
      label: 'Fillers',
      pass: fillersPerMinute <= MAX_FILLERS_PER_MINUTE,
      detail: `${fillersPerMinute} a minute${
        stats.fillers[0] ? `, mostly “${stats.fillers[0].word}”` : ''
      }`,
    },
    {
      id: 'pace',
      label: 'Pace',
      pass: pace >= PACE.min && pace <= PACE.max,
      detail: `${pace} words a minute (aim for ${PACE.min}–${PACE.max})`,
    },
  ]
  if (style === 'solo') {
    const promise = includesPhrase(words.slice(0, 60), PROMISES)
    const thanks = includesPhrase(words.slice(-20), THANKS)
    checks.push(
      {
        id: 'promise',
        label: 'Opening promise',
        pass: promise,
        detail: promise
          ? 'You told them what they would get.'
          : 'No promise of what they will know by the end.',
      },
      {
        id: 'close',
        label: 'Close',
        pass: !thanks,
        detail: thanks ? 'Ended on “Thank you”.' : 'Ended without “Thank you”.',
      },
    )
  }

  const miss = checks.find((check) => !check.pass)
  const focus = !miss
    ? style === 'shadow'
      ? 'Everything measured passed. Now give this topic solo.'
      : 'Everything measured passed. Try 15 minutes or record a video.'
    : miss.id === 'fillers'
      ? `Pause instead of saying “${stats.fillers[0]?.word}”.`
      : miss.id === 'pace'
        ? pace > PACE.max
          ? 'Slow down: pause between points.'
          : 'Pick up the pace: fewer long gaps.'
        : miss.id === 'promise'
          ? 'Open with a promise: what they will know by the end.'
          : 'Close on your contributions, not “Thank you”.'

  return { ...stats, fillersPerMinute, checks, focus }
}

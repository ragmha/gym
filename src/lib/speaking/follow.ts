// How far ahead a spoken word may jump, so skipped or misheard words don't
// stall the highlight while common words ("the") can't leap whole sentences.
const LOOKAHEAD = 6
// Words in a row that must match to resync after a longer gap.
const RESYNC = 3

export const normalizeWord = (word: string) =>
  word.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * Returns how many script words have been read, matching the recognised
 * speech in order. Unmatched words (fillers, ad-libs) are ignored. Matching
 * wraps past the end into the next pass, for 15-minute sessions that repeat
 * the script, and a run of matching words resyncs after a skipped passage.
 */
export function followScript(script: string[], spoken: string): number {
  const n = script.length
  const words = spoken.split(/\s+/).map(normalizeWord).filter(Boolean)
  const at = (i: number) => script[i % n]
  let cursor = 0
  for (let j = 0; j < words.length && n; j++) {
    let next = -1
    for (let k = 0; k < LOOKAHEAD && next < 0; k++) {
      if (at(cursor + k) === words[j]) next = cursor + k
    }
    for (let k = 0; k < n && next < 0 && j + RESYNC <= words.length; k++) {
      let r = 0
      while (r < RESYNC && at(cursor + k + r) === words[j + r]) r++
      if (r === RESYNC) next = cursor + k
    }
    if (next >= 0) cursor = (next % n) + 1
  }
  return cursor
}

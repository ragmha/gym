/**
 * Deterministic pastel HSL color picker. Stable per seed so a given
 * workout's accent color doesn't change across renders, refreshes, or
 * sessions — the previous Math.random-based version reshuffled colors
 * on every store init.
 *
 * Avoids Math.random (CodeQL js/insecure-randomness) by hashing the
 * seed deterministically instead.
 */
export function pastelColorForSeed(seed: string | number): string {
  const hash = typeof seed === 'number' ? seed : hashString(seed)
  const hue = ((hash % 360) + 360) % 360 // safe positive modulo
  return `hsl(${hue}, 50%, 87.5%)`
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return h
}

/** @deprecated use {@link pastelColorForSeed} with a stable seed (workout id). */
export const getRandomPastelColor = (): string => pastelColorForSeed(Date.now())

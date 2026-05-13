import { pastelColorForSeed } from '../getRandomPastelColor'

describe('pastelColorForSeed', () => {
  it('returns a valid HSL color string', () => {
    expect(pastelColorForSeed('workout-1')).toMatch(/^hsl\(\d+, 50%, 87\.5%\)$/)
  })

  it('is deterministic — same seed yields the same color', () => {
    expect(pastelColorForSeed('workout-1')).toBe(
      pastelColorForSeed('workout-1'),
    )
    expect(pastelColorForSeed(42)).toBe(pastelColorForSeed(42))
  })

  it('returns different colors for different seeds', () => {
    const colors = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map(
        pastelColorForSeed,
      ),
    )
    // With 10 distinct seeds it is extremely unlikely all collide on one hue.
    expect(colors.size).toBeGreaterThan(1)
  })

  it('clamps hue into the valid 0–359 range for any integer seed', () => {
    for (const seed of [-1_000_000, -1, 0, 1, 359, 360, 1_000_000]) {
      const match = pastelColorForSeed(seed).match(
        /^hsl\((\d+), 50%, 87\.5%\)$/,
      )
      expect(match).not.toBeNull()
      const hue = Number(match![1])
      expect(hue).toBeGreaterThanOrEqual(0)
      expect(hue).toBeLessThan(360)
    }
  })
})

import { getRandomPastelColor } from '../getRandomPastelColor'

describe('getRandomPastelColor', () => {
  it('returns a valid HSL color string', () => {
    const color = getRandomPastelColor()
    expect(color).toMatch(/^hsl\(\d+, 50%, 87\.5%\)$/)
  })

  it('returns different colors on successive calls', () => {
    const colors = new Set(
      Array.from({ length: 10 }, () => getRandomPastelColor()),
    )
    // With 10 calls and 360 possible hues, extremely unlikely all are the same
    expect(colors.size).toBeGreaterThan(1)
  })
})

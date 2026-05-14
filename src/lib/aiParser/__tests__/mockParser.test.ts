import { mockParser } from '../mockParser'

describe('mockParser', () => {
  it('returns no-input error when neither photoUri nor hint is provided', async () => {
    const result = await mockParser.parse({})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('no-input')
    }
  })

  it('returns the same meal for the same photoUri (deterministic)', async () => {
    const a = await mockParser.parse({ photoUri: 'file:///tmp/meal.jpg' })
    const b = await mockParser.parse({ photoUri: 'file:///tmp/meal.jpg' })
    expect(a.ok && b.ok).toBe(true)
    if (a.ok && b.ok) {
      expect(a.meal).toEqual(b.meal)
    }
  })

  it('uses the user hint as the meal name when provided', async () => {
    const result = await mockParser.parse({
      photoUri: 'file:///tmp/x.jpg',
      hint: 'My custom plate',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.meal.name).toBe('My custom plate')
    }
  })

  it('returns plausible macro values', async () => {
    const result = await mockParser.parse({ hint: 'lunch' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.meal.calories_kcal).toBeGreaterThan(0)
      expect(result.meal.calories_kcal).toBeLessThan(1500)
      expect(result.meal.protein_g).toBeGreaterThanOrEqual(0)
      expect(result.meal.carb_g).toBeGreaterThanOrEqual(0)
      expect(result.meal.fat_g).toBeGreaterThanOrEqual(0)
      expect(result.meal.ai_confidence).toBeGreaterThan(0)
      expect(result.meal.ai_confidence).toBeLessThanOrEqual(1)
    }
  })

  it('exposes the mock adapter id', () => {
    expect(mockParser.id).toBe('mock')
  })
})

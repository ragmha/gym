import { activeCoachEngine, mockCoachEngine } from '@/lib/coach'
import type { ParsedMeal } from '@/lib/validators'
import { coachParser } from '../coachParser'
import { mockParser } from '../mockParser'

jest.mock('@/lib/coach', () => {
  const actual = jest.requireActual('@/lib/coach')

  return {
    ...actual,
    activeCoachEngine: {
      ...actual.mockCoachEngine,
      parseMealText: jest.fn(actual.mockCoachEngine.parseMealText),
    },
  }
})

const parseMealTextMock =
  activeCoachEngine.parseMealText as jest.MockedFunction<
    typeof activeCoachEngine.parseMealText
  >

describe('coachParser', () => {
  beforeEach(() => {
    parseMealTextMock.mockReset()
    parseMealTextMock.mockImplementation((text) =>
      mockCoachEngine.parseMealText(text),
    )
  })

  it('exposes the coach adapter id', () => {
    expect(coachParser.id).toBe('coach')
  })

  it('returns an engine-derived meal for a non-empty hint', async () => {
    const result = await coachParser.parse({ hint: 'chicken rice bowl' })
    const expectedMeal =
      await mockCoachEngine.parseMealText('chicken rice bowl')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.meal).toEqual(expectedMeal)
    }
    expect(parseMealTextMock).toHaveBeenCalledWith('chicken rice bowl')
  })

  it('trims the hint before passing it to the coach engine', async () => {
    await coachParser.parse({ hint: '  greek yogurt bowl  ' })

    expect(parseMealTextMock).toHaveBeenCalledWith('greek yogurt bowl')
  })

  it('delegates photo-only input to mockParser unchanged', async () => {
    const input = { photoUri: 'file:///meal-parser/plate.jpg' }
    const result = await coachParser.parse(input)
    const mockResult = await mockParser.parse(input)

    expect(result).toEqual(mockResult)
    expect(parseMealTextMock).not.toHaveBeenCalled()
  })

  it('returns no-input error when neither photoUri nor non-empty hint is provided', async () => {
    const result = await coachParser.parse({ hint: '   ' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('no-input')
    }
  })

  it('returns provider-failure when the coach engine throws', async () => {
    parseMealTextMock.mockRejectedValueOnce(new Error('engine unavailable'))

    const result = await coachParser.parse({ hint: 'salmon plate' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toEqual({
        kind: 'provider-failure',
        message: 'engine unavailable',
      })
    }
  })

  it('returns provider-failure when the coach engine returns a schema violation', async () => {
    parseMealTextMock.mockResolvedValueOnce({
      name: '',
      calories_kcal: 500,
      protein_g: 30,
      carb_g: 40,
      fat_g: 20,
      ai_confidence: 0.8,
    } as ParsedMeal)

    const result = await coachParser.parse({ hint: 'invalid meal' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('provider-failure')
      if (result.error.kind === 'provider-failure') {
        expect(result.error.message).toContain('Too small')
      }
    }
  })
})

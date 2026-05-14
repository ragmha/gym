import type { ParsedMeal } from '@/lib/validators'
import { parsedMealSchema } from '@/lib/validators'
import type { MealParser, ParseInput, ParseResult } from './types'

/**
 * Deterministic mock adapter for the MealParser seam.
 *
 * Picks a plausible meal from a small catalogue using a stable hash of the
 * input (photo URI or hint). Produces realistic macro values with a fixed
 * confidence so the UI can be developed end-to-end without any AI API.
 */

const MEAL_CATALOGUE = [
  { name: 'Chicken Caesar Salad', kcal: 480, p: 38, c: 18, f: 28 },
  { name: 'Avocado Toast', kcal: 360, p: 12, c: 32, f: 22 },
  { name: 'Grilled Salmon with Quinoa', kcal: 620, p: 42, c: 40, f: 28 },
  { name: 'Beef Burrito Bowl', kcal: 720, p: 38, c: 80, f: 24 },
  {
    name: 'Greek Yogurt with Berries and Granola',
    kcal: 320,
    p: 18,
    c: 38,
    f: 9,
  },
  { name: 'Tofu Stir Fry with Rice', kcal: 540, p: 24, c: 72, f: 16 },
  { name: 'Spaghetti Bolognese', kcal: 680, p: 32, c: 78, f: 22 },
  { name: 'Veggie Omelette', kcal: 380, p: 26, c: 8, f: 26 },
  { name: 'Sushi Roll Platter', kcal: 540, p: 22, c: 80, f: 12 },
  { name: 'Protein Shake', kcal: 280, p: 36, c: 18, f: 6 },
] as const

function hash(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** Snap to one decimal place so values don't render as 12.345678. */
function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function pick(input: ParseInput): ParsedMeal {
  const seed = input.photoUri ?? input.hint ?? `mock-${Date.now()}`
  const idx = hash(seed) % MEAL_CATALOGUE.length
  const base = MEAL_CATALOGUE[idx]

  // Deterministic ±5% jitter so identical inputs yield identical meals,
  // but different inputs feel varied. Avoid Math.random() for determinism.
  const jitter = ((hash(seed + ':j') % 100) - 50) / 1000 // -0.05..+0.05
  const factor = 1 + jitter

  const meal: ParsedMeal = {
    name: input.hint?.trim() || base.name,
    calories_kcal: round1(base.kcal * factor),
    protein_g: round1(base.p * factor),
    carb_g: round1(base.c * factor),
    fat_g: round1(base.f * factor),
    ai_confidence: 0.78,
  }

  // Defensive — should never throw, but guarantees the contract.
  return parsedMealSchema.parse(meal)
}

export const mockParser: MealParser = {
  id: 'mock',
  async parse(input: ParseInput): Promise<ParseResult> {
    if (!input.photoUri && !input.hint) {
      return { ok: false, error: { kind: 'no-input' } }
    }
    // Simulated network/provider latency so the loading UI is exercisable.
    await new Promise((r) => setTimeout(r, 250))
    return { ok: true, meal: pick(input) }
  },
}

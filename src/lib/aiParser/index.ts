/**
 * AI meal parser Module.
 *
 * Behind one Interface (`MealParser`) so we can swap mock → OpenAI Vision →
 * Anthropic Claude Vision → on-device CoreML without touching callers.
 *
 * Today's only adapter is `mockParser`; future adapters live alongside it.
 */
import type { MealParser, ParseInput } from './types'
import { mockParser } from './mockParser'

export type { MealParser, ParseInput, ParseError, ParseResult } from './types'
export { mockParser } from './mockParser'

/**
 * Resolve the active parser at runtime. The selection lives in one place so
 * future provider swaps are a single edit.
 */
export function getActiveParser(): MealParser {
  return mockParser
}

/**
 * Convenience wrapper that runs the active parser. Callers don't need to know
 * which adapter is in use.
 */
export async function parseMeal(input: ParseInput) {
  return getActiveParser().parse(input)
}

/**
 * AI parser seam — swap the active implementation here.
 *
 * `mockParser` ships today. To plug in a real backend (OpenAI Vision,
 * Claude Vision, CoreML, …) create a new adapter that satisfies
 * `MealParser` and re-export it as `activeParser` from this file.
 */
export { mockParser as activeParser } from './mockParser'
export type { MealParser, ParseInput, ParseResult, ParseError } from './types'

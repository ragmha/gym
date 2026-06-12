/**
 * AI parser seam — swap the active implementation here.
 *
 * `coachParser` uses the on-device coach engine for text hints while keeping
 * photo-only parsing mock-backed until image attachments land.
 */
export { coachParser as activeParser } from './coachParser'
export type { MealParser, ParseInput, ParseResult, ParseError } from './types'

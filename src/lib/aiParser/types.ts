import type { ParsedMeal } from '@/lib/validators'

export type ParseError =
  | { kind: 'no-input' }
  | { kind: 'unsupported-mime'; mime: string }
  | { kind: 'provider-failure'; message: string }
  | { kind: 'low-confidence'; confidence: number }

export type ParseResult =
  | { ok: true; meal: ParsedMeal }
  | { ok: false; error: ParseError }

export interface ParseInput {
  /** Local file URI (file://…) or remote URL of the captured photo. */
  photoUri?: string
  /** Optional textual hint the user typed (e.g. "chicken caesar salad"). */
  hint?: string
}

/**
 * MealParser is the seam: every adapter (mock, OpenAI Vision, Claude Vision,
 * CoreML) implements this interface and is swappable without caller changes.
 */
export interface MealParser {
  readonly id: 'mock' | 'openai' | 'anthropic' | 'coreml'
  parse(input: ParseInput): Promise<ParseResult>
}

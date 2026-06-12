import { activeCoachEngine } from '@/lib/coach'
import { parsedMealSchema } from '@/lib/validators'
import { mockParser } from './mockParser'
import type { MealParser, ParseInput, ParseResult } from './types'

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : 'Coach meal parser failed'
}

export const coachParser: MealParser = {
  id: 'coach',
  async parse(input: ParseInput): Promise<ParseResult> {
    const hint = input.hint?.trim()

    if (hint) {
      try {
        const meal = parsedMealSchema.parse(
          await activeCoachEngine.parseMealText(hint),
        )
        return { ok: true, meal }
      } catch (error) {
        return {
          ok: false,
          error: { kind: 'provider-failure', message: messageFromError(error) },
        }
      }
    }

    if (input.photoUri) {
      return mockParser.parse(input)
    }

    return { ok: false, error: { kind: 'no-input' } }
  },
}

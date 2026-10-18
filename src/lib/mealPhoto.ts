import { requireOptionalNativeModule } from 'expo'
import type { MediaType } from 'expo-image-picker'
import type { StructureSchema } from 'react-native-apple-llm'
import { z } from 'zod'

import {
  appleFMCoachEngine,
  generateValidatedJson,
} from '@/lib/coach/appleFMAdapter'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type { FoodEntry } from '@/lib/healthSnapshot/food'

type FoodVision = {
  /** Vision labels for the photo; the native side deletes the cached file. */
  classify(uri: string): Promise<{ label: string; confidence: number }[]>
}

const messages = {
  ai: 'Calorie estimates need Apple Intelligence. Check that it is on and ready in Settings, then try again.',
  build:
    'A new iOS build is required to read meal photos. Install version 1.0.11 or later.',
  camera: 'Allow camera access in Settings to snap a meal, or choose a photo.',
  'not-food': 'No food was recognized in that photo. Nothing was saved.',
  'other-day':
    "That photo was taken on another day. Only today's meals can be added. Nothing was saved.",
  failed: 'The photo could not be estimated. Nothing was saved. Try again.',
} as const

export class MealPhotoError extends Error {
  constructor(readonly code: keyof typeof messages) {
    super(messages[code])
    this.name = 'MealPhotoError'
  }
}

export function mealPhotoErrorMessage(error: unknown): string {
  return error instanceof MealPhotoError
    ? messages[error.code]
    : messages.failed
}

const grams = z
  .number()
  .transform((value) => Math.round(value))
  .pipe(z.number().min(0).max(1000))

export const mealEstimateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .transform((name) => name.slice(0, 60).trim()),
  kcal: z
    .number()
    .transform((kcal) => Math.round(kcal))
    .pipe(z.number().min(0).max(5000)),
  proteinGrams: grams,
  carbsGrams: grams,
  fatGrams: grams,
})

const mealEstimateStructure: StructureSchema = {
  name: { type: 'string', description: 'Short meal name, 4 words max' },
  kcal: { type: 'integer', description: 'Total kcal for one serving' },
  proteinGrams: {
    type: 'integer',
    description: 'Total protein grams for one serving',
  },
  carbsGrams: {
    type: 'integer',
    description: 'Total carbohydrate grams for one serving',
  },
  fatGrams: { type: 'integer', description: 'Total fat grams for one serving' },
}

/** EXIF capture time. iOS flattens it to `DateTimeOriginal` plus an optional `OffsetTimeOriginal`. */
export function photoTime(
  exif: Record<string, unknown> | null | undefined,
  now = new Date(),
): Date | null {
  const taken = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(
    String(exif?.DateTimeOriginal ?? ''),
  )
  if (!taken) return null
  const [year, month, day, hour, minute, second] = taken.slice(1).map(Number)
  const wall = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  // Reject impossible wall times such as 2026:02:30 instead of rolling them over.
  if (
    !Number.isFinite(wall.getTime()) ||
    wall.toISOString().slice(0, 19) !==
      `${taken[1]}-${taken[2]}-${taken[3]}T${taken[4]}:${taken[5]}:${taken[6]}`
  ) {
    return null
  }
  const offset = /^([+-])(\d{2}):(\d{2})$/.exec(
    String(exif?.OffsetTimeOriginal ?? ''),
  )
  const time = offset
    ? wall.getTime() -
      (offset[1] === '-' ? -1 : 1) *
        (Number(offset[2]) * 60 + Number(offset[3])) *
        60_000
    : new Date(year, month - 1, day, hour, minute, second).getTime()
  return time <= now.getTime() ? new Date(time) : null
}

/**
 * Photo -> Vision labels -> on-device Apple Intelligence estimate. Nothing is
 * saved here: the caller shows the estimate and saves only on confirmation.
 * Resolves null when the user cancels the picker.
 */
export async function estimateMealPhoto(
  source: 'camera' | 'library',
): Promise<FoodEntry | null> {
  if ((await appleFMCoachEngine.availability()) !== 'available') {
    throw new MealPhotoError('ai')
  }
  const vision = requireOptionalNativeModule<FoodVision>('FoodVision')
  if (!vision) throw new MealPhotoError('build')
  // Binaries without FoodVision also lack the picker's native module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const picker: typeof import('expo-image-picker') = require('expo-image-picker')
  const options = {
    mediaTypes: ['images'] as MediaType[],
    exif: true,
    quality: 0.5,
  }
  if (
    source === 'camera' &&
    !(await picker.requestCameraPermissionsAsync()).granted
  ) {
    throw new MealPhotoError('camera')
  }
  const result =
    source === 'camera'
      ? await picker.launchCameraAsync(options)
      : await picker.launchImageLibraryAsync(options)
  const pickedAt = new Date()
  const asset = result.canceled ? null : result.assets[0]
  if (!asset) return null

  const labels = await vision.classify(asset.uri)
  if (!labels.some(({ label }) => label === 'food' || label === 'drink')) {
    throw new MealPhotoError('not-food')
  }
  const eatenAt = photoTime(asset.exif, pickedAt) ?? pickedAt
  // Checked after classify, which deletes the cached photo.
  if (localDateKey(eatenAt) !== localDateKey(pickedAt)) {
    throw new MealPhotoError('other-day')
  }
  const listed = labels
    .map(
      ({ label, confidence }) =>
        `${label.replace(/_/g, ' ')} ${Math.round(confidence * 100)}%`,
    )
    .join(', ')
  const estimate = await generateValidatedJson({
    system:
      'You estimate nutrition for one meal from labels an on-device image classifier gave its photo. Labels can be generic or partly wrong, so rely on the most specific food labels. Assume one typical adult serving of what is shown. Reply only with JSON.',
    prompt: `Photo labels with confidence: ${listed}.\nName the meal in 4 words or fewer and estimate its total kcal and its protein, carbohydrate and fat grams.`,
    retryInstruction:
      'Return ONLY valid JSON matching {"name":"string","kcal":integer,"proteinGrams":integer,"carbsGrams":integer,"fatGrams":integer}.',
    schema: mealEstimateSchema,
    structure: mealEstimateStructure,
    label: 'meal estimate',
  })
  if (estimate.kcal < 1) throw new MealPhotoError('not-food')
  return { ...estimate, eatenAt }
}

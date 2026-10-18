import { z } from 'zod'

import exerciseMedia from './exerciseMedia.json'

// Reference-only lookup: the request carries just a curated ExerciseDB ID.
// Nothing is cached or stored; media stays on ExerciseDB's servers.
const API = 'https://oss.exercisedb.dev/api/v1/exercises/'
const IDS: Readonly<Record<string, string>> = exerciseMedia

const infoSchema = z.object({
  name: z.string(),
  gifUrl: z.url({ protocol: /^https$/ }),
  targetMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()),
  equipments: z.array(z.string()),
  instructions: z.array(z.string()),
})

export type ExerciseInfo = z.infer<typeof infoSchema>

export const exerciseInfoId = (title: string): string | null =>
  IDS[title.trim().toLowerCase()] ?? null

export async function fetchExerciseInfo(
  id: string,
  signal?: AbortSignal,
): Promise<ExerciseInfo> {
  const response = await fetch(API + encodeURIComponent(id), { signal })
  if (!response.ok) throw new Error(`ExerciseDB ${response.status}`)
  const info = infoSchema.parse(
    ((await response.json()) as { data?: unknown }).data,
  )
  return {
    ...info,
    instructions: info.instructions.map((step) =>
      step.replace(/^Step:\s*\d+\s*/i, ''),
    ),
  }
}

export const youtubeSearchUrl = (title: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${title} exercise form`,
  )}`

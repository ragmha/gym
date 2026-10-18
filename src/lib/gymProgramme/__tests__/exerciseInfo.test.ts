import {
  exerciseInfoId,
  fetchExerciseInfo,
} from '@/lib/gymProgramme/exerciseInfo'
import exerciseMedia from '@/lib/gymProgramme/exerciseMedia.json'
import { PROGRAMME } from '@/lib/gymProgramme'

const reply = (body: unknown, ok = true) =>
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok,
    status: ok ? 200 : 429,
    json: async () => body,
  } as Response)

afterEach(() => jest.restoreAllMocks())

describe('exercise info', () => {
  it('only maps titles that exist in the programme', () => {
    const titles = new Set(
      PROGRAMME.flatMap((d) =>
        d.exercises.map((e) => e.title.trim().toLowerCase()),
      ),
    )
    for (const key of Object.keys(exerciseMedia)) expect(titles).toContain(key)
  })

  it('looks titles up case-insensitively', () => {
    expect(exerciseInfoId('  Reverse-Grip Cable Triceps Pushdown ')).toBe(
      'VjYliFZ',
    )
    expect(exerciseInfoId('Not a real exercise')).toBeNull()
  })

  it('strips step prefixes from instructions', async () => {
    reply({
      data: {
        name: 'x',
        gifUrl: 'https://static.exercisedb.dev/media/x.gif',
        targetMuscles: [],
        secondaryMuscles: [],
        equipments: [],
        instructions: ['Step:1 Grip the bar.', 'Step: 12 Repeat.'],
      },
    })
    await expect(fetchExerciseInfo('x')).resolves.toMatchObject({
      instructions: ['Grip the bar.', 'Repeat.'],
    })
  })

  it('rejects failed or malformed responses', async () => {
    reply({}, false)
    await expect(fetchExerciseInfo('x')).rejects.toThrow('ExerciseDB 429')
    reply({ data: { name: 'x', gifUrl: 'http://insecure/x.gif' } })
    await expect(fetchExerciseInfo('x')).rejects.toThrow()
  })
})

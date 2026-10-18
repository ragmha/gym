import { requireOptionalNativeModule } from 'expo'
import * as ImagePicker from 'expo-image-picker'

import {
  appleFMCoachEngine,
  generateValidatedJson,
} from '@/lib/coach/appleFMAdapter'
import {
  estimateMealPhoto,
  mealEstimateSchema,
  photoTime,
} from '@/lib/mealPhoto'

const mockClassify = jest.fn<
  Promise<{ label: string; confidence: number }[]>,
  [string]
>()

jest.mock('expo', () => ({ requireOptionalNativeModule: jest.fn() }))
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}))
jest.mock('@/lib/coach/appleFMAdapter', () => ({
  appleFMCoachEngine: { availability: jest.fn() },
  generateValidatedJson: jest.fn(),
}))

const picker = jest.mocked(ImagePicker)
const pickedAt = new Date(2026, 9, 17, 13)
const pizzaLabels = [
  { label: 'food', confidence: 0.86 },
  { label: 'pizza', confidence: 0.85 },
  { label: 'baked_goods', confidence: 0.4 },
]
const photo = (exif: Record<string, unknown> | null = null) =>
  ({
    canceled: false,
    assets: [{ uri: 'file:///cache/meal.jpg', exif }],
  }) as unknown as ImagePicker.ImagePickerResult

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  jest.setSystemTime(pickedAt)
  jest.mocked(appleFMCoachEngine.availability).mockResolvedValue('available')
  jest
    .mocked(requireOptionalNativeModule)
    .mockReturnValue({ classify: mockClassify })
  mockClassify.mockReset().mockResolvedValue(pizzaLabels)
  picker.requestCameraPermissionsAsync.mockReset().mockResolvedValue({
    granted: true,
  } as ImagePicker.CameraPermissionResponse)
  picker.launchCameraAsync.mockReset().mockResolvedValue(photo())
  picker.launchImageLibraryAsync.mockReset().mockResolvedValue(photo())
  jest.mocked(generateValidatedJson).mockReset().mockResolvedValue({
    name: 'Margherita pizza',
    kcal: 800,
    proteinGrams: 32,
    carbsGrams: 98,
    fatGrams: 30,
  })
})

afterEach(() => jest.useRealTimers())

describe('photoTime', () => {
  const now = new Date(Date.UTC(2026, 9, 19))

  it('reads the EXIF capture time with or without its UTC offset', () => {
    expect(
      photoTime(
        {
          DateTimeOriginal: '2026:10:17 12:30:05',
          OffsetTimeOriginal: '+03:00',
        },
        now,
      ),
    ).toEqual(new Date(Date.UTC(2026, 9, 17, 9, 30, 5)))
    expect(
      photoTime(
        {
          DateTimeOriginal: '2026:10:17 12:30:05',
          OffsetTimeOriginal: '-04:30',
        },
        now,
      ),
    ).toEqual(new Date(Date.UTC(2026, 9, 17, 17, 0, 5)))
    expect(photoTime({ DateTimeOriginal: '2026:10:17 12:30:05' }, now)).toEqual(
      new Date(2026, 9, 17, 12, 30, 5),
    )
  })

  it.each([
    [null],
    [{}],
    [{ DateTimeOriginal: '2026-10-17 12:30:05' }],
    [{ DateTimeOriginal: '2026:02:30 12:00:00' }],
    [{ DateTimeOriginal: '2026:10:17 24:00:00' }],
    [{ DateTimeOriginal: '2026:10:20 08:00:00' }],
  ])('ignores a missing, invalid or future time: %j', (exif) => {
    expect(photoTime(exif, now)).toBeNull()
  })
})

describe('mealEstimateSchema', () => {
  it('rounds the estimate and keeps the name short', () => {
    expect(
      mealEstimateSchema.parse({
        name: `  ${'Pasta '.repeat(12)}`,
        kcal: 812.6,
        proteinGrams: 31.4,
        carbsGrams: 101.5,
        fatGrams: 22.2,
      }),
    ).toEqual({
      name: 'Pasta '.repeat(10).trim(),
      kcal: 813,
      proteinGrams: 31,
      carbsGrams: 102,
      fatGrams: 22,
    })
  })

  const soup = {
    name: 'Soup',
    kcal: 500,
    proteinGrams: 20,
    carbsGrams: 60,
    fatGrams: 15,
  }

  it('accepts a complete estimate', () => {
    expect(mealEstimateSchema.safeParse(soup).success).toBe(true)
  })

  it.each([
    { ...soup, name: ' ' },
    { ...soup, kcal: -1 },
    { ...soup, kcal: 5001 },
    { ...soup, kcal: Infinity },
    { ...soup, kcal: '500' },
    { ...soup, proteinGrams: 1001 },
    { ...soup, carbsGrams: -1 },
    { ...soup, fatGrams: Number.NaN },
    { ...soup, fatGrams: undefined },
  ])('rejects %j', (estimate) => {
    expect(mealEstimateSchema.safeParse(estimate).success).toBe(false)
  })
})

describe('estimateMealPhoto', () => {
  it('estimates a camera photo from its Vision labels and capture time', async () => {
    picker.launchCameraAsync.mockResolvedValue(
      photo({ DateTimeOriginal: '2026:10:17 12:05:00' }),
    )

    await expect(estimateMealPhoto('camera')).resolves.toEqual({
      name: 'Margherita pizza',
      kcal: 800,
      proteinGrams: 32,
      carbsGrams: 98,
      fatGrams: 30,
      eatenAt: new Date(2026, 9, 17, 12, 5),
    })
    expect(picker.launchCameraAsync).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      exif: true,
      quality: 0.5,
    })
    expect(mockClassify).toHaveBeenCalledWith('file:///cache/meal.jpg')
    const [request] = jest.mocked(generateValidatedJson).mock.calls[0]
    expect(request.prompt).toContain('food 86%, pizza 85%, baked goods 40%')
    expect(request.schema).toBe(mealEstimateSchema)
  })

  it('uses the pick time for a library photo without a capture time', async () => {
    mockClassify.mockResolvedValue([{ label: 'drink', confidence: 0.8 }])

    await expect(estimateMealPhoto('library')).resolves.toMatchObject({
      eatenAt: pickedAt,
    })
    expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled()
    expect(picker.launchCameraAsync).not.toHaveBeenCalled()
  })

  it('rejects a library photo taken on another day before asking the model', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue(
      photo({ DateTimeOriginal: '2026:10:16 23:59:00' }),
    )

    await expect(estimateMealPhoto('library')).rejects.toMatchObject({
      code: 'other-day',
    })
    expect(mockClassify).toHaveBeenCalledWith('file:///cache/meal.jpg')
    expect(generateValidatedJson).not.toHaveBeenCalled()
  })

  it('resolves null without classifying when the picker is cancelled', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: true,
      assets: null,
    })

    await expect(estimateMealPhoto('library')).resolves.toBeNull()
    expect(mockClassify).not.toHaveBeenCalled()
  })

  it('needs Apple Intelligence and the new build before opening the picker', async () => {
    jest
      .mocked(appleFMCoachEngine.availability)
      .mockResolvedValue('ai-disabled')
    await expect(estimateMealPhoto('camera')).rejects.toMatchObject({
      code: 'ai',
    })
    expect(requireOptionalNativeModule).not.toHaveBeenCalled()

    jest.mocked(appleFMCoachEngine.availability).mockResolvedValue('available')
    jest.mocked(requireOptionalNativeModule).mockReturnValue(null)
    await expect(estimateMealPhoto('camera')).rejects.toMatchObject({
      code: 'build',
    })
    expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled()
  })

  it('does not open the camera without permission', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({
      granted: false,
    } as ImagePicker.CameraPermissionResponse)

    await expect(estimateMealPhoto('camera')).rejects.toMatchObject({
      code: 'camera',
    })
    expect(picker.launchCameraAsync).not.toHaveBeenCalled()
  })

  it('rejects photos without food before asking the model', async () => {
    mockClassify.mockResolvedValue([
      { label: 'tableware', confidence: 0.95 },
      { label: 'plate', confidence: 0.9 },
    ])

    await expect(estimateMealPhoto('library')).rejects.toMatchObject({
      code: 'not-food',
    })
    expect(generateValidatedJson).not.toHaveBeenCalled()
  })

  it('rejects a zero-calorie estimate', async () => {
    jest.mocked(generateValidatedJson).mockResolvedValue({
      name: 'Plate',
      kcal: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
    })

    await expect(estimateMealPhoto('library')).rejects.toMatchObject({
      code: 'not-food',
    })
  })
})

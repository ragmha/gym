import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native'
import { useLocalSearchParams } from 'expo-router'

import FoodScreen from '@/app/gym/food'
import { makeSnapshot } from '@/components/dashboard/__fixtures__/healthSnapshot'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import { FoodWriteError, type FoodEntry } from '@/lib/healthSnapshot/food'
import { foodWriter } from '@/lib/healthSnapshot/foodWriter'
import type {
  DailyFoodLog,
  DailyHealthSnapshot,
} from '@/lib/healthSnapshot/types'
import { estimateMealPhoto, MealPhotoError } from '@/lib/mealPhoto'
import { useThemeStore } from '@/stores/ThemeStore'

const mockGetFoodLog = jest.fn<Promise<DailyFoodLog>, [Date]>()
const mockRefresh = jest.fn<Promise<void>, []>()

jest.mock('@/lib/healthSnapshot/HealthSnapshotSource', () => ({
  healthSnapshot: { getFoodLog: (date: Date) => mockGetFoodLog(date) },
}))
jest.mock('@/hooks/useHealthSnapshot', () => ({
  useHealthSnapshot: jest.fn(),
}))
jest.mock('@/lib/healthSnapshot/foodWriter', () => ({
  foodWriter: { getAvailability: jest.fn(), save: jest.fn() },
}))
jest.mock('@/lib/mealPhoto', () => ({
  ...jest.requireActual('@/lib/mealPhoto'),
  estimateMealPhoto: jest.fn(),
}))
jest.mock('@react-navigation/native', () => ({
  usePreventRemove: jest.fn(),
}))
jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } = jest.requireActual('@/constants/Colors')
  return { useTheme: () => Colors.light }
})

const today = localDateKey(new Date())
const [year, month, day] = today.split('-').map(Number)
const lunch: FoodEntry = {
  name: 'Chicken rice bowl',
  kcal: 640,
  proteinGrams: 42,
  carbsGrams: 70,
  fatGrams: 18,
  eatenAt: new Date(year, month - 1, day, 12, 30),
}

function mockDay(
  date: string,
  snapshot: Partial<DailyHealthSnapshot> = {},
  log: DailyFoodLog = {
    proteinGrams: 96,
    carbsGrams: 180,
    fatGrams: 50,
    meals: [
      { name: 'Oatmeal', kcal: 412, startISO: `${date}T08:10:00` },
      { name: null, kcal: 650, startISO: `${date}T12:30:00` },
      { name: 'Protein bar', kcal: 388, startISO: `${date}T16:00:00` },
    ],
  },
) {
  jest.mocked(useLocalSearchParams).mockReturnValue({ date })
  jest.mocked(useHealthSnapshot).mockReturnValue({
    snapshot: {
      ...makeSnapshot({ date }),
      dietaryCalories: 1450,
      workouts: [
        {
          kind: 'stairClimber',
          activityName: 'Stair Climber',
          averageHeartRate: null,
          calories: 312.4,
          distance: null,
          durationMinutes: 30,
          startISO: `${date}T06:00:00`,
          endISO: `${date}T06:30:00`,
        },
      ],
      ...snapshot,
    },
    refresh: mockRefresh,
  } as unknown as ReturnType<typeof useHealthSnapshot>)
  mockGetFoodLog.mockResolvedValue(log)
}

beforeEach(() => {
  mockGetFoodLog.mockReset()
  mockRefresh.mockReset().mockResolvedValue()
  jest.mocked(estimateMealPhoto).mockReset()
  jest.mocked(foodWriter.save).mockReset()
  jest.mocked(foodWriter.getAvailability).mockReturnValue({ available: true })
  useThemeStore.setState({ foodGoalKcal: 2200 })
})

describe('Food screen', () => {
  it('budgets food against the goal plus workouts, sets macro targets and groups meals', async () => {
    mockDay('2026-01-15')
    render(<FoodScreen />)

    const breakfast = await screen.findByTestId('food-slot-Breakfast')
    expect(screen.getByText('Budget: 2200 kcal')).toBeTruthy()
    expect(screen.getByLabelText('1062 kcal under budget')).toBeTruthy()
    expect(screen.getByText('Under')).toBeTruthy()
    expect(screen.getByLabelText('Food: 1450')).toBeTruthy()
    expect(screen.getByLabelText('Exercise: 312')).toBeTruthy()
    expect(screen.getByLabelText('Protein: 96 of 125 g')).toBeTruthy()
    expect(screen.getByLabelText('Carbs: 180 of 339 g')).toBeTruthy()
    expect(screen.getByLabelText('Fat: 50 of 73 g')).toBeTruthy()
    expect(
      screen.getByText(
        'Workouts add 312 kcal to your budget, as extra carbs to refuel.',
      ),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Protein target: 1.6 g per kg of body weight for lifting.',
      ),
    ).toBeTruthy()
    expect(
      within(breakfast).getByText('🥣', { includeHiddenElements: true }),
    ).toBeTruthy()
    expect(within(breakfast).getByText('Oatmeal')).toBeTruthy()
    expect(within(breakfast).getByText('412 kcal')).toBeTruthy()
    const lunchSlot = screen.getByTestId('food-slot-Lunch')
    expect(
      within(lunchSlot).getByText('🍽️', { includeHiddenElements: true }),
    ).toBeTruthy()
    expect(within(lunchSlot).getByText('Food')).toBeTruthy()
    expect(within(lunchSlot).getByText('650 kcal')).toBeTruthy()
    const snacks = screen.getByTestId('food-slot-Snacks')
    expect(
      within(snacks).getByText('🍫', { includeHiddenElements: true }),
    ).toBeTruthy()
    expect(within(snacks).getByText('Protein bar')).toBeTruthy()
    expect(screen.queryByTestId('food-slot-Dinner')).toBeNull()
    expect(mockGetFoodLog.mock.calls[0][0].getDate()).toBe(15)
  })

  it('shows food over the budget', async () => {
    mockDay('2026-01-15', { dietaryCalories: 2600 })
    render(<FoodScreen />)

    expect(await screen.findByLabelText('88 kcal over budget')).toBeTruthy()
    expect(screen.getByText('Over')).toBeTruthy()
  })

  it('leaves the remaining budget unknown while workout calories are', async () => {
    mockDay('2026-01-15', {
      workouts: [
        {
          kind: 'stairClimber',
          activityName: 'Stair Climber',
          averageHeartRate: null,
          calories: null,
          distance: null,
          durationMinutes: 30,
          startISO: '2026-01-15T06:00:00',
          endISO: '2026-01-15T06:30:00',
        },
      ],
    })
    render(<FoodScreen />)

    expect(await screen.findByLabelText('Carbs: 180 of -- g')).toBeTruthy()
    expect(screen.getByLabelText('Remaining budget unavailable')).toBeTruthy()
    expect(screen.getByLabelText('Food: 1450')).toBeTruthy()
    expect(screen.getByLabelText('Exercise: --')).toBeTruthy()
  })

  it('shows missing data as missing and only adds meals for today', async () => {
    mockDay(
      '2026-01-15',
      {
        dietaryCalories: null,
        bodyMassKg: null,
        workouts: [
          {
            kind: 'stairClimber',
            activityName: 'Stair Climber',
            averageHeartRate: null,
            calories: null,
            distance: null,
            durationMinutes: 30,
            startISO: '2026-01-15T06:00:00',
            endISO: '2026-01-15T06:30:00',
          },
        ],
      },
      { proteinGrams: null, carbsGrams: null, fatGrams: null, meals: [] },
    )
    render(<FoodScreen />)

    expect(
      await screen.findByText('No meals in Apple Health for this day.'),
    ).toBeTruthy()
    expect(screen.getByLabelText('Remaining budget unavailable')).toBeTruthy()
    expect(screen.getByLabelText('Food: --')).toBeTruthy()
    expect(screen.getByLabelText('Exercise: --')).toBeTruthy()
    expect(screen.getByLabelText('Protein: -- of -- g')).toBeTruthy()
    expect(screen.getByLabelText('Carbs: -- of -- g')).toBeTruthy()
    expect(screen.getByLabelText('Fat: -- of 73 g')).toBeTruthy()
    expect(
      screen.getByText(
        'Workout calories from Apple Health are added to your budget as carbs.',
      ),
    ).toBeTruthy()
    expect(
      screen.getByText('Log a weigh-in to get a protein target for lifting.'),
    ).toBeTruthy()
    expect(screen.getByText('Meals can only be added for today.')).toBeTruthy()
    expect(screen.queryByTestId('food-snap')).toBeNull()
  })

  it('estimates a meal photo and saves it only after confirmation', async () => {
    jest.mocked(estimateMealPhoto).mockResolvedValue(lunch)
    jest.mocked(foodWriter.save).mockResolvedValue()
    mockDay(today)
    render(<FoodScreen />)
    await screen.findByTestId('food-slot-Breakfast')

    fireEvent.press(screen.getByRole('button', { name: 'Snap meal' }))
    const estimate = await screen.findByTestId('food-estimate')
    expect(estimateMealPhoto).toHaveBeenCalledWith('camera')
    expect(
      within(estimate).getByText('🍗', { includeHiddenElements: true }),
    ).toBeTruthy()
    expect(within(estimate).getByText('Chicken rice bowl')).toBeTruthy()
    expect(within(estimate).getByText('640 kcal')).toBeTruthy()
    expect(
      within(estimate).getByText('Protein 42 g · Carbs 70 g · Fat 18 g'),
    ).toBeTruthy()
    expect(within(estimate).getByText(/^Lunch · /)).toBeTruthy()
    expect(foodWriter.save).not.toHaveBeenCalled()

    fireEvent.press(
      screen.getByRole('button', { name: 'Save to Apple Health' }),
    )

    expect(await screen.findByText('Saved to Apple Health.')).toBeTruthy()
    expect(foodWriter.save).toHaveBeenCalledTimes(1)
    expect(foodWriter.save).toHaveBeenCalledWith(lunch)
    expect(screen.queryByTestId('food-estimate')).toBeNull()
    expect(mockGetFoodLog).toHaveBeenCalledTimes(2)
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('keeps the estimate when Health refuses it, and discards without saving', async () => {
    jest.mocked(estimateMealPhoto).mockResolvedValue(lunch)
    jest.mocked(foodWriter.save).mockRejectedValue(new FoodWriteError('denied'))
    mockDay(today)
    render(<FoodScreen />)
    await screen.findByTestId('food-slot-Breakfast')

    fireEvent.press(screen.getByRole('button', { name: 'Choose photo' }))
    await screen.findByTestId('food-estimate')
    expect(estimateMealPhoto).toHaveBeenCalledWith('library')
    fireEvent.press(
      screen.getByRole('button', { name: 'Save to Apple Health' }),
    )

    expect(
      await screen.findByText(
        'The meal was not saved. Allow this app to write Dietary Energy in Apple Health, then try again.',
      ),
    ).toBeTruthy()
    expect(screen.getByTestId('food-estimate')).toBeTruthy()
    expect(mockGetFoodLog).toHaveBeenCalledTimes(1)

    fireEvent.press(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.queryByTestId('food-estimate')).toBeNull()
    expect(screen.getByTestId('food-snap')).toBeTruthy()
    expect(foodWriter.save).toHaveBeenCalledTimes(1)
  })

  it('explains a photo that could not be estimated', async () => {
    jest
      .mocked(estimateMealPhoto)
      .mockRejectedValue(new MealPhotoError('not-food'))
    mockDay(today)
    render(<FoodScreen />)
    await screen.findByTestId('food-slot-Breakfast')

    fireEvent.press(screen.getByRole('button', { name: 'Snap meal' }))

    expect(
      await screen.findByText(
        'No food was recognized in that photo. Nothing was saved.',
      ),
    ).toBeTruthy()
    expect(screen.queryByTestId('food-estimate')).toBeNull()
    expect(foodWriter.save).not.toHaveBeenCalled()
  })

  it('blocks entry on builds that cannot save food', async () => {
    jest.mocked(foodWriter.getAvailability).mockReturnValue({
      available: false,
      reason: 'build-required',
      message: 'A new iOS build is required to add food.',
    })
    mockDay(today)
    render(<FoodScreen />)
    await screen.findByTestId('food-slot-Breakfast')

    expect(
      screen.getByText('A new iOS build is required to add food.'),
    ).toBeTruthy()
    expect(screen.queryByTestId('food-snap')).toBeNull()
  })

  it('retries a failed meal read', async () => {
    mockDay('2026-01-15')
    mockGetFoodLog.mockRejectedValueOnce(new Error('Health read failed'))
    mockGetFoodLog.mockResolvedValue({
      proteinGrams: null,
      carbsGrams: null,
      fatGrams: null,
      meals: [],
    })
    render(<FoodScreen />)

    expect(await screen.findByText('Unable to load meals')).toBeTruthy()
    fireEvent.press(
      screen.getByRole('button', { name: 'Retry loading health data' }),
    )
    expect(
      await screen.findByText('No meals in Apple Health for this day.'),
    ).toBeTruthy()
  })

  it('steps the daily goal within its limits', async () => {
    mockDay('2026-01-15')
    render(<FoodScreen />)
    await screen.findByTestId('food-slot-Breakfast')

    fireEvent.press(
      screen.getByRole('button', { name: 'Raise daily goal by 50 kcal' }),
    )
    expect(useThemeStore.getState().foodGoalKcal).toBe(2250)
    expect(screen.getByText('2250 kcal before workouts')).toBeTruthy()
    expect(screen.getByText('Budget: 2250 kcal')).toBeTruthy()
    expect(screen.getByLabelText('1112 kcal under budget')).toBeTruthy()

    act(() => {
      useThemeStore.setState({ foodGoalKcal: 4000 })
    })
    expect(
      screen.getByRole('button', { name: 'Raise daily goal by 50 kcal' }),
    ).toBeDisabled()
    act(() => {
      useThemeStore.setState({ foodGoalKcal: 1200 })
    })
    expect(
      screen.getByRole('button', { name: 'Lower daily goal by 50 kcal' }),
    ).toBeDisabled()
  })
})

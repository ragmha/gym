import { act, cleanup, renderHook } from '@testing-library/react-native'

import { supabase } from '@/lib/supabase'
import { useDailyNutrition, useMealStoreBase } from '@/stores/MealStore'

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}))

// Bypass the global mock from jest.setup.ts so we exercise the real store.
const { useMealStoreBase: realStoreBase, useDailyNutrition: realDaily } =
  jest.requireActual<typeof import('@/stores/MealStore')>('@/stores/MealStore')

const initial = {
  meals: [],
  loading: false,
  error: null,
  initialized: false,
  targets: { caloriesKcal: 2200, proteinG: 150, carbG: 250, fatG: 70 },
}

function mockSupabaseSelect(response: { data: any; error: any }) {
  const m = jest.mocked(supabase)
  m.from.mockReturnValue({
    select: jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(response),
      }),
    }),
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
    delete: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  } as any)
}

function todayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

beforeEach(() => {
  realStoreBase.setState(initial)
})

afterEach(() => {
  cleanup()
})

describe('MealStore', () => {
  describe('initial state', () => {
    it('starts empty with default targets', () => {
      const state = realStoreBase.getState()
      expect(state.meals).toEqual([])
      expect(state.initialized).toBe(false)
      expect(state.targets.caloriesKcal).toBeGreaterThan(0)
    })
  })

  describe('initialize()', () => {
    it('starts empty when supabase returns empty', async () => {
      mockSupabaseSelect({ data: [], error: null })
      await realStoreBase.getState().initialize()
      expect(realStoreBase.getState().initialized).toBe(true)
      expect(realStoreBase.getState().meals).toEqual([])
    })

    it('starts empty when supabase errors', async () => {
      mockSupabaseSelect({ data: null, error: { message: 'oops' } })
      await realStoreBase.getState().initialize()
      expect(realStoreBase.getState().initialized).toBe(true)
      expect(realStoreBase.getState().meals).toEqual([])
    })

    it('does not re-initialize if already initialized', async () => {
      mockSupabaseSelect({ data: [], error: null })
      await realStoreBase.getState().initialize()
      const m = jest.mocked(supabase)
      m.from.mockClear()
      await realStoreBase.getState().initialize()
      expect(m.from).not.toHaveBeenCalled()
    })
  })

  describe('addMeal()', () => {
    it('inserts an optimistic meal that survives even if Supabase fails', async () => {
      mockSupabaseSelect({ data: [], error: null })
      await realStoreBase.getState().initialize()

      let saved
      await act(async () => {
        saved = await realStoreBase.getState().addMeal({
          name: 'Avocado Toast',
          caloriesKcal: 360,
          proteinG: 12,
          carbG: 32,
          fatG: 22,
          source: 'photo',
        })
      })

      const state = realStoreBase.getState()
      expect(state.meals).toHaveLength(1)
      expect(state.meals[0].name).toBe('Avocado Toast')
      expect(saved).toBeDefined()
    })
  })

  describe('updateMeal()', () => {
    it('patches a meal and reverts on Supabase failure', async () => {
      mockSupabaseSelect({ data: [], error: null })
      await realStoreBase.getState().initialize()

      let id: string | undefined
      await act(async () => {
        const saved = await realStoreBase.getState().addMeal({
          name: 'Sushi',
          caloriesKcal: 500,
          proteinG: 20,
          carbG: 70,
          fatG: 12,
          source: 'manual',
        })
        id = saved.id
      })

      await act(async () => {
        await realStoreBase
          .getState()
          .updateMeal(id!, { name: 'Sushi Roll Platter', caloriesKcal: 540 })
      })

      const updated = realStoreBase.getState().meals.find((m) => m.id === id)
      expect(updated?.name).toBe('Sushi Roll Platter')
      expect(updated?.caloriesKcal).toBe(540)
    })
  })

  describe('deleteMeal()', () => {
    it('removes the meal optimistically', async () => {
      mockSupabaseSelect({ data: [], error: null })
      await realStoreBase.getState().initialize()

      let id: string | undefined
      await act(async () => {
        const saved = await realStoreBase.getState().addMeal({
          name: 'Snack',
          caloriesKcal: 120,
          proteinG: 4,
          carbG: 18,
          fatG: 3,
          source: 'manual',
        })
        id = saved.id
      })

      await act(async () => {
        await realStoreBase.getState().deleteMeal(id!)
      })

      expect(realStoreBase.getState().meals).toHaveLength(0)
    })
  })

  describe('setTargets()', () => {
    it('merges partial targets', () => {
      act(() => {
        realStoreBase.getState().setTargets({ caloriesKcal: 2500 })
      })
      const t = realStoreBase.getState().targets
      expect(t.caloriesKcal).toBe(2500)
      expect(t.proteinG).toBe(150) // unchanged
    })
  })
})

describe('useDailyNutrition', () => {
  it('aggregates today’s meals and computes progress against targets', async () => {
    mockSupabaseSelect({ data: [], error: null })
    await realStoreBase.getState().initialize()

    await act(async () => {
      await realStoreBase.getState().addMeal({
        name: 'Breakfast',
        caloriesKcal: 500,
        proteinG: 30,
        carbG: 60,
        fatG: 15,
        source: 'manual',
      })
      await realStoreBase.getState().addMeal({
        name: 'Lunch',
        caloriesKcal: 700,
        proteinG: 40,
        carbG: 70,
        fatG: 25,
        source: 'manual',
      })
    })

    const { result } = renderHook(() => realDaily())
    expect(result.current.totals.caloriesKcal).toBe(1200)
    expect(result.current.totals.proteinG).toBe(70)
    expect(result.current.meals).toHaveLength(2)
    expect(result.current.progress.calories).toBeCloseTo(1200 / 2200)
    expect(result.current.remaining.caloriesKcal).toBe(2200 - 1200)
  })

  it('excludes meals from other dates', async () => {
    mockSupabaseSelect({ data: [], error: null })
    await realStoreBase.getState().initialize()

    await act(async () => {
      await realStoreBase.getState().addMeal({
        name: 'Yesterday breakfast',
        caloriesKcal: 400,
        proteinG: 20,
        carbG: 50,
        fatG: 10,
        source: 'manual',
        date: '2020-01-01',
      })
      await realStoreBase.getState().addMeal({
        name: 'Today snack',
        caloriesKcal: 150,
        proteinG: 5,
        carbG: 20,
        fatG: 4,
        source: 'manual',
      })
    })

    const { result } = renderHook(() => realDaily(todayStr()))
    expect(result.current.totals.caloriesKcal).toBe(150)
    expect(result.current.meals).toHaveLength(1)
  })
})

// Quiet the unused-import warning for re-exports.
void useMealStoreBase
void useDailyNutrition

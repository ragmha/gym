import AsyncStorage from '@react-native-async-storage/async-storage'

import exerciseData from '@/data/exercises.json'
import { useExerciseTracker } from '@/hooks/use-exercsie-tracker'
import { act, renderHook, waitFor } from '@/utils/test/test-utils'

describe('useExerciseTracker', () => {
  beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => null))
  beforeEach(() => {
    AsyncStorage.clear()
  })

  it('loads exercises from AsyncStorage if exist', async () => {
    await AsyncStorage.setItem('exercise-data', JSON.stringify(exerciseData))

    const { result } = renderHook(() => useExerciseTracker())

    expect(AsyncStorage.getItem).toHaveBeenCalledWith('exercise-data')

    await waitFor(() => {
      expect(result.current.exercises).toStrictEqual(exerciseData)
    })
  })

  it('handles error when loading exercises from AsyncStorage', async () => {
    const error = new SyntaxError('Unexpected token i in JSON at position 0')
    await AsyncStorage.setItem('exercise-data', 'invalid-json')

    const { result } = renderHook(() => useExerciseTracker())

    expect(result.current.exercises).toBeNull()

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        `Failed to load exercises from Async Storage: ${error}`,
      )
    })
  })

  it('saves exercises to AsyncStorage if exist', async () => {
    await AsyncStorage.setItem('exercise-data', JSON.stringify([]))

    const { result } = renderHook(() => useExerciseTracker())

    act(() => {
      result.current.setExercises(exerciseData)
    })

    await waitFor(() => {
      expect(result.current.exercises).toStrictEqual(exerciseData)
    })
  })
})

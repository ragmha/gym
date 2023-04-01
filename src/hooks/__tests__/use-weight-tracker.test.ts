import type { WeightEntry } from '@/hooks/use-weight-tracker'

import AsyncStorage from '@react-native-async-storage/async-storage'
import { DateTime } from 'luxon'

import { weightEntrySchema, useWeightTracker } from '@/hooks/use-weight-tracker'
import { act, renderHook, waitFor } from '@/utils/test/test-utils'

describe('useWeightTracker', () => {
  beforeEach(() => {
    AsyncStorage.clear()
  })

  it('should load filtered weight data on loading', async () => {
    const weightData: WeightEntry[] = [
      {
        weight: 80,
        date: DateTime.fromISO('2023-01-01T00:00:00.000+02:00').toISO(),
      },
      {
        weight: 90,
        date: DateTime.fromISO('2023-01-01T00:00:00.000+02:00').toISO(),
      },
      { weight: -5, date: 'invalid date' },
    ]

    await AsyncStorage.setItem('weight-data', JSON.stringify(weightData))

    const { result } = renderHook(() => useWeightTracker())

    expect(AsyncStorage.getItem).toBeCalledWith('weight-data')

    await waitFor(async () => {
      expect(result.current.weightData.length).toBe(weightData.length - 1)
    })

    const expectedResult = weightData.filter((entry) => {
      const parseResult = weightEntrySchema.safeParse(entry)
      return parseResult.success
    })

    expect(result.current.weightData).toEqual(expectedResult)
  })

  it('should add a new weight entry', () => {
    const { result } = renderHook(() => useWeightTracker())

    const newWeightEntry: WeightEntry = {
      weight: 80,
      date: DateTime.now().toFormat('yyyy-MM-dd'),
    }

    act(() => {
      result.current.setWeight(newWeightEntry.weight)
    })

    expect(result.current.weight).toEqual(newWeightEntry.weight)

    act(() => {
      result.current.addWeightEntry()
    })

    expect(result.current.date).toEqual(newWeightEntry.date)

    expect(result.current.weightData).toEqual([newWeightEntry])
  })
})

import { act, renderHook } from '@testing-library/react-native'
import { Platform } from 'react-native'

import { useWidgetSync } from '@/hooks/useWidgetSync'
import * as widgetSnapshot from '@/lib/widgetSnapshot'
import { useStepsStoreBase } from '@/stores/StepsStore'
import { useWorkoutSessionStoreBase } from '@/stores/WorkoutSessionStore'

const pushTodaySnapshotMock = jest.spyOn(widgetSnapshot, 'pushTodaySnapshot')

describe('useWidgetSync', () => {
  const originalPlatform = Platform.OS

  beforeEach(() => {
    jest.useFakeTimers()
    pushTodaySnapshotMock.mockClear()
    useStepsStoreBase.setState({ steps: 0, stepsGoal: 10_000 })
    useWorkoutSessionStoreBase.setState({ sessions: {} })
  })

  afterEach(() => {
    jest.useRealTimers()
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform,
    })
  })

  it('debounces sync writes on iOS store changes', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })

    renderHook(() => useWidgetSync())

    act(() => {
      useStepsStoreBase.getState().setSteps(4321)
      useStepsStoreBase.getState().setStepsGoal(9000)
      useWorkoutSessionStoreBase.setState({
        sessions: {
          'session-1': {
            id: 'session-1',
            templateId: 'template-1',
            startedAt: '2026-05-16T07:00:00.000Z',
            completedAt: '2026-05-16T08:00:00.000Z',
            cardio: { morning: 0, evening: 0 },
            cardioCompleted: { morning: false, evening: false },
            status: 'complete',
            exerciseProgress: {
              'detail-1': {
                detailId: 'detail-1',
                selectedSets: [true, true, false],
                weightPerSet: [0, 0, 0],
              },
            },
          },
        },
      })
      jest.advanceTimersByTime(250)
    })

    expect(pushTodaySnapshotMock).toHaveBeenCalledTimes(1)
    expect(pushTodaySnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        steps: 4321,
        stepsGoal: 9000,
        workoutXp: 20,
        lastWorkoutAt: '2026-05-16T08:00:00.000Z',
      }),
    )
  })

  it('does not write snapshots on non-iOS platforms', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' })

    renderHook(() => useWidgetSync())

    act(() => {
      useStepsStoreBase.getState().setSteps(1234)
      jest.advanceTimersByTime(500)
    })

    expect(pushTodaySnapshotMock).not.toHaveBeenCalled()
  })
})

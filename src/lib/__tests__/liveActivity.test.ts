import {
  endWorkoutActivity,
  startWorkoutActivity,
  updateWorkoutActivity,
} from '@/lib/liveActivity'

import * as nativeLiveActivity from '../../../modules/live-activity'

jest.mock('../../../modules/live-activity', () => ({
  areActivitiesEnabled: jest.fn(async () => true),
  startActivity: jest.fn(async () => 'activity-id-1'),
  updateActivity: jest.fn(async () => undefined),
  endActivity: jest.fn(async () => undefined),
}))

describe('liveActivity wrapper', () => {
  beforeEach(async () => {
    await endWorkoutActivity()
    jest.clearAllMocks()
  })

  it('starts an activity with the expected payload shape', async () => {
    await startWorkoutActivity('Push Day', {
      exerciseName: 'Bench Press',
      currentSet: 2,
      totalSets: 4,
      restEndsAt: null,
    })

    expect(nativeLiveActivity.areActivitiesEnabled).toHaveBeenCalled()
    expect(nativeLiveActivity.startActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        workoutName: 'Push Day',
        startedAt: expect.any(String),
      }),
      {
        exerciseName: 'Bench Press',
        currentSet: 2,
        totalSets: 4,
        restEndsAt: null,
      },
    )
  })

  it('updates and ends only when a live activity has started', async () => {
    await updateWorkoutActivity({
      exerciseName: 'Incline Press',
      currentSet: 3,
      totalSets: 4,
      restEndsAt: new Date('2026-05-16T09:10:00.000Z'),
    })

    expect(nativeLiveActivity.updateActivity).not.toHaveBeenCalled()

    await startWorkoutActivity('Push Day', {
      exerciseName: 'Bench Press',
      currentSet: 1,
      totalSets: 4,
      restEndsAt: null,
    })

    await updateWorkoutActivity({
      exerciseName: 'Incline Press',
      currentSet: 3,
      totalSets: 4,
      restEndsAt: new Date('2026-05-16T09:10:00.000Z'),
    })

    expect(nativeLiveActivity.updateActivity).toHaveBeenCalledWith(
      'activity-id-1',
      {
        exerciseName: 'Incline Press',
        currentSet: 3,
        totalSets: 4,
        restEndsAt: '2026-05-16T09:10:00.000Z',
      },
    )

    await endWorkoutActivity()
    expect(nativeLiveActivity.endActivity).toHaveBeenCalledWith('activity-id-1')
  })

  it('is a no-op when iOS activities are not enabled', async () => {
    ;(
      nativeLiveActivity.areActivitiesEnabled as jest.Mock
    ).mockResolvedValueOnce(false)

    await startWorkoutActivity('Pull Day', {
      exerciseName: 'Rows',
      currentSet: 1,
      totalSets: 3,
      restEndsAt: null,
    })

    expect(nativeLiveActivity.startActivity).not.toHaveBeenCalled()
  })
})

import { supabase } from '@/lib/supabase'
import { fetchPriorAggregates } from '../fetchPriorAggregates'

function mockPriorAggregateQuery(result: {
  data: unknown[]
  error: Error | null
}) {
  const limit = jest.fn(async () => result)
  const order = jest.fn(() => ({ limit }))
  const lt = jest.fn(() => ({ order }))
  const eq = jest.fn(() => ({ lt, order }))
  const select = jest.fn(() => ({ eq }))
  jest.mocked(supabase).from.mockReturnValue({ select } as never)

  return { select, eq, lt, order, limit }
}

describe('fetchPriorAggregates', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('maps completed workout rows and filters null volumes', async () => {
    const query = mockPriorAggregateQuery({
      data: [
        {
          completed_at: '2026-06-05T10:00:00.000Z',
          total_volume_kg: 1000,
        },
        {
          completed_at: '2026-05-29T10:00:00.000Z',
          total_volume_kg: null,
        },
      ],
      error: null,
    })

    await expect(
      fetchPriorAggregates('Push Day', 3, '2026-06-12T10:00:00.000Z'),
    ).resolves.toEqual([
      {
        completedAt: '2026-06-05T10:00:00.000Z',
        totalVolumeKg: 1000,
      },
    ])

    expect(supabase.from).toHaveBeenCalledWith('workout_sessions')
    expect(query.select).toHaveBeenCalledWith('completed_at,total_volume_kg')
    expect(query.eq).toHaveBeenCalledWith('title', 'Push Day')
    expect(query.lt).toHaveBeenCalledWith(
      'completed_at',
      '2026-06-12T10:00:00.000Z',
    )
    expect(query.order).toHaveBeenCalledWith('completed_at', {
      ascending: false,
    })
    expect(query.limit).toHaveBeenCalledWith(3)
  })

  it('returns an empty array when Supabase returns an error', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    mockPriorAggregateQuery({
      data: [],
      error: new Error('offline'),
    })

    await expect(fetchPriorAggregates('Push Day')).resolves.toEqual([])

    expect(console.warn).toHaveBeenCalledWith(
      'Failed to fetch prior workout aggregates',
      expect.any(Error),
    )
  })
})

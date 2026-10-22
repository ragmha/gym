import type { Commute } from '@/lib/planner'
import { fetchCommute, searchStations } from '@/lib/transit'

const commute: Commute = {
  home: { gtfsId: 'HSL:1', name: 'Home station', lat: 60.2, lon: 24.9 },
  work: { gtfsId: 'HSL:2', name: 'Work station', lat: 60.1, lon: 24.8 },
  start: '09:00',
  end: '17:00',
  homeWalkMinutes: 5,
  workWalkMinutes: 10,
}
const now = new Date(2026, 9, 21, 7)
const iso = (hour: number, minute = 0) =>
  new Date(2026, 9, 21, hour, minute).toISOString()
const signal = new AbortController().signal
const originalFetch = global.fetch
const mockFetch = jest.fn()
const journey = (
  start: string,
  end: string,
  mode = 'SUBWAY',
  realtimeState = 'SCHEDULED',
) => ({
  node: {
    start,
    end,
    legs: [
      {
        mode,
        tripOnServiceDate: {
          realTimeTripState: {
            updated: realtimeState === 'UPDATED',
            canceled: realtimeState === 'CANCELED',
          },
        },
      },
    ],
  },
})
const respond = (data: unknown) =>
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data }),
  })

beforeEach(() => {
  global.fetch = mockFetch
  mockFetch.mockReset()
})
afterAll(() => {
  global.fetch = originalFetch
})

it('uses the HSL v2 API, a header-only key and safely encoded station names', async () => {
  respond({ stations: [commute.home] })
  expect(await searchStations('Kamppi "metro"', 'test-key', signal)).toEqual([
    commute.home,
  ])
  const [endpoint, request] = mockFetch.mock.calls[0]
  expect(endpoint).toBe('https://api.digitransit.fi/routing/v2/hsl/gtfs/v1')
  expect(request.headers['digitransit-subscription-key']).toBe('test-key')
  expect(request.body).not.toContain('test-key')
  expect(JSON.parse(request.body).query).toContain(
    'stations(name: "Kamppi \\"metro\\"")',
  )
})

it('picks the latest feasible outbound metro with walking at both ends', async () => {
  respond({
    planConnection: {
      edges: [
        journey(iso(8), iso(8, 30)),
        journey(iso(8, 10), iso(8, 40), 'SUBWAY', 'UPDATED'),
        journey(iso(8, 30), iso(8, 55)),
        journey(iso(8, 20), iso(8, 45), 'BUS'),
        journey(iso(8, 20), iso(8, 45), 'SUBWAY', 'CANCELED'),
      ],
    },
  })
  const result = await fetchCommute(commute, 'test-key', now, signal)
  expect(result.leaveMs).toBe(new Date(2026, 9, 21, 8, 5).getTime())
  expect(result.arriveMs).toBe(new Date(2026, 9, 21, 8, 50).getTime())
  expect(result.realtime).toBe(true)
  expect(JSON.parse(mockFetch.mock.calls[0][1].body).query).toContain(
    'latestArrival',
  )
})

it('reverses stations for the return and uses the earliest departure after work and walking', async () => {
  respond({
    planConnection: {
      edges: [
        journey(iso(17, 20), iso(17, 50)),
        journey(iso(17, 10), iso(17, 40)),
      ],
    },
  })
  const result = await fetchCommute(
    commute,
    'test-key',
    new Date(2026, 9, 21, 12),
    signal,
  )
  expect(result.direction).toBe('Home')
  expect(result.leaveMs).toBe(new Date(2026, 9, 21, 17).getTime())
  expect(result.arriveMs).toBe(new Date(2026, 9, 21, 17, 45).getTime())
  const query = JSON.parse(mockFetch.mock.calls[0][1].body).query
  expect(query).toContain('earliestDeparture')
  expect(query.indexOf('latitude:60.1')).toBeLessThan(
    query.indexOf('latitude:60.2'),
  )
  expect(result.realtime).toBe(false)
})

it('rejects unsuitable, malformed and failed HSL responses without fabricated journeys or native errors', async () => {
  respond({ planConnection: { edges: [] } })
  await expect(fetchCommute(commute, 'test-key', now, signal)).rejects.toThrow(
    'No suitable',
  )
  respond({ planConnection: { edges: [journey('bad', iso(9))] } })
  await expect(fetchCommute(commute, 'test-key', now, signal)).rejects.toThrow(
    'invalid journey',
  )
  mockFetch.mockResolvedValue({ ok: false, status: 403 })
  await expect(fetchCommute(commute, 'test-key', now, signal)).rejects.toThrow(
    'rejected the API key',
  )
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ errors: [{ message: 'private upstream text' }] }),
  })
  await expect(fetchCommute(commute, 'test-key', now, signal)).rejects.toThrow(
    'HSL could not',
  )
})

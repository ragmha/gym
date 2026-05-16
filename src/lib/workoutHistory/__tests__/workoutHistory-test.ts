import { fetchRecentWorkouts } from '../index'
import type { WorkoutHistoryDeps, WorkoutHistoryEntry } from '../index'

// Fixed clock: 2024-03-15 12:00:00 UTC (a Friday)
const FIXED_NOW = new Date('2024-03-15T12:00:00.000Z')

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(FIXED_NOW)
})

afterEach(() => {
  jest.useRealTimers()
})

// ─── Helpers ─────────────────────────────────────────────────────────

function makeFetchRecent(result: {
  data: WorkoutHistoryEntry[] | null
  error: { message: string } | null
}): WorkoutHistoryDeps['fetchRecent'] {
  return jest.fn(async () => result)
}

// ─── Test 1: calls fetchRecent with correct ISO cutoff ───────────────

describe('fetchRecentWorkouts()', () => {
  describe('1. cutoff date math', () => {
    it('calls fetchRecent with the start-of-day ISO cutoff for daysBack days ago', async () => {
      const fetchRecent = makeFetchRecent({ data: [], error: null })

      await fetchRecentWorkouts(7, { fetchRecent })

      // 7 days before 2024-03-15 = 2024-03-08, start of day UTC
      expect(fetchRecent).toHaveBeenCalledTimes(1)
      expect(fetchRecent).toHaveBeenCalledWith('2024-03-08T00:00:00.000Z')
    })
  })

  // ─── Test 2: maps rows to camelCase entries ────────────────────────

  describe('2. row mapping', () => {
    it('returns camelCase WorkoutHistoryEntry objects when data is present', async () => {
      const rows: WorkoutHistoryEntry[] = [
        { startedAt: '2024-03-10T08:00:00.000Z', durationSeconds: 3600 },
        { startedAt: '2024-03-09T09:00:00.000Z', durationSeconds: 1800 },
      ]
      const fetchRecent = makeFetchRecent({ data: rows, error: null })

      const result = await fetchRecentWorkouts(7, { fetchRecent })

      expect(result).toEqual([
        { startedAt: '2024-03-10T08:00:00.000Z', durationSeconds: 3600 },
        { startedAt: '2024-03-09T09:00:00.000Z', durationSeconds: 1800 },
      ])
    })
  })

  // ─── Test 3: null data returns empty array ─────────────────────────

  describe('3. null data', () => {
    it('returns an empty array when fetchRecent returns data: null', async () => {
      const fetchRecent = makeFetchRecent({ data: null, error: null })

      const result = await fetchRecentWorkouts(7, { fetchRecent })

      expect(result).toEqual([])
    })
  })

  // ─── Test 4: error causes throw ────────────────────────────────────

  describe('4. error propagation', () => {
    it('throws an Error with the error message when fetchRecent returns an error', async () => {
      const rows: WorkoutHistoryEntry[] = [
        { startedAt: '2024-03-10T08:00:00.000Z', durationSeconds: 3600 },
      ]
      const fetchRecent = makeFetchRecent({
        data: rows,
        error: { message: 'oops' },
      })

      await expect(fetchRecentWorkouts(7, { fetchRecent })).rejects.toThrow(
        'oops',
      )
    })
  })

  // ─── Test 5: filters out invalid rows ─────────────────────────────

  describe('5. hygiene filtering', () => {
    it('filters out rows where durationSeconds <= 0 or startedAt is missing/non-string', async () => {
      const rows = [
        { startedAt: '2024-03-10T08:00:00.000Z', durationSeconds: 3600 }, // valid
        { startedAt: '2024-03-09T08:00:00.000Z', durationSeconds: 0 }, // invalid: zero duration
        { startedAt: '2024-03-08T08:00:00.000Z', durationSeconds: -5 }, // invalid: negative duration
        { startedAt: null as unknown as string, durationSeconds: 900 }, // invalid: missing startedAt
        { startedAt: 123 as unknown as string, durationSeconds: 900 }, // invalid: non-string startedAt
      ]
      // Pass rows through as WorkoutHistoryEntry (they're mixed/invalid for testing purposes)
      const fetchRecent = jest.fn(async () => ({
        data: rows as WorkoutHistoryEntry[],
        error: null,
      }))

      const result = await fetchRecentWorkouts(7, { fetchRecent })

      expect(result).toHaveLength(1)
      expect(result[0].startedAt).toBe('2024-03-10T08:00:00.000Z')
    })
  })

  // ─── Test 6: preserves adapter order ───────────────────────────────

  describe('6. order preservation', () => {
    it('returns rows in the same order as returned by the adapter', async () => {
      // Adapter returns desc by started_at — we must not re-sort
      const rows: WorkoutHistoryEntry[] = [
        { startedAt: '2024-03-12T08:00:00.000Z', durationSeconds: 1800 },
        { startedAt: '2024-03-10T08:00:00.000Z', durationSeconds: 3600 },
        { startedAt: '2024-03-08T10:00:00.000Z', durationSeconds: 2700 },
      ]
      const fetchRecent = makeFetchRecent({ data: rows, error: null })

      const result = await fetchRecentWorkouts(7, { fetchRecent })

      expect(result.map((r) => r.startedAt)).toEqual([
        '2024-03-12T08:00:00.000Z',
        '2024-03-10T08:00:00.000Z',
        '2024-03-08T10:00:00.000Z',
      ])
    })
  })
})

import {
  getStationPR,
  getStationTrend,
  useHyroxBenchmarkStoreBase,
} from '../HyroxBenchmarkStore'

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  ),
)

beforeEach(() => {
  useHyroxBenchmarkStoreBase.setState({ benchmarks: [] })
})

describe('HyroxBenchmarkStore', () => {
  it('addBenchmark prepends and sorts by recordedAt desc', () => {
    useHyroxBenchmarkStoreBase.getState().addBenchmark({
      station: 'run_1km',
      timeSeconds: 300,
      recordedAt: '2026-05-01T07:00:00Z',
    })
    useHyroxBenchmarkStoreBase.getState().addBenchmark({
      station: 'run_1km',
      timeSeconds: 290,
      recordedAt: '2026-05-10T07:00:00Z',
    })
    useHyroxBenchmarkStoreBase.getState().addBenchmark({
      station: 'run_1km',
      timeSeconds: 295,
      recordedAt: '2026-04-28T07:00:00Z',
    })

    const sorted = useHyroxBenchmarkStoreBase.getState().benchmarks
    expect(sorted.map((b) => b.recordedAt)).toEqual([
      '2026-05-10T07:00:00Z',
      '2026-05-01T07:00:00Z',
      '2026-04-28T07:00:00Z',
    ])
  })

  it('addBenchmark accepts optional weight and note', () => {
    const entry = useHyroxBenchmarkStoreBase.getState().addBenchmark({
      station: 'sled_push_50m',
      timeSeconds: 95,
      weightKg: 152,
      note: 'felt heavy',
    })
    expect(entry.weightKg).toBe(152)
    expect(entry.note).toBe('felt heavy')
  })

  it('addBenchmark clamps negative time to zero and rounds to integer seconds', () => {
    const entry = useHyroxBenchmarkStoreBase.getState().addBenchmark({
      station: 'wall_balls_100',
      timeSeconds: -15.7,
    })
    expect(entry.timeSeconds).toBe(0)

    const entry2 = useHyroxBenchmarkStoreBase.getState().addBenchmark({
      station: 'wall_balls_100',
      timeSeconds: 268.6,
    })
    expect(entry2.timeSeconds).toBe(269)
  })

  it('removeBenchmark removes by id', () => {
    const entry = useHyroxBenchmarkStoreBase
      .getState()
      .addBenchmark({ station: 'row_1000m', timeSeconds: 240 })
    expect(useHyroxBenchmarkStoreBase.getState().benchmarks).toHaveLength(1)
    useHyroxBenchmarkStoreBase.getState().removeBenchmark(entry.id)
    expect(useHyroxBenchmarkStoreBase.getState().benchmarks).toHaveLength(0)
  })
})

describe('getStationPR', () => {
  it('returns null when no benchmarks exist', () => {
    expect(getStationPR([], 'run_1km')).toBeNull()
  })

  it('returns the fastest time for a station, ignoring other stations', () => {
    const benchmarks = [
      {
        id: '1',
        station: 'run_1km' as const,
        timeSeconds: 305,
        weightKg: null,
        recordedAt: '2026-05-01T07:00:00Z',
        note: null,
      },
      {
        id: '2',
        station: 'run_1km' as const,
        timeSeconds: 295,
        weightKg: null,
        recordedAt: '2026-05-10T07:00:00Z',
        note: null,
      },
      {
        id: '3',
        station: 'row_1000m' as const,
        timeSeconds: 240,
        weightKg: null,
        recordedAt: '2026-05-10T07:00:00Z',
        note: null,
      },
    ]
    expect(getStationPR(benchmarks, 'run_1km')?.id).toBe('2')
    expect(getStationPR(benchmarks, 'row_1000m')?.id).toBe('3')
  })
})

describe('getStationTrend', () => {
  it('returns null deltaSeconds when only one attempt', () => {
    const benchmarks = [
      {
        id: '1',
        station: 'sled_push_50m' as const,
        timeSeconds: 100,
        weightKg: 152,
        recordedAt: '2026-05-10T07:00:00Z',
        note: null,
      },
    ]
    expect(getStationTrend(benchmarks, 'sled_push_50m').deltaSeconds).toBeNull()
  })

  it('returns negative delta when latest is faster than previous', () => {
    const benchmarks = [
      {
        id: 'old',
        station: 'sled_push_50m' as const,
        timeSeconds: 110,
        weightKg: 152,
        recordedAt: '2026-04-20T07:00:00Z',
        note: null,
      },
      {
        id: 'new',
        station: 'sled_push_50m' as const,
        timeSeconds: 95,
        weightKg: 152,
        recordedAt: '2026-05-10T07:00:00Z',
        note: null,
      },
    ]
    const trend = getStationTrend(benchmarks, 'sled_push_50m')
    expect(trend.latest?.id).toBe('new')
    expect(trend.previous?.id).toBe('old')
    expect(trend.deltaSeconds).toBe(-15)
  })

  it('returns positive delta when latest is slower than previous', () => {
    const benchmarks = [
      {
        id: 'old',
        station: 'wall_balls_100' as const,
        timeSeconds: 250,
        weightKg: 9,
        recordedAt: '2026-04-20T07:00:00Z',
        note: null,
      },
      {
        id: 'new',
        station: 'wall_balls_100' as const,
        timeSeconds: 280,
        weightKg: 9,
        recordedAt: '2026-05-10T07:00:00Z',
        note: null,
      },
    ]
    expect(getStationTrend(benchmarks, 'wall_balls_100').deltaSeconds).toBe(30)
  })
})

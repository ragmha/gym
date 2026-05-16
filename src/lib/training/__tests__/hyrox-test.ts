import {
  compareToTarget,
  formatStationTime,
  getStation,
  HYROX_STATIONS,
  parseStationTime,
} from '../hyrox'

describe('HYROX_STATIONS catalogue', () => {
  it('has exactly the 8 race stations + 1km run + simulated total', () => {
    expect(HYROX_STATIONS).toHaveLength(10)
    const ids = HYROX_STATIONS.map((s) => s.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'run_1km',
        'ski_erg_1000m',
        'sled_push_50m',
        'sled_pull_50m',
        'burpee_broad_jump_80m',
        'row_1000m',
        'farmers_carry_200m',
        'sandbag_lunges_100m',
        'wall_balls_100',
        'simulated_total',
      ]),
    )
  })

  it('marks weight-bearing stations correctly', () => {
    const weightStations = HYROX_STATIONS.filter((s) => s.supportsWeight).map(
      (s) => s.id,
    )
    expect(weightStations).toEqual([
      'sled_push_50m',
      'sled_pull_50m',
      'farmers_carry_200m',
      'sandbag_lunges_100m',
      'wall_balls_100',
    ])
    for (const station of HYROX_STATIONS.filter((s) => s.supportsWeight)) {
      expect(station.defaultWeightKg).toBeGreaterThan(0)
    }
  })
})

describe('getStation', () => {
  it('returns the metadata for a known id', () => {
    expect(getStation('run_1km').targetSeconds).toBe(300)
  })

  it('throws on unknown ids', () => {
    expect(() => getStation('totally_made_up' as unknown as 'run_1km')).toThrow(
      /Unknown Hyrox station/,
    )
  })
})

describe('compareToTarget', () => {
  it('green when at or under target', () => {
    expect(compareToTarget('run_1km', 240)).toBe('green')
    expect(compareToTarget('run_1km', 300)).toBe('green')
  })

  it('amber when within 25% over target', () => {
    expect(compareToTarget('run_1km', 350)).toBe('amber')
    expect(compareToTarget('run_1km', 375)).toBe('amber')
  })

  it('red when more than 25% over target', () => {
    expect(compareToTarget('run_1km', 400)).toBe('red')
  })
})

describe('formatStationTime', () => {
  it('formats m:ss for sub-hour times', () => {
    expect(formatStationTime(75)).toBe('1:15')
    expect(formatStationTime(60)).toBe('1:00')
    expect(formatStationTime(7)).toBe('0:07')
  })

  it('formats h:mm:ss for the full simulated race', () => {
    expect(formatStationTime(5400)).toBe('1:30:00')
    expect(formatStationTime(3661)).toBe('1:01:01')
  })

  it('renders dash for invalid input', () => {
    expect(formatStationTime(-1)).toBe('—')
    expect(formatStationTime(Number.NaN)).toBe('—')
  })
})

describe('parseStationTime', () => {
  it('parses ss', () => {
    expect(parseStationTime('45')).toBe(45)
  })

  it('parses m:ss', () => {
    expect(parseStationTime('4:30')).toBe(270)
    expect(parseStationTime('5:00')).toBe(300)
  })

  it('parses h:mm:ss', () => {
    expect(parseStationTime('1:30:00')).toBe(5400)
  })

  it('rejects invalid formats', () => {
    expect(parseStationTime('')).toBeNull()
    expect(parseStationTime('abc')).toBeNull()
    expect(parseStationTime('5:75')).toBeNull() // seconds >= 60
    expect(parseStationTime('1:75:00')).toBeNull() // minutes >= 60
    expect(parseStationTime('-1')).toBeNull()
  })
})

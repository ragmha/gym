export interface DailyHealthSnapshot {
  /** Local calendar date in YYYY-MM-DD format. */
  date: string
  steps: number | null
  calories: number | null
  sleepHours: number | null
  heartRate: number | null
  hrv: number | null
  restingHeartRate: number | null
  waterLiters: number | null
  flightsClimbed: number | null
  /** Most recent body mass sample in kilograms, not a same-day-only reading. */
  bodyMassKg: number | null
  /** Observed weigh-ins from the selected day and the preceding 13 days. */
  bodyMassHistory: HealthBodyMassSample[] | null
  /** Dietary energy consumed for the day in kcal. */
  dietaryCalories: number | null
  workouts: HealthWorkout[]
}

export interface HealthWorkout {
  kind: 'running' | 'stairClimber' | 'strength' | 'other'
  activityName: string
  /** A workout-specific average, never evidence of time in a heart-rate zone. */
  averageHeartRate: number | null
  calories: number | null
  distance: number | null
  durationMinutes: number
  startISO: string
  endISO: string
}

export interface HealthBodyMassSample {
  kilograms: number
  startISO: string
}

export interface HealthHeartRateSample {
  bpm: number
  startISO: string
}

export interface StairSessionHeartRate {
  /** The day's longest stair session the samples belong to. */
  workout: HealthWorkout
  /** Heart-rate samples recorded during the session, oldest first. */
  samples: HealthHeartRateSample[]
  /** Age-predicted max (220 − age) from the Health date of birth; null without one. */
  maxHeartRate: number | null
}

export type IntensityMap = Map<string, number>

export interface DailyWaterReading {
  /** Local calendar date in YYYY-MM-DD format. */
  date: string
  /** Null means Health returned no water reading for that day. */
  liters: number | null
}

export interface DailyWorkouts {
  /** Local calendar date in YYYY-MM-DD format. */
  date: string
  /** Workouts that started on that local day. */
  workouts: HealthWorkout[]
}

export interface HealthSnapshotSource {
  /** Single entry point that fetches one day's metrics in parallel internally. */
  getDailySnapshot(date: Date): Promise<DailyHealthSnapshot>
  /** Heatmap input — one bulk query, not N daily ones. */
  getRangeIntensity(daysBack: number): Promise<IntensityMap>
  /** Daily water totals for `days` local days ending on `endDate`, oldest first, in one bulk query. */
  getWaterHistory(endDate: Date, days: number): Promise<DailyWaterReading[]>
  /** Workouts for `days` local days ending on `endDate`, oldest first, in one bulk query. */
  getWorkoutHistory(endDate: Date, days: number): Promise<DailyWorkouts[]>
  /** Heart rate during `date`'s longest stair session; null when there is none. */
  getStairHeartRate(date: Date): Promise<StairSessionHeartRate | null>
  /** Observe saved workout changes. Null means observation is unavailable. */
  subscribeToWorkoutChanges(onChange: () => void): (() => void) | null
  /** True means the request completed, not that read access was granted; HealthKit hides read-grant state. Mock returns true. */
  requestAuthorization(): Promise<boolean>
  /** Cheap synchronous check. Mock returns false (it's not "real"); iOS adapter returns Platform.OS === 'ios'. */
  isAvailable(): boolean
}

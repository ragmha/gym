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
  /** Dietary energy consumed for the day in kcal. */
  dietaryCalories: number | null
  workouts: HealthWorkout[]
}

export interface HealthWorkout {
  activityName: string
  calories: number | null
  distance: number | null
  durationMinutes: number
  startISO: string
  endISO: string
}

export type IntensityMap = Map<string, number>

export interface HealthSnapshotSource {
  /** Single entry point that fetches one day's metrics in parallel internally. */
  getDailySnapshot(date: Date): Promise<DailyHealthSnapshot>
  /** Heatmap input — one bulk query, not N daily ones. */
  getRangeIntensity(daysBack: number): Promise<IntensityMap>
  /** True means the request completed, not that read access was granted; HealthKit hides read-grant state. Mock returns true. */
  requestAuthorization(): Promise<boolean>
  /** Cheap synchronous check. Mock returns false (it's not "real"); iOS adapter returns Platform.OS === 'ios'. */
  isAvailable(): boolean
}

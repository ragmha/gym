export interface DailyHealthSnapshot {
  date: string
  steps: number | null
  calories: number | null
  sleepHours: number | null
  heartRate: number | null
  hrv: number | null
  restingHeartRate: number | null
  waterLiters: number | null
  flightsClimbed: number | null
  workouts: HealthWorkout[]
}

export interface HealthWorkout {
  activityName: string
  calories: number
  distance: number
  durationMinutes: number
  startISO: string
  endISO: string
}

export type IntensityMap = Map<string, number>

export interface SaveCardioWorkoutParams {
  startDate: Date
  endDate: Date
  durationMinutes: number
  caloriesBurned?: number
}

export interface HealthSnapshotSource {
  /** Single entry point that fetches one day's metrics in parallel internally. */
  getDailySnapshot(date: Date): Promise<DailyHealthSnapshot>
  /** Heatmap input — one bulk query, not N daily ones. */
  getRangeIntensity(daysBack: number): Promise<IntensityMap>
  /** Save a cardio workout back to the source (no-op for mock). */
  saveCardioWorkout(params: SaveCardioWorkoutParams): Promise<boolean>
  /** Idempotent. Returns true once permission is granted. Mock returns true immediately. */
  requestAuthorization(): Promise<boolean>
  /** Cheap synchronous check. Mock returns false (it's not "real"); iOS adapter returns Platform.OS === 'ios'. */
  isAvailable(): boolean
}

export interface ReadingTimer {
  running: boolean
  /** The last session stopped in this app run; never persisted. */
  last: { minutes: number; day: string } | null
  start: () => boolean
  stop: () => void
}

/** Reading timers need the iOS Live Activity extension. */
export function useReadingTimer(): ReadingTimer | null {
  return null
}

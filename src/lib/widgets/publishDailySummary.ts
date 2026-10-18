import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'

// Home Screen widgets are iOS-only; never load their native module elsewhere.
export function publishDailySummary(
  _snapshot: DailyHealthSnapshot | null,
): string | null {
  return null
}

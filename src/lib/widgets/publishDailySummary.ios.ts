import { requireOptionalNativeModule } from 'expo'

import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import { dailySummaryTimeline } from '@/lib/widgets/dailySummary'

export function publishDailySummary(
  snapshot: DailyHealthSnapshot | null,
): string | null {
  if (!requireOptionalNativeModule('ExpoWidgets')) return null

  try {
    // Old development clients must not load expo-widgets or its native views.

    const {
      default: widget,
    }: typeof import('./DailySummaryWidget') = require('./DailySummaryWidget')
    widget.updateTimeline(dailySummaryTimeline(snapshot))
    return null
  } catch {
    console.warn('[widgets] Unable to update daily rings')
    return 'Unable to update Daily rings. Reopen the app to try again.'
  }
}

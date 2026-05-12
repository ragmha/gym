import { Platform } from 'react-native'

import { iosHealthKitAdapter } from './iosAdapter'
import { deterministicMockAdapter } from './mockAdapter'
import type { HealthSnapshotSource } from './types'

function createHealthSnapshotSource(): HealthSnapshotSource {
  return Platform.OS === 'ios' ? iosHealthKitAdapter : deterministicMockAdapter
}

/** Deep Module seam: callers get one HealthSnapshotSource Interface; adapters keep platform Implementation local. */
export const healthSnapshot: HealthSnapshotSource = createHealthSnapshotSource()

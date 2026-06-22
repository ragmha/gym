import type { CoachAvailability } from './types'

export function resolveCoachAvailability(input: {
  platformOS: string
  appleFMStatus?: CoachAvailability
}): CoachAvailability {
  // Apple Foundation Models only exist on iOS. Every other platform falls back
  // to the mock engine, which can always serve, so the seam stays available.
  if (input.platformOS !== 'ios') {
    return 'available'
  }

  // On iOS the preferred engine is Apple FM, so surface its reported status.
  // When it has not been probed yet, assume available since the mock engine
  // can serve as a fallback.
  return input.appleFMStatus ?? 'available'
}

export function selectEngineId(
  platformOS: string,
  appleFMAvailable: boolean,
): 'mock' | 'apple-fm' {
  return platformOS === 'ios' && appleFMAvailable ? 'apple-fm' : 'mock'
}

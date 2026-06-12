import type { CoachAvailability } from './types'

export function resolveCoachAvailability(_input: {
  platformOS: string
  appleFMStatus?: CoachAvailability
}): CoachAvailability {
  return 'available'
}

export function selectEngineId(
  platformOS: string,
  appleFMAvailable: boolean,
): 'mock' | 'apple-fm' {
  return platformOS === 'ios' && appleFMAvailable ? 'apple-fm' : 'mock'
}

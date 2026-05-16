/**
 * Hybrid + Hyrox training pillar model.
 *
 * Maps generic HealthKit activity types onto the three hybrid-athlete pillars
 * (Strength / Run / Conditioning). Lives separately from the HealthKit adapter
 * so the adapter stays product-agnostic.
 */

export type Pillar = 'strength' | 'run' | 'conditioning'

/**
 * Normalised activity types we recognise. The HealthKit adapter maps the
 * fragile native enum onto this stable set. Anything we don't recognise becomes
 * 'other' and is excluded from pillar volume.
 */
export type NormalizedActivityType =
  | 'running'
  | 'walking'
  | 'hiking'
  | 'cycling'
  | 'rowing'
  | 'swimming'
  | 'strength'
  | 'hiit'
  | 'mixedCardio'
  | 'jumpRope'
  | 'stairClimbing'
  | 'elliptical'
  | 'crossTraining'
  | 'recovery'
  | 'multisport'
  | 'other'

/**
 * Apple HealthKit `HKWorkoutActivityType` raw values we care about.
 * Mirrors @kingstinct/react-native-healthkit `WorkoutActivityType` enum.
 * Kept as a plain object so the iOS adapter can map a raw number/string
 * without importing the native module here.
 */
const HK_ACTIVITY_MAP: Record<number, NormalizedActivityType> = {
  9: 'hiking', // climbing — close enough for hybrid bucketing
  11: 'crossTraining',
  13: 'cycling',
  16: 'elliptical',
  20: 'strength', // functionalStrengthTraining
  24: 'hiking',
  29: 'recovery', // mindAndBody
  30: 'mixedCardio', // mixedMetabolicCardioTraining (legacy)
  33: 'recovery', // preparationAndRecovery
  35: 'rowing',
  37: 'running',
  44: 'stairClimbing',
  46: 'swimming',
  49: 'running', // trackAndField — usually run training
  50: 'strength', // traditionalStrengthTraining
  52: 'walking',
  57: 'recovery', // yoga
  59: 'strength', // coreTraining — counts as strength accessory work
  62: 'recovery', // flexibility
  63: 'hiit',
  64: 'jumpRope',
  66: 'recovery', // pilates
  68: 'stairClimbing', // stairs
  69: 'stairClimbing', // stepTraining
  73: 'mixedCardio',
  82: 'multisport', // swimBikeRun
  83: 'multisport', // transition
}

/**
 * Convert a raw HealthKit activity value (number, numeric string, or the
 * kingstinct enum member string like "running") to a stable normalised type.
 */
export function classifyHealthKitActivity(
  raw: string | number | null | undefined,
): NormalizedActivityType {
  if (raw == null) return 'other'

  if (typeof raw === 'number') {
    return HK_ACTIVITY_MAP[raw] ?? 'other'
  }

  // Numeric string e.g. "37"
  if (/^\d+$/.test(raw)) {
    return HK_ACTIVITY_MAP[Number(raw)] ?? 'other'
  }

  // Word string e.g. "Running" / "running" / "swimBikeRun"
  const lower = raw.toLowerCase()
  if (lower.includes('multisport') || lower.includes('swimbikerun')) {
    return 'multisport'
  }
  if (lower === 'transition') return 'multisport'
  if (lower.includes('strength')) return 'strength'
  if (lower.includes('core')) return 'strength'
  if (lower.includes('hiit') || lower.includes('highintensity')) return 'hiit'
  if (lower.includes('mixedcardio') || lower.includes('mixedmetabolic')) {
    return 'mixedCardio'
  }
  if (lower.includes('crosstraining')) return 'crossTraining'
  if (lower.includes('jumprope')) return 'jumpRope'
  if (lower.includes('stair') || lower.includes('step')) return 'stairClimbing'
  if (lower.includes('elliptical')) return 'elliptical'
  if (lower === 'running' || lower.includes('run')) return 'running'
  if (lower === 'walking') return 'walking'
  if (lower === 'hiking') return 'hiking'
  if (lower === 'cycling' || lower.includes('cycle')) return 'cycling'
  if (lower === 'rowing' || lower.includes('row')) return 'rowing'
  if (lower === 'swimming' || lower.includes('swim')) return 'swimming'
  if (
    lower === 'yoga' ||
    lower.includes('pilates') ||
    lower.includes('mindandbody') ||
    lower.includes('flexibility') ||
    lower.includes('preparation')
  ) {
    return 'recovery'
  }
  return 'other'
}

/**
 * Map a normalised activity to a hybrid-athlete pillar.
 *
 * Returns null for anything that should NOT count toward S/R/C volume:
 * recovery, multisport (avoid double-count), other.
 *
 * Walking is excluded — too low-stimulus to count as a training session for
 * a hybrid/Hyrox athlete; we don't want a 10k-step day inflating run volume.
 */
export function activityToPillar(
  activity: NormalizedActivityType,
): Pillar | null {
  switch (activity) {
    case 'running':
    case 'hiking':
      return 'run'
    case 'strength':
      return 'strength'
    case 'cycling':
    case 'rowing':
    case 'swimming':
    case 'hiit':
    case 'mixedCardio':
    case 'jumpRope':
    case 'stairClimbing':
    case 'elliptical':
    case 'crossTraining':
      return 'conditioning'
    case 'walking':
    case 'recovery':
    case 'multisport':
    case 'other':
      return null
  }
}

/**
 * Display metadata per pillar. Used by the dashboard components.
 */
export const PILLAR_META: Record<
  Pillar,
  { label: string; ioniconName: string; accent: string }
> = {
  strength: { label: 'Strength', ioniconName: 'barbell', accent: '#A78BFA' },
  run: { label: 'Run', ioniconName: 'walk', accent: '#C8FF00' },
  conditioning: {
    label: 'Conditioning',
    ioniconName: 'flash',
    accent: '#F97316',
  },
}

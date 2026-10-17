import {
  BODY_MASS_MIN_NATIVE_VERSION,
  type BodyMassAvailability,
} from '@/lib/healthSnapshot/bodyMass'
import { getHealthKitWriteNativeSupport } from '@/lib/healthSnapshot/healthKitWriteNativeSupport'

export function getBodyMassNativeSupport(): BodyMassAvailability {
  return getHealthKitWriteNativeSupport(
    BODY_MASS_MIN_NATIVE_VERSION,
    'Add weight',
  )
}

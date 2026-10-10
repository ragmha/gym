import { requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'

import {
  bodyMassUnavailable,
  supportsBodyMassNativeVersion,
  type BodyMassAvailability,
} from '@/lib/healthSnapshot/bodyMass'

export function getBodyMassNativeSupport(): BodyMassAvailability {
  if (Platform.OS !== 'ios') return bodyMassUnavailable('platform')
  try {
    if (!requireOptionalNativeModule('ExpoApplication')) {
      return bodyMassUnavailable('build-required')
    }
    // Old clients may not contain ExpoApplication. Never use the OTA config version.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const application: typeof import('expo-application') = require('expo-application')
    if (!supportsBodyMassNativeVersion(application.nativeApplicationVersion)) {
      return bodyMassUnavailable('build-required')
    }
    return { available: true }
  } catch {
    return bodyMassUnavailable('build-required')
  }
}

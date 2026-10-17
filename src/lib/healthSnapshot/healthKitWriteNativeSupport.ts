import { requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'

import { supportsNativeApplicationVersion } from '@/lib/healthSnapshot/nativeApplicationVersion'

export type HealthKitWriteAvailability =
  | { available: true }
  | {
      available: false
      reason: 'platform' | 'build-required' | 'unavailable'
      message: string
    }

export function getHealthKitWriteNativeSupport(
  minimumVersion: string,
  feature: string,
): HealthKitWriteAvailability {
  if (Platform.OS !== 'ios') {
    return {
      available: false,
      reason: 'platform',
      message: `${feature} is available only in a compatible iOS app.`,
    }
  }
  try {
    if (!requireOptionalNativeModule('ExpoApplication')) {
      return {
        available: false,
        reason: 'build-required',
        message: `A new iOS build is required to ${feature.toLowerCase()}. Install version ${minimumVersion} or later.`,
      }
    }
    // Old clients may not contain ExpoApplication. Never use the OTA config version.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const application: typeof import('expo-application') = require('expo-application')
    if (
      !supportsNativeApplicationVersion(
        application.nativeApplicationVersion,
        minimumVersion,
      )
    ) {
      return {
        available: false,
        reason: 'build-required',
        message: `A new iOS build is required to ${feature.toLowerCase()}. Install version ${minimumVersion} or later.`,
      }
    }
    return { available: true }
  } catch {
    return {
      available: false,
      reason: 'build-required',
      message: `A new iOS build is required to ${feature.toLowerCase()}. Install version ${minimumVersion} or later.`,
    }
  }
}

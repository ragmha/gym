import { requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'

type DeepWorkActivity = typeof import('@/lib/deepWorkActivity')

export function loadDeepWorkActivity(): DeepWorkActivity | null {
  // Builds before 1.0.13 lack the widget extension; never load it there.
  if (!requireOptionalNativeModule('ExpoWidgets')) return null
  // Live Activities start only on iOS 16.2 and later.
  if (Number.parseFloat(String(Platform.Version)) < 16.2) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@/lib/deepWorkActivity') as DeepWorkActivity
  } catch {
    return null
  }
}

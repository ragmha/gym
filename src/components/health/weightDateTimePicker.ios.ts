import type { IOSNativeProps } from '@react-native-community/datetimepicker'
import type { ComponentType } from 'react'
import { UIManager } from 'react-native'

import { getBodyMassNativeSupport } from '@/lib/healthSnapshot/bodyMassNativeSupport'

export function loadWeightDateTimePicker(): ComponentType<IOSNativeProps> | null {
  if (!getBodyMassNativeSupport().available) return null
  try {
    if (!UIManager.hasViewManagerConfig('RNDateTimePicker')) return null
    // This module must never evaluate in an old dev client or on web/Android.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const picker: typeof import('@react-native-community/datetimepicker') = require('@react-native-community/datetimepicker')
    return picker.default
  } catch {
    return null
  }
}

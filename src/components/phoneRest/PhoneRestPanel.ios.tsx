import { requireNativeView, requireOptionalNativeModule } from 'expo'
import type { ViewProps } from 'react-native'

import type { PhoneRestPanelProps } from '@/components/phoneRest/PhoneRestPanel.types'
import { PhoneRestUnavailable } from '@/components/phoneRest/PhoneRestUnavailable'

const NativePanel = requireOptionalNativeModule<object>('PhoneRest')
  ? requireNativeView<PhoneRestPanelProps & ViewProps>('PhoneRest')
  : null

export default function PhoneRestPanel(props: PhoneRestPanelProps) {
  if (!NativePanel) {
    return (
      <PhoneRestUnavailable message="This installed app does not include Phone rest. A JavaScript update cannot add the native capability; use a binary that includes the Phone rest module." />
    )
  }

  return <NativePanel {...props} style={{ flex: 1 }} />
}

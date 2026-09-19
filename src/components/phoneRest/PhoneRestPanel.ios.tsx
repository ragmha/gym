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
      <PhoneRestUnavailable message="This installed app does not include Phone rest. Install a new development build; a JavaScript refresh cannot add the native capability." />
    )
  }

  return <NativePanel {...props} style={{ flex: 1 }} />
}

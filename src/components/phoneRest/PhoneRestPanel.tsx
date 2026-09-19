import type { PhoneRestPanelProps } from '@/components/phoneRest/PhoneRestPanel.types'
import { PhoneRestUnavailable } from '@/components/phoneRest/PhoneRestUnavailable'

export default function PhoneRestPanel(_props: PhoneRestPanelProps) {
  return (
    <PhoneRestUnavailable message="Phone rest requires a physical iPhone with Screen Time access." />
  )
}

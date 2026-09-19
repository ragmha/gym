import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import PhoneRestPanel from '@/components/phoneRest/PhoneRestPanel'
import { useColorScheme } from '@/hooks/useColorScheme'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'

export default function PhoneRestScreen() {
  const colorScheme = useColorScheme()
  return (
    <HealthDateRoute>
      {(date) => (
        <PhoneRestPanel
          dateKey={localDateKey(date)}
          colorScheme={colorScheme}
        />
      )}
    </HealthDateRoute>
  )
}

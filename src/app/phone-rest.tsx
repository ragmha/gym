import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import PhoneRestPanel from '@/components/phoneRest/PhoneRestPanel'
import { useColorScheme } from '@/hooks/useColorScheme'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import { StatusBar } from 'expo-status-bar'

export default function PhoneRestScreen() {
  const colorScheme = useColorScheme()
  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <HealthDateRoute>
        {(date) => (
          <PhoneRestPanel
            dateKey={localDateKey(date)}
            colorScheme={colorScheme}
          />
        )}
      </HealthDateRoute>
    </>
  )
}

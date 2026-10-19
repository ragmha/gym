import { LiftingForDate } from '@/app/gym/lifting/workout'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'

export default function FiveByFiveScreen() {
  return (
    <HealthDateRoute>
      {(date) => <LiftingForDate date={date} quick />}
    </HealthDateRoute>
  )
}

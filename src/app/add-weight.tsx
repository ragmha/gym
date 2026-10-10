import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import {
  WeightEntry,
  WeightEntryUnavailable,
} from '@/components/health/WeightEntry'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'

export default function AddWeightScreen() {
  return (
    <HealthDateRoute>
      {(date) =>
        localDateKey(date) > localDateKey(new Date()) ? (
          <WeightEntryUnavailable message="A measurement cannot be in the future. Return to Home and choose today or an earlier day." />
        ) : (
          <WeightEntry key={localDateKey(date)} selectedDay={date} />
        )
      }
    </HealthDateRoute>
  )
}

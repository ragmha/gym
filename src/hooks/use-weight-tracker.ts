import { useEffect, useState } from 'react'

import AsyncStorage from '@react-native-async-storage/async-storage'
import { DateTime } from 'luxon'
import * as z from 'zod'

const dateSchema = z.custom<string>((value) => {
  const date = new Date(value as string)
  const dateTime = DateTime.fromJSDate(date)
  return dateTime.isValid ? dateTime.toFormat('yyyy-MM-dd') : null
})

export const weightEntrySchema = z.object({
  weight: z.number().positive(),
  date: dateSchema,
})
export type WeightEntry = z.infer<typeof weightEntrySchema>

type WeightTracker = {
  weight?: number
  setWeight: (weight: number) => void
  date: string
  setDate: (date: string) => void
  weightData: WeightEntry[]
  addWeightEntry: () => void
}

export const useWeightTracker = (): WeightTracker => {
  const [weight, setWeight] = useState<number>()
  const [date, setDate] = useState<string>(
    DateTime.now().toFormat('yyyy-MM-dd'),
  )
  const [weightData, setWeightData] = useState<WeightEntry[]>([])

  useEffect(() => {
    async function loadWeightData() {
      const data = await AsyncStorage.getItem('weight-data')

      if (data) {
        const parsedData = JSON.parse(data) as WeightEntry[]

        const filteredData = parsedData.filter(
          (entry) => weightEntrySchema.safeParse(entry).success,
        )

        setWeightData(filteredData)
      }
    }

    loadWeightData()
  }, [])

  const addWeightEntry = () => {
    if (weight) {
      const newEntry: WeightEntry = {
        weight: weight,
        date: DateTime.now().toFormat('yyyy-MM-dd'),
      }

      setWeightData([...weightData, newEntry])
      setWeight(undefined)
    }
  }

  return {
    weight,
    setWeight,
    date,
    setDate,
    weightData,
    addWeightEntry,
  }
}

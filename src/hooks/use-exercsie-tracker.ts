import { useEffect, useState } from 'react'

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as z from 'zod'

import exerciseData from '@/data/exercises.json'

const exerciseSchema = z.array(
  z.object({
    dayNumber: z.number().positive(),
    cardio: z.object({
      morning: z.string(),
      evening: z.string(),
    }),
    dayTitle: z.string(),
    contentArray: z.record(
      z
        .object({
          title: z.string(),
          action: z.string(),
        })
        .or(
          z.record(
            z.object({
              title: z.string(),
              action: z.string(),
            }),
          ),
        )
        .or(z.object({}))
        .or(z.undefined()),
    ),
  }),
)

type Exercises = z.infer<typeof exerciseSchema>

const STORAGE_KEY = 'exercise-data'

export const useExerciseTracker = () => {
  const [exercises, setExercises] = useState<Exercises | null>(null)

  useEffect(() => {
    const loadExerciseData = async () => {
      try {
        const storedData = await AsyncStorage.getItem(STORAGE_KEY)
        if (storedData) {
          const parsedData = exerciseSchema.parse(JSON.parse(storedData))
          setExercises(parsedData)
        } else {
          setExercises(exerciseSchema.parse(exerciseData))
        }
      } catch (error) {
        console.error(`Failed to load exercises from Async Storage: ${error}`)
      }
    }

    loadExerciseData()
  }, [])

  useEffect(() => {
    const saveExerciseData = async () => {
      try {
        if (exerciseData) {
          const serializedData = JSON.stringify(exerciseData)
          await AsyncStorage.setItem(STORAGE_KEY, serializedData)
        }
      } catch (error) {
        console.error(`Failed to save exercises to Async Storage: ${error}`)
      }
    }

    saveExerciseData()
  }, [])

  return { exercises, setExercises }
}

import { useEffect, useState } from 'react'

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as z from 'zod'

import exerciseData from '@/data/exercises.json'

const exerciseSchema = z.object({
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
})

const exercisesSchema = z.array(exerciseSchema)

export type Exercise = z.infer<typeof exerciseSchema>

export type Exercises = z.infer<typeof exercisesSchema>

type ToggleExercise = { [key: number]: boolean }

const STORAGE_KEY = 'exercise-data'

export const useExerciseTracker = () => {
  const [exercises, setExercises] = useState<Exercises | null>(null)
  const [toggleExercise, setToggleExercise] = useState<
    ToggleExercise | undefined
  >(undefined)

  useEffect(() => {
    const loadExerciseData = async () => {
      try {
        const storedData = await AsyncStorage.getItem(STORAGE_KEY)
        if (storedData) {
          const { exerciseData, checkboxState } = JSON.parse(storedData)
          const parsedExercises = exercisesSchema.parse(exerciseData)
          setExercises(parsedExercises)
          setToggleExercise(checkboxState)
        } else {
          setExercises(exercisesSchema.parse(exerciseData))
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
        if (exercises) {
          const dataToSave = {
            exerciseData: exercises,
            checkboxState: toggleExercise,
          }
          const serializedData = JSON.stringify(dataToSave)
          await AsyncStorage.setItem(STORAGE_KEY, serializedData)
        }
      } catch (error) {
        console.error(`Failed to save exercises to Async Storage: ${error}`)
      }
    }

    saveExerciseData()
  }, [exercises, toggleExercise])

  const updateToggleExercise = (dayNumber: number, checked: boolean) => {
    setToggleExercise((prevToggleExercise) => ({
      ...prevToggleExercise,
      [dayNumber]: checked,
    }))
  }

  return {
    exercises,
    setExercises,
    updateToggleExercise,
    setToggleExercise,
    toggleExercise,
  }
}

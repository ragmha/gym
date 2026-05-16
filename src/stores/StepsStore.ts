import { create } from 'zustand'

interface StepsState {
  steps: number
  stepsGoal: number
  setSteps: (steps: number) => void
  setStepsGoal: (goal: number) => void
}

export const useStepsStoreBase = create<StepsState>((set) => ({
  steps: 0,
  stepsGoal: 10_000,
  setSteps: (steps) => set({ steps: Math.max(0, Math.round(steps)) }),
  setStepsGoal: (goal) => set({ stepsGoal: Math.max(1, Math.round(goal)) }),
}))

export const useStepsStore = useStepsStoreBase

import { Stack } from 'expo-router'

// Direct workout links still return to the programme overview.
export const unstable_settings = { anchor: 'index' }

export default function LiftingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}

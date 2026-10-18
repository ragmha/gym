import { Stack } from 'expo-router'

// Deep-linked gym screens keep the hub below them so Back works.
export const unstable_settings = { anchor: 'index' }

export default function GymLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}

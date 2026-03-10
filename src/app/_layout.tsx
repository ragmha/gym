import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import 'react-native-reanimated'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useExerciseStore } from '@/stores/ExerciseStore'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  const { initialize } = useExerciseStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync()
    }
  }, [loaded])

  if (!loaded) {
    return null
  }

  const navTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme

  return (
    <ThemeProvider value={navTheme}>
      <ErrorBoundary>
        <Stack
          screenOptions={{
            navigationBarColor: navTheme.colors.background,
          }}
        >
          <Stack.Screen
            name="(tabs)"
            options={{ headerShown: false, title: '' }}
          />
          <Stack.Screen
            name="weight"
            options={{
              headerShown: false,
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="steps"
            options={{
              headerShown: false,
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="details/[id]"
            options={{
              headerBackTitle: ' ',
              headerBackTitleVisible: false,
            }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ErrorBoundary>
    </ThemeProvider>
  )
}

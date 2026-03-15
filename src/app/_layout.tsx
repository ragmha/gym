import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useMemo, useRef } from 'react'
import { Alert, AppState } from 'react-native'
import 'react-native-reanimated'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Colors } from '@/constants/Colors'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useExerciseStoreBase } from '@/stores/ExerciseStore'

// Show JS errors as alerts in Release mode (no red screen)
if (!__DEV__) {
  const originalHandler = ErrorUtils.getGlobalHandler()
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    Alert.alert(
      isFatal ? 'Fatal Error' : 'Error',
      String(error?.message || error),
    )
    originalHandler?.(error, isFatal)
  })
}

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync()
    }
  }, [loaded])

  // Auto-sync unsynced exercise data when app returns to foreground
  const appState = useRef(AppState.currentState)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        useExerciseStoreBase.getState().sync()
      }
      appState.current = nextState
    })
    return () => subscription.remove()
  }, [])

  const navTheme = useMemo(() => {
    const navBaseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme
    const theme = Colors[colorScheme]

    return {
      ...navBaseTheme,
      colors: {
        ...navBaseTheme.colors,
        primary: theme.accent,
        background: theme.background,
        card: theme.cardBackground,
        text: theme.text,
        border: theme.border,
        notification: theme.warning,
      },
    }
  }, [colorScheme])

  if (!loaded) {
    return null
  }

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
            name="hydration"
            options={{
              headerShown: false,
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="details/[id]"
            options={{
              headerBackTitle: ' ',
            }}
          />
          <Stack.Screen
            name="exercise-edit"
            options={{
              headerShown: false,
              presentation: 'modal',
            }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ErrorBoundary>
    </ThemeProvider>
  )
}

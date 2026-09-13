// Global mocks for React Native modules that aren't available in the test environment
import React from 'react'

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), back: jest.fn() })),
  useFocusEffect: jest.fn(),
  useLocalSearchParams: jest.fn(() => ({})),
  useNavigation: jest.fn(() => ({ setOptions: jest.fn() })),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: {
    Screen: () => null,
  },
  Tabs: {
    Screen: () => null,
  },
}))

// Mock expo-splash-screen
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}))

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}))

// Mock expo-font
jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true]),
  isLoaded: jest.fn(() => true),
}))

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const View = require('react-native').View
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (component: any) => component,
    },
    useSharedValue: jest.fn((init: any) => ({ value: init })),
    useAnimatedStyle: jest.fn(() => ({})),
    useAnimatedProps: jest.fn(() => ({})),
    useAnimatedReaction: jest.fn(),
    runOnJS: jest.fn((fn: any) => fn),
    withTiming: jest.fn((val: any) => val),
    withRepeat: jest.fn((val: any) => val),
    withSequence: jest.fn((...args: any[]) => args[0]),
    SlideInDown: {},
    createAnimatedComponent: (component: any) => component,
  }
})

// Mock react-native-worklets
jest.mock('react-native-worklets', () => ({
  scheduleOnRN: jest.fn((fn: any, ...args: any[]) => fn(...args)),
}))

// Mock useThemeColor
jest.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: jest.fn((_props: any, colorName: string) => {
    const colors: Record<string, string> = {
      text: '#000000',
      background: '#FFFFFF',
      cardBackground: '#F5F5F5',
      tint: '#0a7ea4',
      icon: '#687076',
      tabIconDefault: '#687076',
      tabIconSelected: '#0a7ea4',
      shadow: '#000000',
      selectedCircle: '#007700',
    }
    return colors[colorName] || '#CCCCCC'
  }),
}))

// Mock useColorScheme
jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}))

// Silence console warnings in tests
const originalWarn = console.warn
console.warn = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Reanimated') ||
      args[0].includes('shadow') ||
      args[0].includes('Animated'))
  ) {
    return
  }
  originalWarn(...args)
}

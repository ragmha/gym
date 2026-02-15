// Global mocks for React Native modules that aren't available in the test environment

// Mock expo-router
import React from 'react'

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), back: jest.fn() })),
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

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}))

// Mock react-native-webview
jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
  default: 'WebView',
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
    withTiming: jest.fn((val: any) => val),
    withRepeat: jest.fn((val: any) => val),
    withSequence: jest.fn((...args: any[]) => args[0]),
    SlideInDown: {},
    createAnimatedComponent: (component: any) => component,
  }
})

// Mock react-native-circular-progress-indicator
jest.mock('react-native-circular-progress-indicator', () => 'CircularProgress')

// Mock react-native-tab-view
jest.mock('react-native-tab-view', () => ({
  TabView: ({ renderScene, navigationState }: any) => {
    const scene = renderScene({
      route: navigationState.routes[navigationState.index],
    })
    return scene
  },
  TabBar: () => null,
  SceneMap: (scenes: Record<string, any>) => {
    return ({ route }: { route: { key: string } }) => {
      const Scene = scenes[route.key]
      return Scene ? Scene() : null
    }
  },
}))

// Mock @legendapp/state/react
jest.mock('@legendapp/state/react', () => ({
  observer: (component: any) => component,
}))

// Mock @legendapp/state/config/enableReactTracking
jest.mock('@legendapp/state/config/enableReactTracking', () => ({
  enableReactTracking: jest.fn(),
}))

// Mock @legendapp/state/persist
jest.mock('@legendapp/state/persist', () => ({
  persistObservable: jest.fn(),
}))

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(() => ({
          unsubscribe: jest.fn(),
        })),
      })),
    })),
  },
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

// Mock ExerciseStore
jest.mock('@/stores/ExerciseStore', () => {
  const mockExercises: Record<string, any> = {
    'exercise-1': {
      id: '1',
      localId: 'exercise-1',
      title: 'Push Day',
      videoURL: 'https://example.com/video',
      date: '2026-02-15',
      color: 'hsl(200, 50%, 87.5%)',
      completed: false,
      cardio: { morning: 30, evening: 20 },
      exercises: [
        {
          id: '1',
          title: 'Bench Press',
          sets: 4,
          reps: 12,
          variation: null,
          completed: false,
          selectedSets: [false, false, false, false],
        },
      ],
      synced: true,
    },
    'exercise-2': {
      id: '2',
      localId: 'exercise-2',
      title: 'Pull Day',
      videoURL: 'https://example.com/video2',
      date: '2026-02-16',
      color: 'hsl(100, 50%, 87.5%)',
      completed: true,
      cardio: { morning: 25, evening: 15 },
      exercises: [
        {
          id: '4',
          title: 'Deadlifts',
          sets: 4,
          reps: 8,
          variation: null,
          completed: true,
          selectedSets: [true, true, true, true],
        },
      ],
      synced: true,
    },
  }

  const { observable } = jest.requireActual('@legendapp/state')
  const state$ = observable({
    exercises: mockExercises,
    error: null,
    loading: false,
    initialized: true,
  })

  return {
    state$,
    useExerciseStore: jest.fn(() => ({
      exercises: mockExercises,
      error: null,
      loading: false,
      initialized: true,
      completedCount: 1,
      activeExercises: [mockExercises['exercise-1']],
      completedExercises: [mockExercises['exercise-2']],
      initialize: jest.fn(),
      completeExercise: jest.fn(),
      completeExerciseDetail: jest.fn(),
      getSelectedSets: jest.fn(() => []),
      getExercise: jest.fn((id: string) => mockExercises[id]),
      getDetail: jest.fn(() => []),
      sync: jest.fn(),
    })),
    computed$: {
      completedCount: () => 1,
      activeExercises: () => [mockExercises['exercise-1']],
      completedExercises: () => [mockExercises['exercise-2']],
    },
    actions: {
      initialize: jest.fn(),
      completeExercise: jest.fn(),
      completeExerciseDetail: jest.fn(),
      getSelectedSets: jest.fn(() => []),
      getExercise: jest.fn(),
      getDetail: jest.fn(() => []),
      sync: jest.fn(),
    },
  }
})

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

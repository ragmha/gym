import type { RootStackPramList } from './types'

import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'

import MainTabNavigator from './MainTabNavigator'

import { useCurrentTheme } from '@/hooks/use-current-theme'

const Stack = createStackNavigator<RootStackPramList>()

const RootNavigator: React.FC = () => {
  const theme = useCurrentTheme()

  return (
    <NavigationContainer
      theme={{
        colors: {
          primary: theme.colors.secondary,
          background: theme.colors.surface,
          card: theme.colors.surface,
          text: theme.colors.onSurface,
          border: theme.colors.background,
          notification: theme.colors.error,
        },
        dark: true,
      }}
    >
      <Stack.Navigator>
        <Stack.Screen
          name="MainTabNavigator"
          component={MainTabNavigator}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default RootNavigator

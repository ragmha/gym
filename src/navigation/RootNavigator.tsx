import type { RootStackPramList } from './types'

import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'

import MainTabNavigator from './MainTabNavigator'

const Stack = createStackNavigator<RootStackPramList>()

const RootNavigator: React.FC = () => (
  <NavigationContainer
    theme={{
      colors: {
        primary: 'rgb(255, 45, 85)',
        background: '#333333',
        card: '#333333',
        text: '#FFFFFF',
        border: '#000000',
        notification: 'rgb(255, 69, 58)',
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

export default RootNavigator

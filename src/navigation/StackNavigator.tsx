import type { StackParamList } from './types'

import { createStackNavigator } from '@react-navigation/stack'

import { HomeScreen } from '../screens/HomeScreen'

const Stack = createStackNavigator<StackParamList>()

const StackNavigator: React.FC = () => (
  <Stack.Navigator>
    <Stack.Screen name="Home" component={HomeScreen} />
  </Stack.Navigator>
)

export default StackNavigator

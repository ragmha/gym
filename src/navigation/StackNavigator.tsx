import type { StackParamList } from './types'

import { createStackNavigator } from '@react-navigation/stack'

import { DashboardScreen } from '../screens/DashboardScreen'

const Stack = createStackNavigator<StackParamList>()

const StackNavigator: React.FC = () => (
  <Stack.Navigator>
    <Stack.Screen name="Home" component={DashboardScreen} />
  </Stack.Navigator>
)

export default StackNavigator

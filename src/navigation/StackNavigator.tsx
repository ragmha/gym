import type { StackParamList } from './types'

import { createStackNavigator } from '@react-navigation/stack'

import { DashboardScreen } from '@/screens/DashboardScreen'
import { ExercisesScreen } from '@/screens/ExercisesScreen'

const Stack = createStackNavigator<StackParamList>()

const StackNavigator: React.FC = () => (
  <Stack.Navigator>
    <Stack.Screen name="Home" component={DashboardScreen} />
    <Stack.Screen name="Exercises" component={ExercisesScreen} />
  </Stack.Navigator>
)

export default StackNavigator

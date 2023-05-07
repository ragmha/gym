import type { MainTabParamList } from './types'

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import { DashboardScreen } from '../screens/DashboardScreen'

import { ExercisesScreen } from '@/screens/ExercisesScreen'

const Tab = createBottomTabNavigator<MainTabParamList>()

const MainTabNavigator: React.FC = () => (
  <Tab.Navigator>
    <Tab.Screen name="Home" component={DashboardScreen} />
    <Tab.Screen name="Exercises" component={ExercisesScreen} />
  </Tab.Navigator>
)

export default MainTabNavigator

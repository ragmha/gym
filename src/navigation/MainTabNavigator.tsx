import type { MainTabParamList } from './types'

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import { DashboardScreen } from '../screens/DashboardScreen'

const Tab = createBottomTabNavigator<MainTabParamList>()

const MainTabNavigator: React.FC = () => (
  <Tab.Navigator>
    <Tab.Screen name="Home" component={DashboardScreen} />
  </Tab.Navigator>
)

export default MainTabNavigator

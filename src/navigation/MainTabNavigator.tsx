import type { MainTabParamList } from './types'

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import { HomeScreen } from '../screens/HomeScreen'

const Tab = createBottomTabNavigator<MainTabParamList>()

const MainTabNavigator: React.FC = () => (
  <Tab.Navigator>
    <Tab.Screen name="Home" component={HomeScreen} />
  </Tab.Navigator>
)

export default MainTabNavigator

import type { MainTabParamList } from './types'

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import { HomeScreen } from '../screens/HomeScreen'

import { SettingsScreen } from '@/screens/SettingsScreen'

const Tab = createBottomTabNavigator<MainTabParamList>()

const MainTabNavigator: React.FC = () => (
  <Tab.Navigator>
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
)

export default MainTabNavigator

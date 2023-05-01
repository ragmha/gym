import type { MainTabParamList } from '@/navigation/types'

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5'

import { HomeScreen } from '../screens/HomeScreen'

import { SettingsScreen } from '@/screens/SettingsScreen'

const Tab = createBottomTabNavigator<MainTabParamList>()

const MainTabNavigator: React.FC = () => (
  <Tab.Navigator>
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen
      name="Settings"
      component={SettingsScreen}
      options={{
        tabBarIcon: ({ color }) => (
          <FontAwesome5 name="comments" color={color} size={20} />
        ),
      }}
    />
  </Tab.Navigator>
)

export default MainTabNavigator

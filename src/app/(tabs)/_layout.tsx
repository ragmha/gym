import { Tabs } from 'expo-router'
import React from 'react'
import { Platform } from 'react-native'

import { TabBarIcon } from '@/components/navigation/TabBarIcon'
import { Colors } from '@/constants/Colors'
import { Elevation, Radii } from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'

export default function TabLayout() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme]

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: Platform.OS === 'ios' ? 20 : 14,
          backgroundColor: theme.tabBarFloating,
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          height: 74,
          paddingBottom: 10,
          paddingTop: 10,
          borderRadius: Radii.xl,
          ...Elevation.floating,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarShowLabel: false,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'home' : 'home-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'barbell' : 'barbell-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'settings' : 'settings-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  )
}

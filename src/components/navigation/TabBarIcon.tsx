import Ionicons from '@expo/vector-icons/Ionicons'
import { type IconProps } from '@expo/vector-icons/build/createIconSet'
import { type ComponentProps } from 'react'
import { StyleSheet, View } from 'react-native'

import { Colors } from '@/constants/Colors'
import { useColorScheme } from '@/hooks/useColorScheme'

export function TabBarIcon({
  style,
  color,
  focused,
  ...rest
}: IconProps<ComponentProps<typeof Ionicons>['name']> & { focused?: boolean }) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme]

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.iconWrap,
          focused && { backgroundColor: theme.cardSurface },
        ]}
      >
        <Ionicons
          size={20}
          color={color}
          style={[styles.icon, style]}
          {...rest}
        />
      </View>
      <View
        style={[
          styles.indicator,
          { backgroundColor: focused ? theme.accent : 'transparent' },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: 0,
  },
  indicator: {
    width: 12,
    height: 3,
    borderRadius: 999,
  },
})

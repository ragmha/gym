import { useThemeColor } from '@/hooks/useThemeColor'
import React, { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

export default function Header({ children }: { children: ReactNode }) {
  const backgroundColor = useThemeColor({}, 'background')
  const textColor = useThemeColor({}, 'text')

  return (
    <View style={[styles.headerContainer, { backgroundColor }]}>
      <Text style={[styles.headerTitle, { color: textColor }]}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
})

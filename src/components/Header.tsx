import Ionicons from '@expo/vector-icons/Ionicons'
import React, { type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useThemeColor } from '@/hooks/useThemeColor'

interface HeaderProps {
  date?: Date
  /** When provided, renders a simple centered title instead of the date layout. */
  children?: ReactNode
}

export default function Header({ date = new Date(), children }: HeaderProps) {
  const textColor = useThemeColor({}, 'text')
  const subtitleColor = useThemeColor({}, 'subtitleText')
  const borderColor = useThemeColor({}, 'border')
  const accentColor = useThemeColor({}, 'accent')

  if (children) {
    return (
      <View style={styles.simpleContainer}>
        <Text style={[styles.simpleTitle, { color: textColor }]}>
          {children}
        </Text>
      </View>
    )
  }

  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
  })

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={[styles.calendarIcon, { borderColor }]}>
          <Ionicons name="calendar-outline" size={22} color={subtitleColor} />
        </View>
        <View>
          <Text style={[styles.dayName, { color: subtitleColor }]}>
            {dayName}
          </Text>
          <Text style={[styles.dateText, { color: textColor }]}>{dateStr}</Text>
        </View>
      </View>
      <View style={[styles.avatar, { borderColor: accentColor }]}>
        <Ionicons name="person" size={24} color={accentColor} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calendarIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayName: {
    fontSize: 13,
    fontWeight: '400',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  simpleContainer: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
})

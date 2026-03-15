import Ionicons from '@expo/vector-icons/Ionicons'
import React, { type ReactNode } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { useTheme } from '@/hooks/useThemeColor'

interface HeaderProps {
  date?: Date
  /** When provided, renders a simple centered title instead of the date layout. */
  children?: ReactNode
  /** Callback when the calendar icon / date area is tapped. */
  onCalendarPress?: () => void
}

export default function Header({
  date = new Date(),
  children,
  onCalendarPress,
}: HeaderProps) {
  const {
    text: textColor,
    subtitleText: subtitleColor,
    border: borderColor,
    accent: accentColor,
  } = useTheme()

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

  const leftContent = (
    <>
      <View style={[styles.calendarIcon, { borderColor }]}>
        <Ionicons name="calendar-outline" size={22} color={subtitleColor} />
      </View>
      <View>
        <Text style={[styles.dayName, { color: subtitleColor }]}>
          {dayName}
        </Text>
        <Text style={[styles.dateText, { color: textColor }]}>{dateStr}</Text>
      </View>
    </>
  )

  return (
    <View style={styles.container}>
      {onCalendarPress ? (
        <TouchableOpacity
          style={styles.left}
          onPress={onCalendarPress}
          activeOpacity={0.7}
        >
          {leftContent}
        </TouchableOpacity>
      ) : (
        <View style={styles.left}>{leftContent}</View>
      )}
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

import { useThemeColor } from '@/hooks/useThemeColor'
import React, { useCallback, useRef, useState } from 'react'
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'

interface CalendarStripProps {
  startDate?: Date
  onDateSelected?: (date: Date) => void
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function getDaysAround(center: Date, count: number): Date[] {
  const half = Math.floor(count / 2)
  const days: Date[] = []
  for (let i = -half; i <= half; i++) {
    const d = new Date(center)
    d.setDate(center.getDate() + i)
    days.push(d)
  }
  return days
}

const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarStrip({
  startDate = new Date(),
  onDateSelected,
}: CalendarStripProps) {
  const { width } = useWindowDimensions()
  const [selectedDate, setSelectedDate] = useState<Date>(startDate)
  const flatListRef = useRef<FlatList>(null)

  const textColor = useThemeColor({}, 'text')
  const subtitleColor = useThemeColor({}, 'subtitleText')
  const accentColor = useThemeColor({}, 'accent')

  const days = getDaysAround(startDate, 15)
  const ITEM_WIDTH = Math.floor((width - 40) / 5) // show ~5 items

  const handlePress = useCallback(
    (date: Date) => {
      setSelectedDate(date)
      onDateSelected?.(date)
    },
    [onDateSelected],
  )

  const renderItem = useCallback(
    ({ item }: { item: Date }) => {
      const isSelected = isSameDay(item, selectedDate)
      const isToday = isSameDay(item, new Date())

      return (
        <TouchableOpacity
          style={[
            styles.dayPill,
            { width: ITEM_WIDTH - 8 },
            isSelected && { backgroundColor: accentColor },
          ]}
          onPress={() => handlePress(item)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.dateNumber,
              { color: isSelected ? '#FFFFFF' : textColor },
            ]}
          >
            {item.getDate()}
          </Text>
          <Text
            style={[
              styles.dayAbbrev,
              {
                color: isSelected ? 'rgba(255,255,255,0.8)' : subtitleColor,
              },
            ]}
          >
            {DAY_ABBREVS[item.getDay()]}
          </Text>
          {isToday && !isSelected && (
            <View style={[styles.todayDot, { backgroundColor: accentColor }]} />
          )}
        </TouchableOpacity>
      )
    },
    [
      selectedDate,
      accentColor,
      textColor,
      subtitleColor,
      handlePress,
      ITEM_WIDTH,
    ],
  )

  const keyExtractor = useCallback((item: Date) => item.toISOString(), [])

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={days}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        initialScrollIndex={Math.floor(days.length / 2) - 2}
        getItemLayout={(_, index) => ({
          length: ITEM_WIDTH,
          offset: ITEM_WIDTH * index,
          index,
        })}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dayPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
  },
  dateNumber: {
    fontSize: 22,
    fontWeight: '700',
  },
  dayAbbrev: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 4,
  },
})

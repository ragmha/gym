import { useThemeColor } from '@/hooks/useThemeColor'
import Ionicons from '@expo/vector-icons/Ionicons'
import React, { useCallback, useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface CalendarStripProps {
  /** The date around which to generate the calendar strip. */
  focusDate?: Date
  /** Called when the user taps a day. */
  onDateSelected?: (date: Date) => void
  /** Called when month navigation changes the focus. */
  onFocusDateChange?: (date: Date) => void
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Returns the Monday of the week containing `date`. */
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sun, 1 = Mon, …
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

/** Build exactly one Mon–Sun week from the week containing `center`. */
function getWeek(center: Date): Date[] {
  const monday = getMonday(center)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function CalendarStrip({
  focusDate,
  onDateSelected,
  onFocusDateChange,
}: CalendarStripProps) {
  const today = useMemo(() => new Date(), [])
  const center = focusDate ?? today
  const [selectedDate, setSelectedDate] = useState<Date>(center)

  const textColor = useThemeColor({}, 'text')
  const subtitleColor = useThemeColor({}, 'subtitleText')
  const accentColor = useThemeColor({}, 'accent')
  const cardBg = useThemeColor({}, 'cardBackground')
  const borderColor = useThemeColor({}, 'border')

  const days = useMemo(() => getWeek(center), [center])

  const navigateWeek = useCallback(
    (direction: -1 | 1) => {
      const next = new Date(center)
      next.setDate(next.getDate() + direction * 7)
      onFocusDateChange?.(next)
    },
    [center, onFocusDateChange],
  )

  const handlePress = useCallback(
    (date: Date) => {
      setSelectedDate(date)
      onDateSelected?.(date)
    },
    [onDateSelected],
  )

  const monthLabel = `${MONTH_NAMES[center.getMonth()]} ${center.getFullYear()}`

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor }]}>
      {/* Month nav header */}
      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={() => navigateWeek(-1)}
          hitSlop={12}
          style={styles.navButton}
        >
          <Ionicons name="chevron-back" size={18} color={subtitleColor} />
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: textColor }]}>
          {monthLabel}
        </Text>
        <TouchableOpacity
          onPress={() => navigateWeek(1)}
          hitSlop={12}
          style={styles.navButton}
        >
          <Ionicons name="chevron-forward" size={18} color={subtitleColor} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week header */}
      <View style={styles.dayLetterRow}>
        {DAY_LETTERS.map((letter, i) => (
          <Text
            key={`h-${i}`}
            style={[styles.dayLetter, { color: subtitleColor }]}
          >
            {letter}
          </Text>
        ))}
      </View>

      {/* Day circles */}
      <View style={styles.dayRow}>
        {days.map((date, i) => {
          const isSelected = isSameDay(date, selectedDate)
          const isToday = isSameDay(date, today)

          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.dayCircle,
                isSelected && { backgroundColor: accentColor },
                isToday && !isSelected && styles.todayOutline,
                isToday && !isSelected && { borderColor: `${accentColor}50` },
              ]}
              onPress={() => handlePress(date)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayNumber,
                  { color: isSelected ? '#FFFFFF' : textColor },
                  isToday && !isSelected && { color: accentColor },
                ]}
              >
                {date.getDate()}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const CIRCLE_SIZE = 36

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  dayLetterRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  dayLetter: {
    width: CIRCLE_SIZE,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayOutline: {
    borderWidth: 1.5,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
})

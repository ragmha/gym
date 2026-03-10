import { useTheme } from '@/hooks/useThemeColor'
import Ionicons from '@expo/vector-icons/Ionicons'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface CalendarStripProps {
  /** The date around which to generate the calendar strip. */
  focusDate?: Date
  /** Controlled selected date. Defaults to today when not provided. */
  selectedDate?: Date
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

function isFutureDate(date: Date, today: Date): boolean {
  return (
    date.getFullYear() > today.getFullYear() ||
    (date.getFullYear() === today.getFullYear() &&
      date.getMonth() > today.getMonth()) ||
    (date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() > today.getDate())
  )
}

export function CalendarStrip({
  focusDate,
  selectedDate: selectedDateProp,
  onDateSelected,
  onFocusDateChange,
}: CalendarStripProps) {
  const today = useMemo(() => new Date(), [])
  const center = focusDate ?? today
  const [selectedDate, setSelectedDate] = useState<Date>(
    selectedDateProp ?? center,
  )

  // Sync when parent controls the selected date
  useEffect(() => {
    if (selectedDateProp) {
      setSelectedDate(selectedDateProp)
    }
  }, [selectedDateProp])

  const {
    text: textColor,
    subtitleText: subtitleColor,
    accent: accentColor,
    cardBackground: cardBg,
    border: borderColor,
  } = useTheme()

  const days = useMemo(() => getWeek(center), [center])

  // Disable forward nav when already on the current week (or future)
  const canGoForward = useMemo(() => {
    const currentMonday = getMonday(center)
    const todayMonday = getMonday(today)
    return currentMonday < todayMonday
  }, [center, today])

  const navigateWeek = useCallback(
    (direction: -1 | 1) => {
      if (direction === 1 && !canGoForward) return
      const next = new Date(center)
      next.setDate(next.getDate() + direction * 7)
      onFocusDateChange?.(next)
    },
    [center, onFocusDateChange, canGoForward],
  )

  const handlePress = useCallback(
    (date: Date) => {
      if (isFutureDate(date, today)) return
      setSelectedDate(date)
      onDateSelected?.(date)
    },
    [onDateSelected, today],
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
          style={[styles.navButton, !canGoForward && styles.navButtonDisabled]}
          disabled={!canGoForward}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={canGoForward ? subtitleColor : `${subtitleColor}40`}
          />
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
          const isFuture = isFutureDate(date, today)

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
              activeOpacity={isFuture ? 1 : 0.7}
              disabled={isFuture}
            >
              <Text
                style={[
                  styles.dayNumber,
                  { color: isSelected ? '#FFFFFF' : textColor },
                  isToday && !isSelected && { color: accentColor },
                  isFuture && { color: `${textColor}28` },
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
  navButtonDisabled: {
    opacity: 0.4,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
})

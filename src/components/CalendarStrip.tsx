import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Dimensions,
} from 'react-native'
import { useThemeColor } from '@/hooks/useThemeColor'

const { width } = Dimensions.get('window') // Get screen width to calculate dynamic styles

interface CalendarStripProps {
  startDate?: Date
  onDateSelected?: (date: Date) => void
}

export const CalendarStrip: React.FC<CalendarStripProps> = ({
  startDate = new Date(),
  onDateSelected,
}) => {
  const [currentDay, setCurrentDay] = useState<Date>(startDate)
  const [selectedDate, setSelectedDate] = useState<Date>(startDate)
  const scrollViewRef = useRef<ScrollView>(null)

  const backgroundColor = useThemeColor({}, 'background')
  const textColor = useThemeColor({}, 'text')
  const selectedCircleColor = useThemeColor({}, 'selectedCircle')
  const shadowColor = useThemeColor({}, 'shadow')

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: width, animated: false }) // Start at the middle week (current week)
    }
  }, [])

  function getWeekFromToday(startDate: Date, offset: number): Date[] {
    const dates: Date[] = []
    const start = new Date(startDate)
    start.setDate(start.getDate() + offset * 7) // Offset for the week navigation

    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  function onNextWeek() {
    const nextDay = new Date(currentDay)
    nextDay.setDate(currentDay.getDate() + 7)
    setCurrentDay(nextDay)
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: width * 2, animated: true })
    }
  }

  function onPrevWeek() {
    const prevDay = new Date(currentDay)
    prevDay.setDate(currentDay.getDate() - 7)
    setCurrentDay(prevDay)
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: 0, animated: true })
    }
  }

  function handleDateSelected(date: Date) {
    setSelectedDate(date)
    if (onDateSelected) {
      onDateSelected(date)
    }
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset } = event.nativeEvent
    const currentPage = Math.round(contentOffset.x / width)

    if (currentPage === 0) {
      onPrevWeek()
    } else if (currentPage === 2) {
      onNextWeek()
    } else if (currentPage === 1) {
      setCurrentDay(currentDay)
    }

    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: width, animated: false })
    }
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.monthText, { color: textColor }]}>
        {currentDay.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })}
      </Text>
      <View style={styles.inner}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          contentOffset={{ x: width, y: 0 }} // Start at the middle page
          scrollEventThrottle={16}
        >
          {/* Previous Week */}
          <View style={[styles.weekContainer, { width }]}>
            {getWeekFromToday(currentDay, -1).map((day) => (
              <TouchableOpacity
                key={day.toDateString()}
                style={[
                  styles.dayContainer,
                  selectedDate.toDateString() === day.toDateString() && {
                    backgroundColor: selectedCircleColor,
                    shadowColor: shadowColor,
                  },
                ]}
                onPress={() => handleDateSelected(day)}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: textColor },
                    selectedDate.toDateString() === day.toDateString() && {
                      color: '#FFFFFF',
                    },
                  ]}
                >
                  {day
                    .toLocaleDateString('en-US', { weekday: 'short' })
                    .charAt(0)}
                </Text>
                <Text
                  style={[
                    styles.dateText,
                    { color: textColor },
                    selectedDate.toDateString() === day.toDateString() && {
                      color: '#FFFFFF',
                    },
                  ]}
                >
                  {day.getDate()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Current Week */}
          <View style={[styles.weekContainer, { width }]}>
            {getWeekFromToday(currentDay, 0).map((day) => (
              <TouchableOpacity
                key={day.toDateString()}
                style={[
                  styles.dayContainer,
                  selectedDate.toDateString() === day.toDateString() && {
                    backgroundColor: selectedCircleColor,
                    shadowColor: shadowColor,
                  },
                ]}
                onPress={() => handleDateSelected(day)}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: textColor },
                    selectedDate.toDateString() === day.toDateString() && {
                      color: '#FFFFFF',
                    },
                  ]}
                >
                  {day
                    .toLocaleDateString('en-US', { weekday: 'short' })
                    .charAt(0)}
                </Text>
                <Text
                  style={[
                    styles.dateText,
                    { color: textColor },
                    selectedDate.toDateString() === day.toDateString() && {
                      color: '#FFFFFF',
                    },
                  ]}
                >
                  {day.getDate()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Next Week */}
          <View style={[styles.weekContainer, { width }]}>
            {getWeekFromToday(currentDay, 1).map((day) => (
              <TouchableOpacity
                key={day.toDateString()}
                style={[
                  styles.dayContainer,
                  selectedDate.toDateString() === day.toDateString() && {
                    backgroundColor: selectedCircleColor,
                    shadowColor: shadowColor,
                  },
                ]}
                onPress={() => handleDateSelected(day)}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: textColor },
                    selectedDate.toDateString() === day.toDateString() && {
                      color: '#FFFFFF',
                    },
                  ]}
                >
                  {day
                    .toLocaleDateString('en-US', { weekday: 'short' })
                    .charAt(0)}
                </Text>
                <Text
                  style={[
                    styles.dateText,
                    { color: textColor },
                    selectedDate.toDateString() === day.toDateString() && {
                      color: '#FFFFFF',
                    },
                  ]}
                >
                  {day.getDate()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  inner: {
    paddingVertical: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'left',
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayContainer: {
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    width: width / 7 - 10,
  },
  dayText: {
    fontSize: 14,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
})

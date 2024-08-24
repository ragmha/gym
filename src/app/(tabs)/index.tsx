import React from 'react'
import { View, StyleSheet, StatusBar } from 'react-native'

import { CalendarStrip } from '@/components/CalendarStrip'
import { WorkoutProgress } from '@/components/WorkoutProgress'

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar />
      <CalendarStrip />
      <WorkoutProgress />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
})

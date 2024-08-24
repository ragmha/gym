import { FlatList, StyleSheet, View } from 'react-native'

import Workout from '@/components/Workout'

import Header from '@/components/Header'
import { StatusBar } from 'expo-status-bar'
import { useExerciseStore } from '@/data/store'

export default function WorkoutsScreen() {
  const exercises = useExerciseStore((store) => store.exercises)
  const completed = useExerciseStore((store) => store.completedCount)()

  return (
    <View style={styles.container}>
      <StatusBar />
      <Header>
        Workouts {completed} / {exercises.length}
      </Header>
      <FlatList
        data={exercises}
        renderItem={({ item }) => <Workout item={item} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
})

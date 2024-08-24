import { FlatList, StyleSheet, View } from "react-native"

import Workout from "@/components/Workout"

import Header from "@/components/Header"
import { StatusBar } from "expo-status-bar"
import { useExerciseStore } from "@/data/store"

export default function HomeScreen() {
  const exercises = useExerciseStore((store) => store.exercises)

  return (
    <View style={styles.container}>
      <StatusBar />
      <Header>Workouts</Header>
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

import React, { useState } from 'react'
import { FlatList, StyleSheet, View, Dimensions } from 'react-native'
import { TabView, SceneMap, TabBar } from 'react-native-tab-view'
import Workout from '@/components/Workout'
import Header from '@/components/Header'
import { StatusBar } from 'expo-status-bar'
import { useExerciseStore } from '@/stores/ExerciseStore'
import { useThemeColor } from '@/hooks/useThemeColor'

export default function WorkoutsScreen() {
  const exercises = useExerciseStore((store) => store.exercises)
  const activeWorkouts = exercises.filter((exercise) => !exercise.completed)
  const completedWorkouts = exercises.filter((exercise) => exercise.completed)

  const completed = useExerciseStore((store) => store.completedCount)()
  const [index, setIndex] = useState(0)
  const [routes] = useState([
    { key: 'active', title: 'Active' },
    { key: 'completed', title: 'Completed' },
  ])

  const backgroundColor = useThemeColor({}, 'background')

  const renderActiveWorkouts = () => (
    <FlatList
      data={activeWorkouts}
      renderItem={({ item }) => <Workout item={item} />}
      keyExtractor={(item) => item.id}
    />
  )

  const renderCompletedWorkouts = () => (
    <FlatList
      data={completedWorkouts}
      renderItem={({ item }) => <Workout item={item} />}
      keyExtractor={(item) => item.id}
    />
  )

  const renderScene = SceneMap({
    active: renderActiveWorkouts,
    completed: renderCompletedWorkouts,
  })

  return (
    <View style={styles.container}>
      <StatusBar />
      <Header>
        Workouts {completed} / {exercises.length}
      </Header>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: Dimensions.get('window').width }}
        renderTabBar={(props) => (
          <TabBar {...props} style={[{ backgroundColor }]} />
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  tabBar: {
    backgroundColor: 'white',
  },
})

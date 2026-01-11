import Header from '@/components/Header'
import Workout from '@/components/Workout'
import { useThemeColor } from '@/hooks/useThemeColor'
import { useExerciseStore } from '@/stores/ExerciseStore'
import { StatusBar } from 'expo-status-bar'
import React, { useState } from 'react'
import { Dimensions, FlatList, StyleSheet, View } from 'react-native'
import { SceneMap, TabBar, TabView } from 'react-native-tab-view'

export default function WorkoutsScreen() {
  const { activeExercises, completedExercises, completedCount, exercises } =
    useExerciseStore()

  const [index, setIndex] = useState(0)
  const [routes] = useState([
    { key: 'active', title: 'Active' },
    { key: 'completed', title: 'Completed' },
  ])

  const backgroundColor = useThemeColor({}, 'background')

  const renderActiveWorkouts = () => (
    <FlatList
      data={activeExercises}
      renderItem={({ item }) => <Workout item={item} />}
      keyExtractor={(item) => item.id}
    />
  )

  const renderCompletedWorkouts = () => (
    <FlatList
      data={completedExercises}
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
        Workouts {completedCount} / {exercises.length}
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

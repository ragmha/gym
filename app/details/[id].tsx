import { FlatList, View, StyleSheet } from "react-native";

import exercisesData from "@/data/exercises.json";

import WorkoutDetail from "@/components/WorkoutDetail";
import { useLocalSearchParams } from "expo-router";
import VideoPlayer from "@/components/VideoPlayer";

const data = (day: string | string[]) => {
  return exercisesData
    .filter((item) => item.day === day)
    .flatMap((item) =>
      item.exercises.map((exercise) => ({
        id: exercise.id,
        title: exercise.title,
        sets: exercise.sets,
        reps: exercise.reps,
        variation: exercise.variation,
        day: item.day,
      }))
    );
};

export default function DetailsScreen() {
  const { id } = useLocalSearchParams();

  const exercise = exercisesData.find((e) => e.day === id);

  return (
    <View style={styles.container}>
      {exercise && <VideoPlayer uri={exercise.videoURL} />}
      <FlatList
        data={data(id)}
        renderItem={({ item }) => <WorkoutDetail item={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

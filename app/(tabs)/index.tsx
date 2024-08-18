import { FlatList, StyleSheet, View } from "react-native";

import Workout from "@/components/Workout";
import exercisesData from "@/data/exercises.json";
import { getRandomPastelColor } from "@/utils/getRandomPastelColor";
import Header from "@/components/Header";
import { StatusBar } from "expo-status-bar";

const today = new Date();
const data = exercisesData.map((e) => ({
  id: e.day,
  title: e.title,
  date: new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + Number(e.day) - 1
  ).toLocaleString(),
  color: getRandomPastelColor(),
}));

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar />
      <Header>Workouts</Header>
      <FlatList
        data={data}
        renderItem={({ item }) => <Workout item={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
});

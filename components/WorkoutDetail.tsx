import { useThemeColor } from "@/hooks/useThemeColor";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type Exercise = {
  id: string;
  title: string;
  sets: number | string;
  reps: number | null;
  variation: string | null;
  day: string;
};

export default function WorkoutDetail({ item }: { item: Exercise }) {
  const [selectedCircles, setSelectedCircles] = useState(
    new Array(typeof item.sets === "number" ? item.sets : 1).fill(false)
  );

  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(0.2, { duration: 100 }, () => {
      opacity.value = withTiming(1, { duration: 200 });
    });
  }, []);

  const toggleCircle = (index: number) => {
    const newSelectedCircles = [...selectedCircles];
    newSelectedCircles[index] = !newSelectedCircles[index];
    setSelectedCircles(newSelectedCircles);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const selectedCircleColor = useThemeColor({}, "selectedCircle");
  const shadowColor = useThemeColor({}, "shadow");

  return (
    <Animated.View
      style={[
        styles.workoutItem,
        animatedStyle,
        { backgroundColor, shadowColor },
      ]}
      entering={SlideInDown}
    >
      <View style={styles.workoutDetails}>
        <Text style={[styles.workoutTitle, { color: textColor }]}>
          {item.title}
        </Text>
        <View style={styles.circlesContainer}>
          {Array.from({
            length: typeof item.sets === "number" ? item.sets : 1,
          }).map((_, index) => {
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.circle,
                  selectedCircles[index] && {
                    backgroundColor: selectedCircleColor,
                    borderColor: "#FFFFFF",
                  },
                ]}
                onPress={() => toggleCircle(index)}
              >
                <Text
                  style={[
                    styles.repsText,
                    { color: selectedCircles[index] ? "#FFFFFF" : textColor },
                  ]}
                >
                  {item.reps}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  workoutItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 10,
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  workoutDetails: {
    flex: 1,
    justifyContent: "space-between",
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: "bold",
    flexWrap: "wrap",
  },
  circlesContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  repsText: {
    fontWeight: "400",
  },
  circle: {
    width: 50,
    height: 50,
    borderRadius: 30,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
  },
});

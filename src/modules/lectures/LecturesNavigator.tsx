import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LecturesScreen from "./screens/LecturesScreen";
import PlanLecturesScreen from "./screens/PlanLecturesScreen";

export type LecturesParamList = {
  LecturesHome: undefined;
  PlanLectures: undefined;
};

const Stack = createNativeStackNavigator<LecturesParamList>();

export default function LecturesNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LecturesHome" component={LecturesScreen} options={{ title: "Lectures" }} />
      <Stack.Screen name="PlanLectures" component={PlanLecturesScreen} options={{ title: "Plan timetable" }} />
    </Stack.Navigator>
  );
}

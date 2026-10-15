import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ExamsScreen from "./screens/ExamsScreen";
import ExamSheetScreen from "./screens/ExamSheetScreen";

export type ExamsParamList = {
  ExamsList: undefined;
  ExamSheet: { id: string };
};

const Stack = createNativeStackNavigator<ExamsParamList>();

export default function ExamsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExamsList" component={ExamsScreen} options={{ title: "Tests" }} />
      <Stack.Screen name="ExamSheet" component={ExamSheetScreen} options={{ title: "Marks sheet" }} />
    </Stack.Navigator>
  );
}

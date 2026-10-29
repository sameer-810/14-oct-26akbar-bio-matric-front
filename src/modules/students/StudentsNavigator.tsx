import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import StudentsScreen from "./screens/StudentsScreen";
import AdmitStudentScreen from "./screens/AdmitStudentScreen";
import StudentDetailScreen from "./screens/StudentDetailScreen";

export type StudentsParamList = {
  /** opened from a batch: the list starts filtered to it */
  StudentsList: { batchId?: string; standardId?: string } | undefined;
  AdmitStudent: undefined;
  StudentDetail: { id: string };
};

const Stack = createNativeStackNavigator<StudentsParamList>();

export default function StudentsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentsList" component={StudentsScreen} options={{ title: "Students" }} />
      <Stack.Screen name="AdmitStudent" component={AdmitStudentScreen} options={{ title: "New admission" }} />
      <Stack.Screen name="StudentDetail" component={StudentDetailScreen} options={{ title: "Student" }} />
    </Stack.Navigator>
  );
}

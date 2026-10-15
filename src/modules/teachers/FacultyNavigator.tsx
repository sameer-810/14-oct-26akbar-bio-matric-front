import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TeachersScreen from "./screens/TeachersScreen";
import TeacherDetailScreen from "./screens/TeacherDetailScreen";

export type FacultyParamList = {
  TeachersList: undefined;
  TeacherDetail: { id: string };
};

const Stack = createNativeStackNavigator<FacultyParamList>();

export default function FacultyNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TeachersList" component={TeachersScreen} options={{ title: "Faculty" }} />
      <Stack.Screen name="TeacherDetail" component={TeacherDetailScreen} options={{ title: "Faculty member" }} />
    </Stack.Navigator>
  );
}

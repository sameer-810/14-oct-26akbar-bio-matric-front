import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BatchesScreen from "./screens/BatchesScreen";
import BatchDetailScreen from "./screens/BatchDetailScreen";
import BatchEditScreen from "./screens/BatchEditScreen";

export type BatchesParamList = {
  BatchesList: undefined;
  BatchDetail: { id: string };
  BatchEdit: { id: string };
};

const Stack = createNativeStackNavigator<BatchesParamList>();

export default function BatchesNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BatchesList" component={BatchesScreen} options={{ title: "Batches" }} />
      <Stack.Screen name="BatchDetail" component={BatchDetailScreen} options={{ title: "Batch" }} />
      <Stack.Screen name="BatchEdit" component={BatchEditScreen} options={{ title: "Edit batch" }} />
    </Stack.Navigator>
  );
}

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FeesScreen from "./screens/FeesScreen";

export type FeesParamList = {
  FeesHome: undefined;
};

const Stack = createNativeStackNavigator<FeesParamList>();

export default function FeesNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FeesHome" component={FeesScreen} options={{ title: "Fees" }} />
    </Stack.Navigator>
  );
}

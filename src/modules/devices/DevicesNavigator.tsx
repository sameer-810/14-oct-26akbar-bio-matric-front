import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DevicesScreen from "./screens/DevicesScreen";
import DeviceDetailScreen from "./screens/DeviceDetailScreen";

export type DevicesParamList = {
  DevicesList: undefined;
  DeviceDetail: { id: string };
};

const Stack = createNativeStackNavigator<DevicesParamList>();

export default function DevicesNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DevicesList" component={DevicesScreen} options={{ title: "Fingerprint machines" }} />
      <Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} options={{ title: "Machine" }} />
    </Stack.Navigator>
  );
}

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import RegisterScreen from "./screens/RegisterScreen";
import LectureRegisterScreen from "./screens/LectureRegisterScreen";

export type RegistersParamList = {
  Register: { batchId?: string; date?: string } | undefined;
  LectureRegister: { id: string };
};

const Stack = createNativeStackNavigator<RegistersParamList>();

export default function RegistersNavigator({ route }: { route?: { params?: { batchId?: string } } }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Register" component={RegisterScreen} initialParams={route?.params} options={{ title: "Registers" }} />
      <Stack.Screen name="LectureRegister" component={LectureRegisterScreen} options={{ title: "Lecture register" }} />
    </Stack.Navigator>
  );
}

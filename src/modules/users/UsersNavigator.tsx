import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import UsersScreen from "./screens/UsersScreen";
import CreateUserScreen from "./screens/CreateUserScreen";
import UserDetailScreen from "./screens/UserDetailScreen";

export type UsersParamList = {
  UsersList: undefined;
  CreateUser: undefined;
  UserDetail: { id: string };
};

const Stack = createNativeStackNavigator<UsersParamList>();

export default function UsersNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UsersList" component={UsersScreen} options={{ title: "Staff logins" }} />
      <Stack.Screen name="CreateUser" component={CreateUserScreen} options={{ title: "New login" }} />
      <Stack.Screen name="UserDetail" component={UserDetailScreen} options={{ title: "Login" }} />
    </Stack.Navigator>
  );
}

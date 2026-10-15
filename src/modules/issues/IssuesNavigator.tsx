import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import IssuesScreen from "./screens/IssuesScreen";
import IssueDetailScreen from "./screens/IssueDetailScreen";

export type IssuesParamList = {
  IssuesList: undefined;
  IssueDetail: { id: string };
};

const Stack = createNativeStackNavigator<IssuesParamList>();

export default function IssuesNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="IssuesList" component={IssuesScreen} options={{ title: "Issues" }} />
      <Stack.Screen name="IssueDetail" component={IssueDetailScreen} options={{ title: "Issue" }} />
    </Stack.Navigator>
  );
}

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ParentMoreScreen from "./screens/ParentMoreScreen";
import ParentResultsScreen from "./screens/ParentResultsScreen";
import ParentIssuesScreen from "./screens/ParentIssuesScreen";
import ParentIssueScreen from "./screens/ParentIssueScreen";
import ParentAccountScreen from "./screens/ParentAccountScreen";
import ParentLecturesScreen from "./screens/ParentLecturesScreen";

export type ParentMoreParamList = {
  ParentMoreHome: undefined;
  ParentAccount: undefined;
  ParentLectures: undefined;
  ParentResults: undefined;
  ParentIssues: undefined;
  ParentIssue: { id: string };
};

const Stack = createNativeStackNavigator<ParentMoreParamList>();

/** The "More" tab: a list of sections, each its own screen (Screen draws the back button). */
export default function ParentMoreNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ParentMoreHome" component={ParentMoreScreen} options={{ title: "More" }} />
      {/* Lectures and questions are no longer in the menu; kept so an existing link still opens */}
      <Stack.Screen name="ParentLectures" component={ParentLecturesScreen} options={{ title: "Lectures" }} />
      <Stack.Screen name="ParentAccount" component={ParentAccountScreen} options={{ title: "Account" }} />
      <Stack.Screen name="ParentResults" component={ParentResultsScreen} options={{ title: "Test results" }} />
      <Stack.Screen name="ParentIssues" component={ParentIssuesScreen} options={{ title: "Questions and issues" }} />
      <Stack.Screen name="ParentIssue" component={ParentIssueScreen} options={{ title: "Question" }} />
    </Stack.Navigator>
  );
}

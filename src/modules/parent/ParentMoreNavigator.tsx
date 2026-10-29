import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ParentMoreScreen from "./screens/ParentMoreScreen";
import ParentResultsScreen from "./screens/ParentResultsScreen";
import ParentNoticesScreen from "./screens/ParentNoticesScreen";
import ParentDocumentsScreen from "./screens/ParentDocumentsScreen";
import ParentLeaveScreen from "./screens/ParentLeaveScreen";
import ParentIssuesScreen from "./screens/ParentIssuesScreen";
import ParentIssueScreen from "./screens/ParentIssueScreen";
import ParentFeesScreen from "./screens/ParentFeesScreen";
import ParentLecturesScreen from "./screens/ParentLecturesScreen";
import ParentProfileScreen from "./screens/ParentProfileScreen";

export type ParentMoreParamList = {
  ParentMoreHome: undefined;
  ParentFees: undefined;
  ParentLectures: undefined;
  ParentProfile: undefined;
  ParentResults: undefined;
  ParentNotices: undefined;
  ParentDocuments: undefined;
  ParentLeave: undefined;
  ParentIssues: undefined;
  ParentIssue: { id: string };
};

const Stack = createNativeStackNavigator<ParentMoreParamList>();

/** The "More" tab: a list of sections, each its own screen (Screen draws the back button). */
export default function ParentMoreNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ParentMoreHome" component={ParentMoreScreen} options={{ title: "More" }} />
      <Stack.Screen name="ParentLectures" component={ParentLecturesScreen} options={{ title: "Lectures" }} />
      <Stack.Screen name="ParentProfile" component={ParentProfileScreen} options={{ title: "Profile" }} />
      <Stack.Screen name="ParentFees" component={ParentFeesScreen} options={{ title: "Fees" }} />
      <Stack.Screen name="ParentResults" component={ParentResultsScreen} options={{ title: "Test results" }} />
      <Stack.Screen name="ParentNotices" component={ParentNoticesScreen} options={{ title: "Notice board" }} />
      <Stack.Screen name="ParentDocuments" component={ParentDocumentsScreen} options={{ title: "Documents" }} />
      <Stack.Screen name="ParentLeave" component={ParentLeaveScreen} options={{ title: "Leave" }} />
      <Stack.Screen name="ParentIssues" component={ParentIssuesScreen} options={{ title: "Questions and issues" }} />
      <Stack.Screen name="ParentIssue" component={ParentIssueScreen} options={{ title: "Question" }} />
    </Stack.Navigator>
  );
}

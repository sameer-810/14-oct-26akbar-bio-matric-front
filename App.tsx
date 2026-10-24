import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer, type LinkingOptions } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";

import RootNavigator, { type RootParamList } from "@navigation/RootNavigator";
import { palette } from "@shared/designSystem";
import { queryClient } from "@api/queryClient";

void SplashScreen.preventAutoHideAsync();

// Every addressable screen gets a URL on the web build, so staff can bookmark
// the register and a parent's notification can deep-link to their child's day.
const linking: LinkingOptions<RootParamList> = {
  prefixes: [],
  config: {
    screens: {
      Login: "login",
      SetPassword: "set-password",
      App: {
        path: "",
        screens: {
          Dashboard: "dashboard",
          Students: { path: "students", screens: { StudentsList: "", AdmitStudent: "admit", StudentDetail: ":id" } },
          Batches: "batches",
          Faculty: { path: "faculty", screens: { TeachersList: "", TeacherDetail: ":id" } },
          Lectures: { path: "lectures", screens: { LecturesHome: "", PlanLectures: "plan" } },
          Salary: "salary",
          MyTeaching: "my-teaching",
          Exams: { path: "tests", screens: { ExamsList: "", ExamSheet: ":id" } },
          Notices: "notices",
          Documents: "documents",
          Issues: { path: "issues", screens: { IssuesList: "", IssueDetail: ":id" } },
          Reports: "reports",
          Fees: { path: "fees", screens: { FeesHome: "" } },
          Expenses: "expenses",
          Enquiries: { path: "enquiries", screens: { EnquiriesList: "", EnquiryNew: "new", EnquiryDetail: ":id" } },
          Holidays: "holidays",
          Settings: "settings",
          Today: "today",
          Registers: { path: "registers", screens: { Register: "", LectureRegister: "lecture/:id" } },
          Punches: "punches",
          Leaves: "leaves",
          Alerts: "alerts",
          Devices: { path: "devices", screens: { DevicesList: "", DeviceDetail: ":id" } },
          Users: { path: "staff", screens: { UsersList: "", CreateUser: "new", UserDetail: ":id" } },
          Audit: "audit",
          Inbox: "notifications",
          Profile: "account",
        },
      },
      Parent: {
        path: "parent",
        screens: {
          ParentHome: "",
          ParentCalendar: "calendar",
          ParentAlerts: "alerts",
          ParentMore: {
            path: "more",
            screens: {
              ParentMoreHome: "",
              ParentFees: "fees",
              ParentResults: "results",
              ParentNotices: "notices",
              ParentDocuments: "documents",
              ParentLeave: "leave",
              ParentIssues: "questions",
              ParentIssue: "questions/:id",
            },
          },
          ParentAccount: "account",
        },
      },
    },
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer
            linking={linking}
            documentTitle={{ formatter: (options) => (options?.title ? `${options.title} · Akbar's Academy` : "Akbar's Academy") }}
            theme={{
              dark: false,
              colors: {
                primary: palette.primary[600],
                background: palette.surface.secondary,
                card: palette.surface.primary,
                text: palette.text.primary,
                border: palette.border.default,
                notification: palette.danger.text,
              },
              fonts: {
                regular: { fontFamily: "Inter_400Regular", fontWeight: "400" },
                medium: { fontFamily: "Inter_500Medium", fontWeight: "500" },
                bold: { fontFamily: "Inter_600SemiBold", fontWeight: "600" },
                heavy: { fontFamily: "Inter_600SemiBold", fontWeight: "600" },
              },
            }}
          >
            <StatusBar style="dark" />
            <RootNavigator />
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

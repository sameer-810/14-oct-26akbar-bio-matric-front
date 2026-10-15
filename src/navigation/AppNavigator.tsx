import React, { useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createDrawerNavigator, type DrawerContentComponentProps } from "@react-navigation/drawer";
import { Menu } from "lucide-react-native";
import { palette, radius, layout } from "@shared/designSystem";
import { Text, HStack, BrandMark } from "@shared/ui";
import { Sidebar } from "./Sidebar";
import { NAV_ITEMS, useVisibleNavItems } from "./navItems";

import DashboardScreen from "@modules/dashboard/screens/DashboardScreen";
import DevicesNavigator from "@modules/devices/DevicesNavigator";
import UsersNavigator from "@modules/users/UsersNavigator";
import AuditTrailScreen from "@modules/audit/screens/AuditTrailScreen";
import ProfileScreen from "@modules/auth/screens/ProfileScreen";
import StudentsNavigator from "@modules/students/StudentsNavigator";
import BatchesScreen from "@modules/academy/screens/BatchesScreen";
import HolidaysScreen from "@modules/academy/screens/HolidaysScreen";
import SettingsScreen from "@modules/academy/screens/SettingsScreen";
import FacultyNavigator from "@modules/teachers/FacultyNavigator";
import LecturesNavigator from "@modules/lectures/LecturesNavigator";
import SalaryReportScreen from "@modules/payroll/screens/SalaryReportScreen";
import MyTeachingScreen from "@modules/teaching/screens/MyTeachingScreen";
import ExamsNavigator from "@modules/exams/ExamsNavigator";
import NoticesScreen from "@modules/notices/screens/NoticesScreen";
import DocumentsScreen from "@modules/documents/screens/DocumentsScreen";
import IssuesNavigator from "@modules/issues/IssuesNavigator";
import ReportsScreen from "@modules/reports/screens/ReportsScreen";
import EnquiriesNavigator from "@modules/enquiries/EnquiriesNavigator";
import FeesNavigator from "@modules/fees/FeesNavigator";
import ExpensesScreen from "@modules/expenses/screens/ExpensesScreen";
import LiveBoardScreen from "@modules/attendance/screens/LiveBoardScreen";
import RegistersNavigator from "@modules/attendance/RegistersNavigator";
import PunchesScreen from "@modules/attendance/screens/PunchesScreen";
import LeaveRequestsScreen from "@modules/attendance/screens/LeaveRequestsScreen";
import AlertLogScreen from "@modules/notifications/screens/AlertLogScreen";

/** Route name → screen. Kept out of navItems.ts so that stays a pure data module. */
const SCREENS: Record<string, React.ComponentType<object>> = {
  Dashboard: DashboardScreen,
  Students: StudentsNavigator,
  Batches: BatchesScreen,
  Faculty: FacultyNavigator,
  Lectures: LecturesNavigator,
  Salary: SalaryReportScreen,
  MyTeaching: MyTeachingScreen,
  Exams: ExamsNavigator,
  Notices: NoticesScreen,
  Documents: DocumentsScreen,
  Issues: IssuesNavigator,
  Reports: ReportsScreen,
  Enquiries: EnquiriesNavigator,
  Fees: FeesNavigator,
  Expenses: ExpensesScreen,
  Holidays: HolidaysScreen,
  Settings: SettingsScreen,
  Today: LiveBoardScreen,
  Registers: RegistersNavigator,
  Punches: PunchesScreen,
  Leaves: LeaveRequestsScreen,
  Alerts: AlertLogScreen,
  Devices: DevicesNavigator,
  Users: UsersNavigator,
  Audit: AuditTrailScreen,
  Profile: ProfileScreen,
};

const Drawer = createDrawerNavigator();

/** The staff app: a permanent sidebar on a desk, a drawer on a phone. */
export default function AppNavigator() {
  const { width } = useWindowDimensions();
  const isWide = width >= layout.wideBreakpoint;
  const [collapsed, setCollapsed] = useState(false);
  const items = useVisibleNavItems();
  const first = items[0]?.name ?? "Profile";

  const drawerContent = (props: DrawerContentComponentProps) => (
    <Sidebar
      activeRoute={props.state.routeNames[props.state.index]}
      onNavigate={(name) => props.navigation.navigate(name)}
      collapsed={isWide && collapsed}
      onToggleCollapse={isWide ? () => setCollapsed((c) => !c) : undefined}
    />
  );

  return (
    <Drawer.Navigator
      initialRouteName={items.some((i) => i.name === "Dashboard") ? "Dashboard" : first}
      drawerContent={drawerContent}
      screenOptions={{
        drawerType: isWide ? "permanent" : "front",
        headerShown: !isWide,
        header: ({ route, navigation }) => (
          <SafeAreaView edges={["top"]} style={styles.appBarSafe}>
            <HStack align="center" gap={12} style={styles.appBar}>
              <Pressable
                onPress={() => navigation.openDrawer()}
                hitSlop={8}
                style={styles.menuBtn}
                accessibilityRole="button"
                accessibilityLabel="Open menu"
              >
                <Menu size={22} color={palette.text.primary} strokeWidth={2} />
              </Pressable>
              <BrandMark size={30} />
              <Text variant="h3" tone="primary">
                {NAV_ITEMS.find((i) => i.name === route.name)?.label || "Akbar's Academy"}
              </Text>
            </HStack>
          </SafeAreaView>
        ),
        drawerStyle: {
          width: isWide && collapsed ? layout.sidebarCollapsedWidth : layout.sidebarWidth,
          borderRightWidth: 0,
        },
        overlayColor: "rgba(11,18,32,0.4)",
        sceneStyle: { backgroundColor: palette.surface.secondary },
      }}
    >
      {/* only permitted routes are registered, so a deep link to any other cannot render */}
      {items.map((item) => (
        <Drawer.Screen key={item.name} name={item.name} component={SCREENS[item.name]} options={{ title: item.label }} />
      ))}
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  appBarSafe: { backgroundColor: palette.surface.primary },
  appBar: {
    height: 56,
    paddingHorizontal: 14,
    backgroundColor: palette.surface.primary,
    borderBottomWidth: 1,
    borderBottomColor: palette.border.default,
  },
  menuBtn: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});

import React, { useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createDrawerNavigator, type DrawerContentComponentProps } from "@react-navigation/drawer";
import { Menu, Bell } from "lucide-react-native";
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
import BatchesNavigator from "@modules/academy/BatchesNavigator";
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
import InboxScreen from "@modules/notifications/screens/InboxScreen";
import { InboxWatcher } from "@modules/notifications/components/InboxWatcher";
import { useUnreadInbox } from "@modules/notifications/hooks/useInbox";

/** Route name → screen. Kept out of navItems.ts so that stays a pure data module. */
const SCREENS: Record<string, React.ComponentType<object>> = {
  Dashboard: DashboardScreen,
  Students: StudentsNavigator,
  Batches: BatchesNavigator,
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
  Inbox: InboxScreen,
  Profile: ProfileScreen,
};

/** The bell on a phone's app bar, with the unread count. */
function HeaderBell({ onPress }: { onPress: () => void }) {
  const n = useUnreadInbox().data?.unread ?? 0;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={styles.menuBtn}
      accessibilityRole="button"
      accessibilityLabel={n ? `Notifications, ${n} unread` : "Notifications"}
      testID="header-bell"
    >
      <Bell size={21} color={palette.text.primary} strokeWidth={2} />
      {n ? (
        <View style={styles.badge}>
          <Text variant="caption" style={styles.badgeText}>
            {n > 9 ? "9+" : String(n)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

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
      // Back returns to the page you came from, not always the dashboard
      backBehavior="history"
      // around the whole staff app, once: a pop-up for each note that arrives
      layout={({ children, navigation }) => (
        <View style={{ flex: 1 }}>
          {children}
          <InboxWatcher onOpen={() => navigation.navigate("Inbox")} />
        </View>
      )}
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
              <Text variant="h3" tone="primary" style={{ flex: 1 }}>
                {NAV_ITEMS.find((i) => i.name === route.name)?.label || "Akbar's Academy"}
              </Text>
              <HeaderBell onPress={() => navigation.navigate("Inbox")} />
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
  badge: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#A82418",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 11, lineHeight: 14 },
  menuBtn: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});

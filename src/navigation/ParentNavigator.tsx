import React, { useEffect } from "react";
import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { House, CalendarDays, Bell, LayoutGrid, UserRound } from "lucide-react-native";

import { palette } from "@shared/designSystem";
import ParentHomeScreen from "@modules/parent/screens/ParentHomeScreen";
import ParentCalendarScreen from "@modules/parent/screens/ParentCalendarScreen";
import ParentAlertsScreen from "@modules/parent/screens/ParentAlertsScreen";
import ParentMoreNavigator from "@modules/parent/ParentMoreNavigator";
import ParentAccountScreen from "@modules/parent/screens/ParentAccountScreen";
import { useInbox, useKeepChildSelected } from "@modules/parent/hooks/useParent";
import { registerForPush } from "@modules/parent/pushRegistration";

const Tab = createBottomTabNavigator();

/**
 * The parent app: five tabs, the same on a phone and in a browser. "More"
 * holds results, the notice board, documents, leave and questions — each
 * shown only when the owner allows it.
 */
export default function ParentNavigator() {
  const unread = useInbox().data?.unread ?? 0;
  useKeepChildSelected();

  // on a phone, ask for alerts once after sign-in; the Account tab can ask again
  useEffect(() => {
    if (Platform.OS !== "web") void registerForPush();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary[700],
        tabBarInactiveTintColor: palette.text.tertiary,
        tabBarStyle: { backgroundColor: palette.surface.primary, borderTopColor: palette.border.default },
        tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 11 },
        sceneStyle: { backgroundColor: palette.surface.secondary },
      }}
    >
      <Tab.Screen
        name="ParentHome"
        component={ParentHomeScreen}
        options={{ title: "Home", tabBarIcon: ({ color, size }) => <House color={color} size={size} />, tabBarButtonTestID: "tab-home" }}
      />
      <Tab.Screen
        name="ParentCalendar"
        component={ParentCalendarScreen}
        options={{ title: "Calendar", tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />, tabBarButtonTestID: "tab-calendar" }}
      />
      <Tab.Screen
        name="ParentAlerts"
        component={ParentAlertsScreen}
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
          tabBarBadge: unread ? (unread > 99 ? "99+" : unread) : undefined,
          tabBarButtonTestID: "tab-alerts",
        }}
      />
      <Tab.Screen
        name="ParentMore"
        component={ParentMoreNavigator}
        options={{ title: "More", tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} />, tabBarButtonTestID: "tab-more" }}
      />
      <Tab.Screen
        name="ParentAccount"
        component={ParentAccountScreen}
        options={{ title: "Account", tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />, tabBarButtonTestID: "tab-account" }}
      />
    </Tab.Navigator>
  );
}

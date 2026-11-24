import React, { useEffect } from "react";
import { Platform, Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { House, IndianRupee, Bell, LayoutGrid, Megaphone } from "lucide-react-native";

import { palette } from "@shared/designSystem";
import ParentHomeScreen from "@modules/parent/screens/ParentHomeScreen";
import ParentFeesScreen from "@modules/parent/screens/ParentFeesScreen";
import ParentAlertsScreen from "@modules/parent/screens/ParentAlertsScreen";
import ParentMoreNavigator from "@modules/parent/ParentMoreNavigator";
import ParentNoticesScreen from "@modules/parent/screens/ParentNoticesScreen";
import { useInbox, useKeepChildSelected, useParentSettings } from "@modules/parent/hooks/useParent";
import { registerForPush } from "@modules/parent/pushRegistration";

const Tab = createBottomTabNavigator();

/**
 * The parent app: Home, Fees, Alerts, More and Notice board, the same on a
 * phone and in a browser. "More" holds the calendar, profile, results,
 * documents, leave and the account. Fees, and More's sections, show only
 * when the owner allows them.
 */
export default function ParentNavigator() {
  const unread = useInbox().data?.unread ?? 0;
  // a section the owner closed has no tab
  const feesOn = useParentSettings().data?.sections.fees !== false;
  // no header on these tabs, so keep each page clear of the phone's status bar
  const { top } = useSafeAreaInsets();
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
        sceneStyle: { backgroundColor: palette.surface.secondary, paddingTop: top },
      }}
    >
      <Tab.Screen
        name="ParentHome"
        component={ParentHomeScreen}
        options={{ title: "Home", tabBarIcon: ({ color, size }) => <House color={color} size={size} />, tabBarButtonTestID: "tab-home" }}
      />
      {feesOn ? (
        <Tab.Screen
          name="ParentFees"
          component={ParentFeesScreen}
          options={{ title: "Fees", tabBarIcon: ({ color, size }) => <IndianRupee color={color} size={size} />, tabBarButtonTestID: "tab-fees" }}
        />
      ) : null}
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
        name="ParentNotices"
        component={ParentNoticesScreen}
        options={{
          title: "Notice Board",
          // the longest label: shrinks to fit a narrow phone instead of "Notice Bo…"
          tabBarLabel: ({ color }) => (
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color, fontFamily: "Inter_500Medium", fontSize: 11 }}>
              Notice Board
            </Text>
          ),
          tabBarIcon: ({ color, size }) => <Megaphone color={color} size={size} />,
          tabBarButtonTestID: "tab-notices",
        }}
      />
    </Tab.Navigator>
  );
}

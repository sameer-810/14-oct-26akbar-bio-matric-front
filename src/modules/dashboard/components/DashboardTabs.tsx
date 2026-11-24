import React from "react";
import { useNavigation } from "@react-navigation/native";
import { ChipsRow } from "@shared/ui";
import { useVisibleNavItems } from "@navigation/navItems";

const TABS = [
  { key: "Dashboard", label: "Dashboard" },
  { key: "Reports", label: "Reports" },
];

/**
 * Dashboard | Reports, at the top of both pages. Each tab is its own route,
 * so links, permissions and the sidebar keep working; a tab the person may
 * not open is left out, and with fewer than two there is nothing to show.
 */
export function DashboardTabs({ active }: { active: "Dashboard" | "Reports" }) {
  const nav = useNavigation<{ navigate: (name: string) => void }>();
  const visible = useVisibleNavItems();
  const tabs = TABS.filter((t) => visible.some((it) => it.name === t.key));
  if (tabs.length < 2) return null;
  return <ChipsRow chips={tabs} active={active} onChange={(key) => key !== active && nav.navigate(key)} />;
}

import React, { useEffect, useState } from "react";
import {
  Animated,
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  type PressableStateCallbackType,
} from "react-native";
import { webAria } from "@shared/ui/a11y";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LogOut,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
} from "lucide-react-native";
import { useAuthStore } from "@shared/store/useAuthStore";
import { palette, radius, layout } from "@shared/designSystem";
import { Text, VStack, HStack, Avatar, BrandMark } from "@shared/ui";
import {
  type NavItem,
  type NavSection,
  type NavFolder,
  SECTION_ICON,
  SECTION_ORDER,
  SECTION_FOLDER,
  FOLDER_ICON,
  FLAT_SECTIONS,
  TOP_LEVEL,
  useVisibleNavItems,
} from "./navItems";
import { useUnreadInbox } from "@modules/notifications/hooks/useInbox";

/** What can be opened in the sidebar: a section, or a folder of sections. */
type Group = NavSection | NavFolder;

interface Props {
  activeRoute: string;
  onNavigate: (name: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  activeRoute,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: Props) {
  const insets = useSafeAreaInsets();
  const name = useAuthStore((s) => s.staff?.name ?? "");
  const roleLabel = useAuthStore((s) => s.staff?.roleLabel ?? "");
  const logout = useAuthStore((s) => s.logout);
  const allowed = useVisibleNavItems();
  const shownAs = (it: NavItem) => (it.sidebarAs && allowed.some((x) => x.name === it.sidebarAs) ? it.sidebarAs : it.name);
  // a page opened from a tab (Reports) has no row of its own: its tab's page is highlighted
  const items = allowed.filter((it) => shownAs(it) === it.name);
  const current = allowed.find((it) => it.name === activeRoute);
  const activeName = current ? shownAs(current) : activeRoute;
  const activeSection = items.find((it) => it.name === activeName)?.section;
  const activeFolder = activeSection ? SECTION_FOLDER[activeSection] : undefined;
  // the section holding the current page, and its folder (Settings), if any
  const pathTo = (section?: NavSection): Group[] => {
    if (!section) return [];
    const folder = SECTION_FOLDER[section];
    return folder ? [folder, section] : [section];
  };
  const [open, setOpen] = useState<Group[]>(pathTo(activeSection));

  // arriving on a page from anywhere shows the group it belongs to
  const [shownSection, setShownSection] = useState(activeSection);
  if (activeSection !== shownSection) {
    setShownSection(activeSection);
    const missing = pathTo(activeSection).filter((g) => !open.includes(g));
    if (missing.length) setOpen([...open, ...missing]);
  }

  const toggle = (group: Group) =>
    setOpen((o) => (o.includes(group) ? o.filter((s) => s !== group) : [...o, group]));

  const itemsOf = (section: NavSection) => items.filter((it) => it.section === section);
  const rows = (section: NavSection, depth: 0 | 1 | 2) =>
    itemsOf(section).map((item) => (
      <NavRow
        key={item.name}
        item={item}
        active={activeName === item.name}
        collapsed={collapsed}
        depth={depth}
        onPress={() => onNavigate(item.name)}
      />
    ));

  /** One section's dropdown: its header row and, when open, its pages. */
  const sectionBlock = (section: NavSection, nested: boolean) => {
    const group = itemsOf(section);
    if (group.length === 0) return null;
    // no dropdown: the pages themselves are top-level rows
    if (FLAT_SECTIONS.includes(section) && !nested) {
      return (
        <View key={section}>
          {collapsed ? <View style={styles.sectionDivider} /> : null}
          {rows(section, 0)}
        </View>
      );
    }
    const expanded = open.includes(section);
    return (
      <View key={section}>
        {collapsed ? (
          <View style={styles.sectionDivider} />
        ) : (
          <SectionRow
            label={section}
            icon={SECTION_ICON[section]}
            active={section === activeSection}
            nested={nested}
            expanded={expanded}
            hasInbox={group.some((it) => it.name === "Inbox")}
            onPress={() => toggle(section)}
          />
        )}
        {collapsed || expanded ? rows(section, nested ? 2 : 1) : null}
      </View>
    );
  };

  /** A folder (Settings): its header row and, when open, each of its sections' dropdowns. */
  const folderBlock = (folder: NavFolder) => {
    const sections = SECTION_ORDER.filter((sec) => SECTION_FOLDER[sec] === folder && itemsOf(sec).length);
    if (sections.length === 0) return null;
    // a collapsed sidebar shows only icons, so the sections are laid out flat as before
    if (collapsed) return sections.map((sec) => sectionBlock(sec, false));
    const expanded = open.includes(folder);
    return (
      <View key={folder}>
        <SectionRow
          label={folder}
          icon={FOLDER_ICON[folder]}
          active={folder === activeFolder}
          nested={false}
          expanded={expanded}
          hasInbox={sections.some((sec) => itemsOf(sec).some((it) => it.name === "Inbox"))}
          onPress={() => toggle(folder)}
          testID={`nav-folder-${folder}`}
        />
        {expanded ? sections.map((sec) => sectionBlock(sec, true)) : null}
      </View>
    );
  };

  return (
    <View
      role="navigation"
      accessibilityLabel="Main navigation"
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 18,
          width: collapsed ? layout.sidebarCollapsedWidth : layout.sidebarWidth,
        },
      ]}
    >
      <HStack
        gap={10}
        align="center"
        style={{
          paddingHorizontal: collapsed ? 0 : 18,
          justifyContent: collapsed ? "center" : "flex-start",
          marginBottom: 18,
        }}
      >
        <BrandMark size={44} />
        {!collapsed ? (
          <>
            <VStack gap={1} flex={1}>
              <Text variant="h3" tone="primary" numberOfLines={1}>
                Akbar&apos;s Academy
              </Text>
              <Text variant="caption" tone="tertiary" numberOfLines={1}>
                Cheeta Camp
              </Text>
            </VStack>
            {onToggleCollapse ? (
              <Pressable
                onPress={onToggleCollapse}
                hitSlop={8}
                style={styles.toggleBtn}
                accessibilityRole="button"
                accessibilityLabel="Collapse sidebar"
              >
                <ChevronsLeft
                  size={18}
                  color={palette.text.tertiary}
                  strokeWidth={2}
                />
              </Pressable>
            ) : null}
          </>
        ) : null}
      </HStack>

      {collapsed && onToggleCollapse ? (
        <Pressable
          onPress={onToggleCollapse}
          hitSlop={8}
          style={styles.expandBtn}
          accessibilityRole="button"
          accessibilityLabel="Expand sidebar"
        >
          <ChevronsRight
            size={18}
            color={palette.text.tertiary}
            strokeWidth={2}
          />
        </Pressable>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: collapsed ? 10 : 12 }}
        showsVerticalScrollIndicator={false}
      >
        {TOP_LEVEL.map((entry) =>
          (SECTION_ORDER as string[]).includes(entry) ? sectionBlock(entry as NavSection, false) : folderBlock(entry as NavFolder),
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 12,
            paddingHorizontal: collapsed ? 0 : 14,
            alignItems: collapsed ? "center" : "stretch",
          },
        ]}
      >
        {collapsed ? (
          <VStack gap={10} align="center">
            <Avatar name={name || "U"} size={34} />
            <Pressable
              onPress={() => logout()}
              hitSlop={8}
              style={styles.logoutBtn}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <LogOut
                size={17}
                color={palette.text.tertiary}
                strokeWidth={1.9}
              />
            </Pressable>
          </VStack>
        ) : (
          <HStack gap={10} align="center">
            <Avatar name={name || "U"} size={36} />
            <VStack gap={1} flex={1}>
              <Text variant="label" tone="primary" numberOfLines={1}>
                {name}
              </Text>
              <Text variant="caption" tone="tertiary" numberOfLines={1}>
                {roleLabel}
              </Text>
            </VStack>
            <Pressable
              onPress={() => logout()}
              hitSlop={8}
              style={styles.logoutBtn}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <LogOut
                size={17}
                color={palette.text.tertiary}
                strokeWidth={1.9}
              />
            </Pressable>
          </HStack>
        )}
      </View>
    </View>
  );
}

/** RN's typings leave out the hovered state react-native-web passes. */
const isHot = (state: PressableStateCallbackType) =>
  state.pressed || (state as { hovered?: boolean }).hovered;

/** A dropdown header: a top-level section, the Settings folder, or (nested) a section inside it. */
function SectionRow({
  label,
  icon: Icon,
  active,
  nested,
  expanded,
  hasInbox,
  onPress,
  testID,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  nested: boolean;
  expanded: boolean;
  hasInbox: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const color = active ? palette.primary[700] : palette.text.secondary;
  const [turn] = useState(() => new Animated.Value(expanded ? 1 : 0));
  useEffect(() => {
    Animated.timing(turn, {
      toValue: expanded ? 1 : 0,
      duration: 160,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [expanded, turn]);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded }}
      {...webAria({ expanded })}
      testID={testID ?? `nav-section-${label}`}
      style={(state) => [
        styles.navRow,
        styles.sectionRow,
        nested && styles.childRow,
        // inside Settings only the folder row is tinted; the section shows in colour alone
        active && !nested && styles.navRowActive,
        isHot(state) && !active ? { backgroundColor: palette.ink[50] } : null,
      ]}
    >
      <Icon size={18} color={active ? palette.primary[700] : palette.text.tertiary} strokeWidth={active ? 2.3 : 1.9} />
      <Text variant="label-lg" numberOfLines={1} style={{ color, flex: 1 }}>
        {label}
      </Text>
      {hasInbox && !expanded ? <UnreadBadge /> : null}
      <Animated.View style={{ transform: [{ rotate }] }}>
        <ChevronDown size={16} color={active ? palette.primary[700] : palette.text.tertiary} strokeWidth={2} />
      </Animated.View>
    </Pressable>
  );
}

function NavRow({
  item,
  active,
  collapsed,
  depth = 1,
  onPress,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  /** 0 for a top-level link (Dashboard), 2 for a page inside a section inside Settings */
  depth?: 0 | 1 | 2;
  onPress: () => void;
}) {
  const Icon = item.icon;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={item.label}
      // native reads "selected"; web uses aria-current instead (aria-selected is invalid on a link).
      accessibilityState={
        Platform.OS === "web" ? undefined : { selected: active }
      }
      {...webAria({ current: active ? "page" : undefined })}
      style={(state) => [
        styles.navRow,
        collapsed ? styles.navRowCollapsed : depth === 0 ? styles.sectionRow : depth === 2 ? styles.grandchildRow : styles.childRow,
        active && (collapsed || depth === 0 ? styles.navRowActive : styles.childRowActive),
        isHot(state) && !active ? { backgroundColor: palette.ink[50] } : null,
      ]}
    >
      {active && !collapsed && depth !== 0 ? <View style={styles.activeBar} /> : null}
      <Icon
        size={18}
        color={active ? palette.primary[700] : palette.text.tertiary}
        strokeWidth={active ? 2.3 : 1.9}
      />
      {!collapsed ? (
        <Text
          variant={depth === 0 ? "label-lg" : "label"}
          numberOfLines={1}
          style={{
            color: active ? palette.primary[700] : palette.text.secondary,
          }}
        >
          {item.label}
        </Text>
      ) : null}
      {item.name === "Inbox" ? <UnreadBadge /> : null}
    </Pressable>
  );
}

/** Unread notes on the sidebar's Notifications row. */
function UnreadBadge() {
  const n = useUnreadInbox().data?.unread ?? 0;
  if (!n) return null;
  return (
    <View style={styles.unread} accessibilityLabel={`${n} unread`}>
      <Text variant="caption" style={{ color: "#fff", fontSize: 11, lineHeight: 14 }}>
        {n > 99 ? "99+" : String(n)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  unread: {
    marginLeft: "auto",
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "#A82418",
    alignItems: "center",
    justifyContent: "center",
  },
  wrap: {
    flexShrink: 0,
    height: "100%",
    backgroundColor: palette.surface.primary,
    borderRightWidth: 1,
    borderRightColor: palette.border.default,
  },
  toggleBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  expandBtn: {
    alignSelf: "center",
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: palette.ink[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: layout.navRowHeight,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    marginBottom: 1,
  },
  navRowCollapsed: { justifyContent: "center", paddingHorizontal: 0, gap: 0 },
  navRowActive: { backgroundColor: palette.primary[50] },
  sectionRow: { marginTop: 4 },
  childRow: { marginLeft: 18 },
  grandchildRow: { marginLeft: 36 },
  childRowActive: { backgroundColor: palette.ink[50] },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 7,
    bottom: 7,
    width: 3,
    borderRadius: 2,
    backgroundColor: palette.primary[700],
  },
  sectionDivider: {
    height: 1,
    backgroundColor: palette.border.subtle,
    marginVertical: 6,
    marginHorizontal: 4,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border.default,
  },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});

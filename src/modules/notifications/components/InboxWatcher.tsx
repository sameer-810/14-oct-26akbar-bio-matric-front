import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Bell } from "lucide-react-native";
import { Text, VStack, HStack } from "@shared/ui";
import { palette, radius } from "@shared/designSystem";
import { useUnreadInbox, type InboxNote } from "../hooks/useInbox";

/**
 * A pop-up for each note that arrives while the app is open. What was
 * already unread at sign-in only shows on the badge, so opening the app
 * after a weekend does not fire a burst of pop-ups.
 */
export function InboxWatcher({ onOpen }: { onOpen?: () => void }) {
  const unread = useUnreadInbox();
  const seen = useRef<Set<string> | null>(null);
  const [toast, setToast] = useState<InboxNote | null>(null);

  useEffect(() => {
    const items = unread.data?.items;
    if (!items) return;
    if (!seen.current) {
      seen.current = new Set(items.map((n) => n.id));
      return;
    }
    const fresh = items.filter((n) => !seen.current?.has(n.id));
    for (const n of fresh) seen.current.add(n.id);
    if (fresh.length) setToast(fresh[0]);
  }, [unread.data]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;
  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <Pressable
        onPress={() => {
          setToast(null);
          onOpen?.();
        }}
        accessibilityRole="alert"
        accessibilityLabel={`${toast.title}. ${toast.body}`}
        style={styles.toast}
        testID="inbox-toast"
      >
        <HStack gap={10} align="flex-start">
          <Bell size={18} color={palette.primary[700]} strokeWidth={2} />
          <VStack gap={2} flex={1}>
            <Text variant="label-lg">{toast.title}</Text>
            <Text variant="body-sm" tone="secondary" numberOfLines={3}>
              {toast.body}
            </Text>
          </VStack>
        </HStack>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", top: 12, right: 12, left: 12, alignItems: "flex-end", zIndex: 1000 },
  toast: {
    maxWidth: 380,
    width: "100%",
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: palette.surface.primary,
    borderWidth: 1,
    borderColor: palette.border.default,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});

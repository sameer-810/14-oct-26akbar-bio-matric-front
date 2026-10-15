import React from "react";
import { View, StyleSheet } from "react-native";
import { Megaphone, Pin } from "lucide-react-native";

import { Screen, Card, VStack, HStack, Text, Skeleton, ErrorState, EmptyState, useBreakpoint } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { formatDay, formatRelative } from "@shared/format";
import { useFamilyNotices } from "../hooks/useParent";

/** The academy's notice board, for everyone or for this family's batches. */
export default function ParentNoticesScreen() {
  const { isWide } = useBreakpoint();
  const notices = useFamilyNotices();

  return (
    <Screen title="Notice board" onRefresh={() => void notices.refetch()} refreshing={notices.isRefetching} testID="parent-notices">
      <View style={[styles.wrap, isWide && styles.wrapWide]}>
        <VStack gap={12}>
          {notices.isLoading ? <Skeleton height={120} /> : null}
          {notices.error ? <ErrorState error={notices.error} onRetry={() => void notices.refetch()} /> : null}
          {notices.data?.length === 0 ? <EmptyState icon={Megaphone} title="No notices" /> : null}
          {(notices.data ?? []).map((n) => (
            <Card key={n.id} accentColor={n.pinned ? palette.primary[600] : undefined} testID={`parent-notice-${n.title}`}>
              <VStack gap={6}>
                <HStack gap={8} align="center">
                  {n.pinned ? <Pin size={14} color={palette.primary[600]} /> : null}
                  <Text variant="h3" style={{ flex: 1 }}>
                    {n.title}
                  </Text>
                  <Text variant="caption" tone="tertiary">
                    {formatRelative(n.createdAt)}
                  </Text>
                </HStack>
                {n.body ? <Text variant="body-sm">{n.body}</Text> : null}
                {n.expiresOn ? (
                  <Text variant="caption" tone="tertiary">
                    Until {formatDay(n.expiresOn)}
                  </Text>
                ) : null}
              </VStack>
            </Card>
          ))}
        </VStack>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignSelf: "center" },
  wrapWide: { maxWidth: 640 },
});

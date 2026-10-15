import React from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Fingerprint } from "lucide-react-native";

import { Screen, VStack, HStack, Card, Text, StatusChip, Banner, Skeleton, ErrorState, EmptyState, useBreakpoint } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { formatTime, formatDay } from "@shared/format";
import { useBoard } from "../hooks/useAttendance";
import { CountsRow } from "../components/CountsRow";
import type { BoardPunch } from "../types";

const to12h = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};

/**
 * Today at the gate: every batch's count, and punches as the machine sends
 * them. Refreshes every few seconds; nothing here needs a click.
 */
export default function LiveBoardScreen() {
  const { isWide } = useBreakpoint();
  const nav = useNavigation<{ navigate: (name: string, params?: object) => void }>();
  const board = useBoard();
  const b = board.data;
  const meeting = (b?.batches ?? []).filter((x) => x.meetsToday && x.total > 0);

  return (
    <Screen title="Today" subtitle={b ? formatDay(b.date) : undefined} testID="board-screen">
      <VStack gap={16}>
        {board.isLoading ? <Skeleton height={160} /> : null}
        {board.error ? <ErrorState error={board.error} onRetry={() => void board.refetch()} /> : null}
        {b && b.unknownToday > 0 ? (
          <Banner
            tone="warning"
            title={`${b.unknownToday} punch${b.unknownToday === 1 ? "" : "es"} from an ID nobody has`}
            message="Someone is enrolled on the machine but not admitted here — often a returning student. Admit them with the same GR and the punches attach themselves."
          />
        ) : null}

        <View style={[styles.layout, isWide && styles.layoutWide]}>
          <VStack gap={12} style={isWide ? { flex: 3 } : undefined}>
            {b && meeting.length === 0 ? <EmptyState title="No batch meets today" message="A holiday, or nobody is admitted yet." /> : null}
            {meeting.map((x) => (
              <Card key={x.batchId} onPress={() => nav.navigate("Registers", { batchId: x.batchId })} testID={`board-${x.name}`}>
                <VStack gap={10}>
                  <HStack gap={8} align="center" wrap>
                    <Text variant="h3" style={{ flex: 1 }}>
                      {x.name}
                    </Text>
                    <Text variant="body-sm" tone="secondary">
                      {to12h(x.startTime)} – {to12h(x.endTime)} · {x.total} students
                    </Text>
                  </HStack>
                  <CountsRow counts={x.counts} notYet={x.notYet} />
                </VStack>
              </Card>
            ))}
          </VStack>

          <Card style={isWide ? { flex: 2 } : undefined}>
            <VStack gap={4}>
              <HStack gap={8} align="center">
                <Fingerprint size={18} color={palette.primary[600]} />
                <Text variant="h3">Latest punches</Text>
              </HStack>
              {b && b.recentPunches.length === 0 ? <Text tone="tertiary">Nothing yet today.</Text> : null}
              {(b?.recentPunches ?? []).map((p) => (
                <PunchLine key={p.id} p={p} />
              ))}
            </VStack>
          </Card>
        </View>
      </VStack>
    </Screen>
  );
}

function PunchLine({ p }: { p: BoardPunch }) {
  return (
    <HStack gap={8} align="center" style={styles.punch} testID="board-punch">
      <Text variant="body-sm" tabular style={{ width: 70 }}>
        {formatTime(p.at)}
      </Text>
      <Text variant="body-sm" style={{ flex: 1 }} numberOfLines={1} tone={p.personType === "unknown" ? "warning" : "primary"}>
        {p.name ?? `Unknown ID ${p.biometricId}`}
        {p.grNumber ? ` · ${p.grNumber}` : ""}
        {p.personType === "teacher" ? " (faculty)" : ""}
      </Text>
      {p.kind ? <StatusChip status={p.kind} size="sm" /> : null}
      {p.stale ? (
        <Text variant="caption" tone="tertiary">
          late upload
        </Text>
      ) : null}
    </HStack>
  );
}

const styles = StyleSheet.create({
  layout: { gap: 16 },
  layoutWide: { flexDirection: "row", alignItems: "flex-start" },
  punch: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: palette.border.subtle },
});

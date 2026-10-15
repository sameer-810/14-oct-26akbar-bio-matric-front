import React from "react";
import { View, StyleSheet } from "react-native";
import { IndianRupee } from "lucide-react-native";

import { Screen, Card, VStack, HStack, Text, StatTile, StatusChip, SectionHeader, Skeleton, ErrorState, EmptyState, useBreakpoint } from "@shared/ui";
import { formatDay, formatPaise } from "@shared/format";
import { useSelectedChild, useChildFees } from "../hooks/useParent";
import { ChildPicker } from "../components/ChildPicker";

const MODES: Record<string, string> = { cash: "Cash", upi: "UPI", card: "Card", cheque: "Cheque", bank_transfer: "Bank transfer" };

/** This year's fees: what is still due and by when, and every receipt — the old "outstanding fees" section. */
export default function ParentFeesScreen() {
  const { isWide } = useBreakpoint();
  const { child } = useSelectedChild();
  const fees = useChildFees(child?.id);
  const f = fees.data;

  return (
    <Screen title="Fees" subtitle={child?.name} testID="parent-fees">
      <View style={[styles.wrap, isWide && styles.wrapWide]}>
        <VStack gap={12}>
          <ChildPicker />
          {fees.isLoading ? <Skeleton height={140} /> : null}
          {fees.error ? <ErrorState error={fees.error} onRetry={() => void fees.refetch()} /> : null}
          {fees.data === null ? <EmptyState icon={IndianRupee} title="Fees not set up yet" message="Please ask the office." /> : null}
          {f ? (
            <>
              <View style={[styles.tiles, isWide && styles.tilesWide]}>
                <StatTile label="Still to pay" value={formatPaise(f.summary.balance)} attention={f.summary.overdue > 0} testID="parent-fees-balance" />
                <StatTile label="Paid" value={formatPaise(f.summary.paid)} sublabel={`of ${formatPaise(f.summary.net)}`} />
              </View>
              {f.summary.overdue > 0 ? (
                <Card>
                  <Text tone="danger" testID="parent-fees-overdue">
                    {formatPaise(f.summary.overdue)} is overdue. Please pay at the office.
                  </Text>
                </Card>
              ) : f.summary.nextDue ? (
                <Card>
                  <Text>
                    Next: {formatPaise(f.summary.nextDue.amount)} by {formatDay(f.summary.nextDue.dueDate)}
                  </Text>
                </Card>
              ) : null}
              <Card>
                <VStack gap={8}>
                  <SectionHeader title="Instalments" />
                  {f.summary.schedule.map((i) => (
                    <HStack key={`${i.label}-${i.dueDate}`} gap={8} align="center">
                      <VStack gap={2} flex={1}>
                        <Text variant="body-sm">{i.label}</Text>
                        <Text variant="caption" tone={i.overdue ? "danger" : "tertiary"}>
                          Due {formatDay(i.dueDate)}
                        </Text>
                      </VStack>
                      <Text variant="body-sm" tabular>
                        {formatPaise(i.amount)}
                      </Text>
                      <StatusChip status={i.overdue ? "overdue" : i.status === "part_paid" ? "part paid" : i.status} size="sm" />
                    </HStack>
                  ))}
                </VStack>
              </Card>
              <Card>
                <VStack gap={8}>
                  <SectionHeader title="Receipts" />
                  {f.receipts.length === 0 ? <Text tone="tertiary">None yet.</Text> : null}
                  {f.receipts.map((r) => (
                    <HStack key={r.id} gap={8} align="center" testID={`parent-receipt-${r.number}`}>
                      <VStack gap={2} flex={1}>
                        <Text variant="body-sm">{r.number}</Text>
                        <Text variant="caption" tone="tertiary">
                          {formatDay(r.date)} · {MODES[r.mode] ?? r.mode}
                          {r.cheque ? ` · cheque ${r.cheque.status}` : ""}
                        </Text>
                      </VStack>
                      <Text variant="body-sm" tabular>
                        {formatPaise(r.amount)}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </Card>
            </>
          ) : null}
        </VStack>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignSelf: "center" },
  wrapWide: { maxWidth: 640 },
  tiles: { gap: 12 },
  tilesWide: { flexDirection: "row" },
});

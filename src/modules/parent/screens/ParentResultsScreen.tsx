import React from "react";
import { View, StyleSheet } from "react-native";
import { Award } from "lucide-react-native";

import { Screen, Card, VStack, HStack, Text, StatusChip, Skeleton, ErrorState, EmptyState, useBreakpoint } from "@shared/ui";
import { formatDay } from "@shared/format";
import { useSelectedChild, useResults } from "../hooks/useParent";
import { ChildPicker } from "../components/ChildPicker";

const fmt = (n: number | null) => (n === null ? "—" : Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Each published test: the mark, where it stands in the class, and the class's own numbers. */
export default function ParentResultsScreen() {
  const { isWide } = useBreakpoint();
  const { child } = useSelectedChild();
  const results = useResults(child?.id);

  return (
    <Screen title="Test results" subtitle={child?.name} testID="parent-results">
      <View style={[styles.wrap, isWide && styles.wrapWide]}>
        <VStack gap={12}>
          <ChildPicker />
          {results.isLoading ? <Skeleton height={140} /> : null}
          {results.error ? <ErrorState error={results.error} onRetry={() => void results.refetch()} /> : null}
          {results.data?.length === 0 ? <EmptyState icon={Award} title="No results yet" message="Marks appear here when the academy publishes them." /> : null}
          {(results.data ?? []).map((r) => {
            const passed = !r.absent && r.marks !== null && r.marks >= r.passingMarks;
            return (
              <Card key={r.examId} testID={`result-${r.name}`}>
                <VStack gap={8}>
                  <HStack gap={8} align="center">
                    <VStack gap={2} flex={1}>
                      <Text variant="h3">
                        {r.name}
                        {r.subject ? ` · ${r.subject}` : ""}
                      </Text>
                      <Text variant="caption" tone="tertiary">
                        {formatDay(r.date)}
                      </Text>
                    </VStack>
                    {r.absent ? <StatusChip status="absent" size="sm" /> : null}
                  </HStack>
                  {r.absent ? (
                    <Text tone="secondary">Absent for this test.</Text>
                  ) : (
                    <HStack gap={16} align="center" wrap>
                      <Text variant="metric" tone={passed ? "primary" : "danger"} testID="result-marks">
                        {fmt(r.marks)}/{r.maxMarks}
                      </Text>
                      <VStack gap={2}>
                        <Text variant="body-sm">
                          {fmt(r.percent)}%{r.rank ? ` · rank ${r.rank} of ${r.outOf}` : ""}
                        </Text>
                        <Text variant="caption" tone="tertiary">
                          Class average {fmt(r.average)} · highest {fmt(r.highest)}
                        </Text>
                      </VStack>
                    </HStack>
                  )}
                  {r.remark ? <Text variant="body-sm">Remark from the teacher: {r.remark}</Text> : null}
                </VStack>
              </Card>
            );
          })}
        </VStack>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignSelf: "center" },
  wrapWide: { maxWidth: 640 },
});

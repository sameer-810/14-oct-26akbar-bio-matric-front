import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Wallet } from "lucide-react-native";

import { Screen, VStack, HStack, Text, Button, DataTable, ErrorState, Banner, StatTile, type Column } from "@shared/ui";
import { academyToday, formatMonth, formatRupees, shiftMonth } from "@shared/format";
import { usePayrollReport } from "../hooks/usePayroll";
import { PAY_KIND_LABELS, type PayrollRow } from "../types";

/**
 * The old "Faculty Salary" report — all ₹0 there, because nothing fed it.
 * Here every number comes from the lectures each teacher took, so it is
 * never re-calculated by hand: confirm a lecture and the row changes.
 */
export default function SalaryReportScreen() {
  const nav = useNavigation<{ navigate: (name: string, params?: object) => void }>();
  const [month, setMonth] = useState(academyToday().slice(0, 7));
  const report = usePayrollReport(month);
  const rows = report.data ?? [];
  const total = rows.reduce((n, r) => n + r.amount, 0);
  const toConfirm = rows.reduce((n, r) => n + r.counts.toConfirm, 0);
  const unpriced = rows.filter((r) => r.unpriced).length;

  const columns: Column<PayrollRow>[] = [
    {
      key: "name",
      header: "Teacher",
      flex: 2,
      render: (r) => (
        <VStack gap={2}>
          <Text variant="label">{r.name}</Text>
          <Text variant="caption" tone="tertiary">
            {r.rate ? `${PAY_KIND_LABELS[r.rate.kind]} · ${formatRupees(r.rate.rate)}` : "No rate"}
          </Text>
        </VStack>
      ),
    },
    {
      key: "lectures",
      header: "Lectures",
      flex: 2,
      render: (r) => (
        <Text variant="body-sm">
          {r.counts.conducted} taken{r.counts.toConfirm ? ` · ${r.counts.toConfirm} to confirm` : ""}
          {r.counts.cancelled ? ` · ${r.counts.cancelled} cancelled` : ""}
        </Text>
      ),
    },
    { key: "days", header: "Days in", flex: 1, render: (r) => <Text variant="body-sm">{r.daysAtAcademy}</Text> },
    {
      key: "amount",
      header: "Amount",
      flex: 1,
      render: (r) => (
        <Text variant="label" tabular tone={r.unpriced ? "warning" : "primary"}>
          {formatRupees(r.amount)}
        </Text>
      ),
    },
  ];

  return (
    <Screen
      title="Faculty salary"
      subtitle={formatMonth(month)}
      right={
        <HStack gap={8}>
          <Button label="‹ Previous" size="sm" variant="ghost" onPress={() => setMonth(shiftMonth(month, -1))} />
          <Button label="Next ›" size="sm" variant="ghost" onPress={() => setMonth(shiftMonth(month, 1))} disabled={month >= academyToday().slice(0, 7)} />
        </HStack>
      }
      testID="salary-screen"
    >
      <VStack gap={12}>
        <HStack gap={12} wrap>
          <StatTile label="Total for the month" value={formatRupees(total)} icon={Wallet} testID="salary-total" />
          <StatTile label="Lectures to confirm" value={toConfirm} attention={toConfirm > 0} />
          <StatTile label="Teachers with no rate" value={unpriced} attention={unpriced > 0} />
        </HStack>
        {toConfirm ? (
          <Banner tone="info" message="Lectures to confirm are not counted until the office says they were taken — open the teacher, or Lectures." />
        ) : null}
        {report.error ? <ErrorState error={report.error} onRetry={() => void report.refetch()} /> : null}
        <DataTable
          columns={columns}
          rows={rows}
          keyExtractor={(r) => r.teacherId}
          onRowPress={(r) => nav.navigate("Faculty", { screen: "TeacherDetail", params: { id: r.teacherId } })}
          emptyIcon={Wallet}
          emptyTitle={report.isLoading ? "Loading…" : "No faculty"}
          testID="salary-table"
        />
      </VStack>
    </Screen>
  );
}

import React, { useState } from "react";
import { Fingerprint } from "lucide-react-native";
import { Screen, VStack, HStack, Text, Button, DataTable, ChipsRow, TextField, StatusChip, ErrorState, SearchInput, Select, type Column } from "@shared/ui";
import { useFilters } from "@shared/useFilters";
import { academyToday, formatTime, formatDateTime } from "@shared/format";
import { usePunches } from "../hooks/useAttendance";
import type { PunchRow } from "../types";

/**
 * Every punch exactly as it arrived — the old system's "Biometric" report.
 * "Unknown" shows the IDs nobody here has yet: usually a student enrolled on
 * the machine but not admitted.
 */
export default function PunchesScreen() {
  const [date, setDate] = useState(academyToday());
  const { filters, set, reset, isFiltered } = useFilters("punches", { who: "all", search: "", kind: "", source: "" });
  const { who } = filters;
  const punches = usePunches({ date, personType: who === "all" ? undefined : who });
  const needle = filters.search.trim().toLowerCase();
  // one day's punches are a few hundred rows at most: filtered here, not on the server
  const rows = (punches.data ?? []).filter(
    (p) =>
      (!needle || `${p.name ?? ""} ${p.grNumber ?? ""} ${p.biometricId}`.toLowerCase().includes(needle)) &&
      (!filters.kind || (filters.kind === "none" ? !p.kind : p.kind === filters.kind)) &&
      (!filters.source || (filters.source === "manual" ? p.source === "manual" : p.source !== "manual")),
  );

  const columns: Column<PunchRow>[] = [
    { key: "at", header: "Time", width: 90, render: (p) => <Text variant="body-sm" tabular>{formatTime(p.at)}</Text> },
    { key: "id", header: "Fingerprint ID", width: 120, render: (p) => <Text variant="body-sm" tabular>{p.biometricId}</Text> },
    {
      key: "who",
      header: "Person",
      flex: 2,
      render: (p) => (
        <Text variant="body-sm" tone={p.personType === "unknown" ? "warning" : "primary"}>
          {p.name ?? "Nobody with this ID"}
          {p.grNumber ? ` · GR ${p.grNumber}` : ""}
          {p.personType === "teacher" ? " (faculty)" : ""}
        </Text>
      ),
    },
    { key: "kind", header: "Counted as", width: 110, render: (p) => (p.kind ? <StatusChip status={p.kind} size="sm" /> : <Text variant="caption" tone="tertiary">—</Text>) },
    {
      key: "src",
      header: "From",
      flex: 1,
      render: (p) => (
        <Text variant="caption" tone="tertiary">
          {p.source === "manual" ? `entered by hand — ${p.reason}` : p.deviceSerial}
          {p.stale ? ` · arrived ${formatDateTime(p.receivedAt)}` : ""}
          {p.clockSuspect ? " · machine clock looked wrong" : ""}
        </Text>
      ),
    },
  ];

  return (
    <Screen title="Punches" subtitle="Straight from the fingerprint machines" testID="punches-screen">
      <VStack gap={12}>
        <HStack gap={12} align="center" wrap>
          <TextField value={date} onChangeText={(t) => /^\d{4}-\d{2}-\d{2}$/.test(t) && setDate(t)} accessibilityLabel="Date" containerStyle={{ width: 150 }} />
          <ChipsRow
            chips={[
              { key: "all", label: "Everyone" },
              { key: "student", label: "Students" },
              { key: "teacher", label: "Faculty" },
              { key: "unknown", label: "Unknown IDs" },
            ]}
            active={who}
            onChange={(k) => set({ who: k })}
          />
        </HStack>
        <HStack gap={12} align="center" wrap>
          <SearchInput
            value={filters.search}
            onChangeText={(v) => set({ search: v })}
            placeholder="Name, GR or fingerprint ID"
            style={{ flex: 2, minWidth: 220 }}
            testID="punches-search"
          />
          <HStack style={{ flex: 1, minWidth: 160 }}>
            <Select
              value={filters.kind || null}
              options={[
                { value: "", label: "Counted as: any" },
                { value: "entry", label: "IN" },
                { value: "exit", label: "OUT" },
                { value: "between", label: "Between" },
                { value: "duplicate", label: "Repeat" },
                { value: "ignored", label: "Ignored" },
                { value: "none", label: "Not counted" },
              ]}
              onChange={(v) => set({ kind: v })}
              placeholder="Counted as: any"
            />
          </HStack>
          <HStack style={{ flex: 1, minWidth: 160 }}>
            <Select
              value={filters.source || null}
              options={[
                { value: "", label: "Any source" },
                { value: "device", label: "Fingerprint machine" },
                { value: "manual", label: "Entered by hand" },
              ]}
              onChange={(v) => set({ source: v })}
              placeholder="Any source"
            />
          </HStack>
          {isFiltered ? <Button label="Clear filters" variant="ghost" size="sm" onPress={reset} /> : null}
        </HStack>
        {punches.error ? <ErrorState error={punches.error} onRetry={() => void punches.refetch()} /> : null}
        <DataTable
          columns={columns}
          rows={rows}
          keyExtractor={(p) => p.id}
          emptyIcon={Fingerprint}
          emptyTitle={punches.isLoading ? "Loading…" : isFiltered ? "No punch matches these filters" : "No punches"}
          testID="punches-table"
        />
      </VStack>
    </Screen>
  );
}

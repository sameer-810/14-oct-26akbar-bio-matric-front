import React, { useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react-native";

import { Screen, Card, VStack, HStack, Text, Button, TextField, Select, Banner, ErrorState, Skeleton, SectionHeader } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { academyToday, addDaysTo, formatMonth, shiftMonth } from "@shared/format";
import { canPrint, printHtml } from "@shared/print/printHtml";
import { useBatches, useStandards, useSettings } from "@modules/academy/hooks/useAcademy";
import { useReport } from "../hooks/useReports";
import { ReportTable } from "../components/ReportTable";
import { exportFileName, idCardsHtml, reportHtml, toCsv, totalsText } from "../export";
import { REPORT_CHOICES, ENQUIRY_REPORTS, FEE_REPORTS, EXPENSE_REPORTS, type PunchPersonType, type Report, type ReportKey, type ReportParams, type ReportRun } from "../types";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

const PERSON_OPTIONS = [
  { value: "", label: "Everyone" },
  { value: "student", label: "Students" },
  { value: "teacher", label: "Faculty" },
  { value: "unknown", label: "Unknown IDs" },
];

/** Hand the browser a CSV file to save. Web only; the buttons are hidden elsewhere. */
function downloadCsv(name: string, csv: string) {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * The old system's reports in one place: pick one, set its range, run it,
 * then take it to Excel or print it (a PDF is "Save as PDF" in the print
 * dialog). Each report shows only to those who may see what it is about:
 * salary to pay, enquiries to enquiries, fees to fees, expenses to expenses.
 */
export default function ReportsScreen() {
  const canReports = useAuthStore((s) => s.hasPermission(PERMISSIONS.REPORTS_VIEW));
  const canPay = useAuthStore((s) => s.hasPermission(PERMISSIONS.PAYROLL_VIEW) || s.hasPermission(PERMISSIONS.PAYROLL_MANAGE));
  const canEnquiries = useAuthStore((s) => s.hasPermission(PERMISSIONS.ENQUIRIES_MANAGE));
  const canFees = useAuthStore((s) => s.hasPermission(PERMISSIONS.FEES_VIEW) || s.hasPermission(PERMISSIONS.FEES_COLLECT) || s.hasPermission(PERMISSIONS.FEES_MANAGE));
  const canExpenses = useAuthStore((s) => s.hasPermission(PERMISSIONS.EXPENSES_MANAGE));
  const allowed = (key: ReportKey) =>
    key === "salary"
      ? canPay
      : ENQUIRY_REPORTS.includes(key)
        ? canEnquiries
        : FEE_REPORTS.includes(key)
          ? canFees
          : EXPENSE_REPORTS.includes(key)
            ? canExpenses
            : canReports;
  const choices = REPORT_CHOICES.filter((c) => allowed(c.key));

  const [choice, setChoice] = useState<ReportKey>(() => choices[0]?.key ?? "admissions");
  const [to, setTo] = useState(() => academyToday());
  const [from, setFrom] = useState(() => addDaysTo(academyToday(), -29));
  const [thisMonth] = useState(() => academyToday().slice(0, 7));
  const [month, setMonth] = useState(thisMonth);
  const [batchId, setBatchId] = useState("");
  const [standardId, setStandardId] = useState("");
  const [personType, setPersonType] = useState("");
  const [biometricId, setBiometricId] = useState("");
  const [ran, setRan] = useState<ReportRun | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const batches = useBatches();
  const standards = useStandards();
  const settings = useSettings();
  const report = useReport(ran);
  const current = choices.find((c) => c.key === choice) ?? choices[0];
  const needs = current?.needs ?? {};

  function pick(key: ReportKey) {
    setChoice(key);
    setRan(null);
    setProblem(null);
  }

  function run() {
    setProblem(null);
    if (!current) return;
    if (needs.batch && !batchId) return setProblem("Choose a batch first.");
    if (needs.range && (!YMD.test(from) || !YMD.test(to))) return setProblem("Write the dates as YYYY-MM-DD, for example 2026-10-01.");
    if (needs.range && to < from) return setProblem("The range ends before it starts.");
    const params: ReportParams = needs.month
      ? { month }
      : {
          batchId: needs.batch || (needs.anyBatch && batchId) ? batchId : undefined,
          from: needs.range ? from : undefined,
          to: needs.range ? to : undefined,
          standardId: needs.standard && standardId ? standardId : undefined,
          personType: needs.punches && personType ? (personType as PunchPersonType) : undefined,
          biometricId: needs.punches && biometricId.trim() ? biometricId.trim() : undefined,
        };
    const next: ReportRun = { key: current.key, params };
    // the same report again means "fetch it fresh", not "nothing changed"
    if (ran && JSON.stringify(ran) === JSON.stringify(next)) void report.refetch();
    else setRan(next);
  }

  const result: Report | undefined = ran ? report.data : undefined;
  const academyName = settings.data?.name ?? "";

  function exportCsv(r: Report) {
    downloadCsv(exportFileName(r, academyToday(), "csv"), toCsv(r));
  }

  function print(r: Report) {
    const html = ran?.key === "idcards" ? idCardsHtml(r, academyName) : reportHtml(r, academyName, academyToday());
    if (!printHtml(html)) setProblem("Printing is not available here.");
  }

  return (
    <Screen title="Reports" subtitle="Pick a report, set its range and run it — then take it to Excel or print it." testID="reports-screen">
      <VStack gap={16}>
        <HStack gap={10} wrap role="radiogroup">
          {choices.map((c) => (
            <Card
              key={c.key}
              compact
              onPress={() => pick(c.key)}
              accentColor={c.key === choice ? palette.primary[600] : undefined}
              style={[{ minWidth: 200, flexGrow: 1, flexBasis: 200 }, c.key === choice ? { borderColor: palette.primary[600] } : null]}
              accessibilityLabel={`${c.label}${c.key === choice ? ", selected" : ""}`}
              testID={`report-${c.key}`}
            >
              <VStack gap={2}>
                <Text variant="label" weight="600">
                  {c.label}
                </Text>
                <Text variant="caption" tone="tertiary">
                  {c.description}
                </Text>
              </VStack>
            </Card>
          ))}
        </HStack>

        {current ? (
          <Card>
            <VStack gap={12}>
              <SectionHeader title={current.label} subtitle={current.description} />
              <HStack gap={12} wrap align="flex-end">
                {needs.batch ? (
                  <VStack style={{ minWidth: 220, flex: 1 }}>
                    <Select
                      label="Batch"
                      value={batchId || null}
                      options={(batches.data ?? []).filter((b) => b.isActive).map((b) => ({ value: b.id, label: b.name }))}
                      onChange={setBatchId}
                      placeholder={batches.isLoading ? "Loading batches…" : "Choose a batch"}
                    />
                  </VStack>
                ) : null}
                {needs.anyBatch ? (
                  <VStack style={{ minWidth: 220, flex: 1 }} testID="report-any-batch">
                    <Select
                      label="Batch"
                      value={batchId}
                      options={[{ value: "", label: "All batches" }, ...(batches.data ?? []).filter((b) => b.isActive).map((b) => ({ value: b.id, label: b.name }))]}
                      onChange={setBatchId}
                      placeholder="All batches"
                    />
                  </VStack>
                ) : null}
                {needs.standard ? (
                  <VStack style={{ minWidth: 200, flex: 1 }}>
                    <Select
                      label="Standard"
                      value={standardId}
                      options={[{ value: "", label: "All standards" }, ...(standards.data ?? []).filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name }))]}
                      onChange={setStandardId}
                      placeholder="All standards"
                    />
                  </VStack>
                ) : null}
                {needs.range ? (
                  <>
                    <TextField label="From" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" containerStyle={{ width: 150 }} testID="report-from" />
                    <TextField label="To" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" containerStyle={{ width: 150 }} testID="report-to" />
                  </>
                ) : null}
                {needs.punches ? (
                  <>
                    <VStack style={{ minWidth: 180 }}>
                      <Select label="Who" value={personType} options={PERSON_OPTIONS} onChange={setPersonType} placeholder="Everyone" />
                    </VStack>
                    <TextField
                      label="Fingerprint ID"
                      value={biometricId}
                      onChangeText={setBiometricId}
                      placeholder="Any"
                      autoCapitalize="characters"
                      containerStyle={{ width: 150 }}
                      testID="report-biometric-id"
                    />
                  </>
                ) : null}
                {needs.month ? (
                  <HStack gap={8} align="center">
                    <Button label="‹" size="sm" variant="ghost" fullWidth={false} onPress={() => setMonth(shiftMonth(month, -1))} accessibilityHint="Previous month" />
                    <Text variant="h3" style={{ minWidth: 150 }} center>
                      {formatMonth(month)}
                    </Text>
                    <Button
                      label="›"
                      size="sm"
                      variant="ghost"
                      fullWidth={false}
                      onPress={() => setMonth(shiftMonth(month, 1))}
                      disabled={month >= thisMonth}
                      accessibilityHint="Next month"
                    />
                  </HStack>
                ) : null}
              </HStack>
              {problem ? <Banner tone="warning" message={problem} onDismiss={() => setProblem(null)} /> : null}
              <HStack>
                <Button label="Run" onPress={run} loading={report.isFetching} fullWidth={false} testID="report-run" />
              </HStack>
            </VStack>
          </Card>
        ) : (
          <Banner tone="info" message="You do not have access to any reports." />
        )}

        {ran && report.isLoading ? <Skeleton height={200} /> : null}
        {ran && report.error ? (
          <ErrorState error={report.error} title="The report could not be run" onRetry={() => void report.refetch()} />
        ) : null}

        {result ? (
          <VStack gap={10}>
            <SectionHeader
              title={result.title}
              subtitle={result.subtitle}
              right={
                canPrint ? (
                  <HStack gap={8}>
                    <Button
                      label="Excel"
                      size="sm"
                      variant="secondary"
                      fullWidth={false}
                      icon={<FileSpreadsheet size={16} color={palette.text.primary} />}
                      onPress={() => exportCsv(result)}
                      testID="report-excel"
                    />
                    <Button
                      label="Print / PDF"
                      size="sm"
                      variant="secondary"
                      fullWidth={false}
                      icon={<Printer size={16} color={palette.text.primary} />}
                      onPress={() => print(result)}
                      testID="report-print"
                    />
                  </HStack>
                ) : undefined
              }
            />
            {!canPrint ? <Banner tone="info" message="Excel and printing are on the computer — open Reports there to export this." /> : null}
            <Text variant="label" testID="report-totals">
              {totalsText(result) || `${result.rows.length} row(s)`}
            </Text>
            <ReportTable report={result} testID="report-table" />
          </VStack>
        ) : null}
      </VStack>
    </Screen>
  );
}

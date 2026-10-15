import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Wallet, Receipt as ReceiptIcon, FileText } from "lucide-react-native";

import {
  Screen,
  Card,
  VStack,
  HStack,
  Text,
  Button,
  Banner,
  Select,
  TextField,
  ToggleRow,
  DataTable,
  StatusChip,
  Skeleton,
  ErrorState,
  EmptyState,
  type Column,
} from "@shared/ui";
import { palette } from "@shared/designSystem";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { apiErrorMessage } from "@api/apiClient";
import { academyToday, formatDay, formatPaise } from "@shared/format";
import { useBatches, useStandards, useYears } from "@modules/academy/hooks/useAcademy";
import { useFeeActions, useFeePlans, useOutstanding, useReceipts } from "../hooks/useFees";
import { FeeTabs } from "../components/FeeTabs";
import { PlanForm } from "../components/PlanForm";
import { ReceiptActions, type FeeMessage } from "../components/ReceiptActions";
import { isDay, sumPaise } from "../money";
import { MODE_LABELS, MODE_OPTIONS, PAYMENT_MODES, modeText, receiptCounts, type FeePlan, type OutstandingRow, type PaymentMode, type Receipt } from "../types";

type Tab = "outstanding" | "daybook" | "cheques" | "plans";
type Nav = { navigate: (name: string, params?: object) => void };

/**
 * Fees across the academy: who still owes (and how late), the day's
 * collections by mode, cheques waiting on the bank, and — for those who
 * manage fees — the fee plan of each standard.
 */
export default function FeesScreen() {
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.FEES_MANAGE));
  const [tab, setTab] = useState<Tab>("outstanding");

  const tabs = [
    { key: "outstanding", label: "Outstanding", testID: "fees-tab-outstanding" },
    { key: "daybook", label: "Day book", testID: "fees-tab-daybook" },
    { key: "cheques", label: "Cheques", testID: "fees-tab-cheques" },
    ...(canManage ? [{ key: "plans", label: "Fee plans", testID: "fees-tab-plans" }] : []),
  ];

  return (
    <Screen title="Fees" subtitle="Collections, dues and cheques" testID="fees-screen">
      <VStack gap={12}>
        <FeeTabs tabs={tabs} active={tab} onChange={(k) => setTab(k as Tab)} />
        {tab === "outstanding" ? <OutstandingTab /> : null}
        {tab === "daybook" ? <DayBookTab /> : null}
        {tab === "cheques" ? <ChequesTab /> : null}
        {tab === "plans" && canManage ? <PlansTab /> : null}
      </VStack>
    </Screen>
  );
}

// ---- outstanding ----

function OutstandingTab() {
  const nav = useNavigation<Nav>();
  const [batchId, setBatchId] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const years = useYears();
  const current = years.data?.find((y) => y.isCurrent);
  const batches = useBatches(current ? { academicYearId: current.id } : {});
  const list = useOutstanding({ batchId: batchId || undefined, overdueOnly });
  const rows = list.data ?? [];
  const total = {
    net: sumPaise(rows.map((r) => ({ amount: r.net }))),
    paid: sumPaise(rows.map((r) => ({ amount: r.paid }))),
    balance: sumPaise(rows.map((r) => ({ amount: r.balance }))),
    overdue: sumPaise(rows.map((r) => ({ amount: r.overdue }))),
  };
  const open = (r: OutstandingRow) => nav.navigate("Students", { screen: "StudentDetail", params: { id: r.studentId } });

  const money = (key: "net" | "paid" | "balance", header: string): Column<OutstandingRow> => ({
    key,
    header,
    flex: 1,
    align: "right",
    sortable: true,
    sortValue: (r) => r[key],
    render: (r) => (
      <Text variant="body-sm" tabular>
        {formatPaise(r[key])}
      </Text>
    ),
  });

  const columns: Column<OutstandingRow>[] = [
    { key: "name", header: "Student", flex: 2, sortable: true, sortValue: (r) => r.name, render: (r) => <Text variant="label">{r.name}</Text> },
    { key: "gr", header: "GR", flex: 1, render: (r) => <Text variant="body-sm" tabular>{r.grNumber}</Text> },
    { key: "batch", header: "Batch", flex: 1, render: (r) => <Text variant="body-sm">{r.batchName || "—"}</Text> },
    { key: "phone", header: "Phone", flex: 1, render: (r) => <Text variant="body-sm" selectable>{r.phone || "—"}</Text> },
    money("net", "Net"),
    money("paid", "Paid"),
    money("balance", "Balance"),
    {
      key: "overdue",
      header: "Overdue",
      flex: 1,
      align: "right",
      sortable: true,
      sortValue: (r) => r.overdue,
      render: (r) => (
        <Text variant="body-sm" tabular weight={r.overdue ? "600" : "400"} tone={r.overdue ? "danger" : "tertiary"}>
          {formatPaise(r.overdue)}
        </Text>
      ),
    },
    {
      key: "next",
      header: "Next due",
      flex: 1,
      render: (r) => (
        <Text variant="caption" tone="secondary">
          {r.nextDue ? `${formatPaise(r.nextDue.amount)} · ${formatDay(r.nextDue.dueDate)}` : "—"}
        </Text>
      ),
    },
  ];

  return (
    <VStack gap={12}>
      <HStack gap={12} wrap align="center">
        <View style={{ minWidth: 220, flex: 1 }} testID="fees-outstanding-batch">
          <Select
            value={batchId || null}
            options={[{ value: "", label: "All batches" }, ...(batches.data ?? []).filter((b) => b.isActive).map((b) => ({ value: b.id, label: b.name }))]}
            onChange={setBatchId}
            placeholder="All batches"
          />
        </View>
        <View style={{ minWidth: 200 }}>
          <ToggleRow label="Overdue only" value={overdueOnly} onChange={setOverdueOnly} testID="fees-overdue-only" />
        </View>
      </HStack>
      {list.data ? (
        <Text variant="label" tabular testID="fees-outstanding-total">
          {rows.length} student{rows.length === 1 ? "" : "s"} · net {formatPaise(total.net)} · paid {formatPaise(total.paid)} · balance {formatPaise(total.balance)} · overdue{" "}
          {formatPaise(total.overdue)}
        </Text>
      ) : null}
      {list.isLoading ? <Skeleton height={200} /> : null}
      {list.error ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
      {list.data ? (
        <DataTable
          columns={columns}
          rows={rows}
          keyExtractor={(r) => r.studentId}
          onRowPress={open}
          rowAccent={(r) => (r.overdue ? palette.danger.text : undefined)}
          emptyIcon={Wallet}
          emptyTitle={overdueOnly ? "Nothing overdue" : "Nobody owes anything"}
          mobileCard={(r) => (
            <Card onPress={() => open(r)} compact accentColor={r.overdue ? palette.danger.text : undefined}>
              <VStack gap={4}>
                <HStack gap={8} justify="space-between" align="center">
                  <Text variant="label" style={{ flex: 1 }}>
                    {r.name}
                  </Text>
                  <Text variant="label" tabular>
                    {formatPaise(r.balance)}
                  </Text>
                </HStack>
                <Text variant="caption" tone="tertiary">
                  GR {r.grNumber}
                  {r.batchName ? ` · ${r.batchName}` : ""}
                  {r.phone ? ` · ${r.phone}` : ""}
                </Text>
                <Text variant="caption" tone={r.overdue ? "danger" : "secondary"}>
                  {r.overdue ? `${formatPaise(r.overdue)} overdue` : r.nextDue ? `Next ${formatPaise(r.nextDue.amount)} on ${formatDay(r.nextDue.dueDate)}` : `Paid ${formatPaise(r.paid)} of ${formatPaise(r.net)}`}
                </Text>
              </VStack>
            </Card>
          )}
          testID="fees-outstanding-table"
        />
      ) : null}
    </VStack>
  );
}

// ---- day book ----

/** What a receipt is in the day book: counted, or why not. */
const receiptState = (r: Receipt) => (r.cancelled ? "cancelled" : r.cheque?.status === "bounced" ? "bounced" : r.cheque ? r.cheque.status : null);

function DayBookTab() {
  const [today] = useState(() => academyToday());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [mode, setMode] = useState("");
  const [msg, setMsg] = useState<FeeMessage | null>(null);
  const rangeOk = isDay(from) && isDay(to) && from <= to;
  const list = useReceipts({ from, to, mode: (mode || undefined) as PaymentMode | undefined }, { enabled: rangeOk });
  const rows = list.data ?? [];
  const counted = rows.filter(receiptCounts);
  const byMode = PAYMENT_MODES.map((m) => ({ mode: m, amount: sumPaise(counted.filter((r) => r.mode === m)) })).filter((x) => x.amount > 0);
  const total = sumPaise(counted);

  const columns: Column<Receipt>[] = [
    { key: "date", header: "Date", flex: 1, render: (r) => <Text variant="body-sm">{formatDay(r.date)}</Text> },
    {
      key: "number",
      header: "Receipt",
      flex: 1,
      render: (r) => (
        <Text variant="body-sm" tabular tone={r.cancelled ? "disabled" : "primary"} style={receiptCounts(r) ? undefined : styles.struck}>
          {r.number}
        </Text>
      ),
    },
    {
      key: "student",
      header: "Student",
      flex: 2,
      render: (r) => (
        <VStack gap={1}>
          <Text variant="body-sm">{r.student?.name ?? "—"}</Text>
          {r.student ? (
            <Text variant="caption" tone="tertiary">
              GR {r.student.grNumber}
            </Text>
          ) : null}
        </VStack>
      ),
    },
    {
      key: "mode",
      header: "Mode",
      flex: 2,
      render: (r) => (
        <HStack gap={6} align="center" wrap>
          <Text variant="body-sm">{modeText(r)}</Text>
          {receiptState(r) ? <StatusChip status={receiptState(r) as string} size="sm" /> : null}
        </HStack>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      flex: 1,
      align: "right",
      render: (r) => (
        <Text variant="label" tabular tone={receiptCounts(r) ? "primary" : "disabled"} style={receiptCounts(r) ? undefined : styles.struck}>
          {formatPaise(r.amount)}
        </Text>
      ),
    },
    { key: "actions", header: "", flex: 2, render: (r) => <ReceiptActions receipt={r} onDone={setMsg} /> },
  ];

  return (
    <VStack gap={12}>
      <HStack gap={10} wrap align="flex-start">
        <TextField label="From" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" error={isDay(from) ? undefined : "YYYY-MM-DD"} containerStyle={styles.dateField} testID="fees-daybook-from" />
        <TextField
          label="To"
          value={to}
          onChangeText={setTo}
          placeholder="YYYY-MM-DD"
          error={!isDay(to) ? "YYYY-MM-DD" : isDay(from) && from > to ? "Before the start" : undefined}
          containerStyle={styles.dateField}
          testID="fees-daybook-to"
        />
        <View style={{ minWidth: 180, flex: 1 }} testID="fees-daybook-mode">
          <Select label="Mode" value={mode || null} options={[{ value: "", label: "All modes" }, ...MODE_OPTIONS]} onChange={setMode} placeholder="All modes" />
        </View>
      </HStack>
      {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
      {list.data && rangeOk ? (
        <Card compact testID="fees-daybook-total">
          <VStack gap={4}>
            <Text variant="label" tabular>
              Collected {formatPaise(total)} · {counted.length} receipt{counted.length === 1 ? "" : "s"}
            </Text>
            {byMode.length ? (
              <Text variant="body-sm" tone="secondary" tabular>
                {byMode.map((x) => `${MODE_LABELS[x.mode]} ${formatPaise(x.amount)}`).join(" · ")}
              </Text>
            ) : null}
            {rows.length > counted.length ? (
              <Text variant="caption" tone="tertiary">
                {rows.length - counted.length} cancelled or bounced not counted
              </Text>
            ) : null}
          </VStack>
        </Card>
      ) : null}
      {rangeOk && list.isLoading ? <Skeleton height={200} /> : null}
      {list.error ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
      {list.data && rangeOk ? (
        <DataTable
          columns={columns}
          rows={rows}
          keyExtractor={(r) => r.id}
          emptyIcon={ReceiptIcon}
          emptyTitle="No receipts in this period"
          mobileCard={(r) => (
            <Card compact>
              <VStack gap={6}>
                <HStack gap={8} justify="space-between" align="center">
                  <Text variant="label" style={[{ flex: 1 }, receiptCounts(r) ? undefined : styles.struck]}>
                    {r.number} · {r.student?.name ?? "—"}
                  </Text>
                  <Text variant="label" tabular style={receiptCounts(r) ? undefined : styles.struck}>
                    {formatPaise(r.amount)}
                  </Text>
                </HStack>
                <HStack gap={6} align="center" wrap>
                  <Text variant="caption" tone="tertiary">
                    {formatDay(r.date)} · {modeText(r)}
                  </Text>
                  {receiptState(r) ? <StatusChip status={receiptState(r) as string} size="sm" /> : null}
                </HStack>
                <ReceiptActions receipt={r} onDone={setMsg} />
              </VStack>
            </Card>
          )}
        />
      ) : null}
    </VStack>
  );
}

// ---- cheques ----

/** Any cheque still with the bank, however old. */
const ALL_TIME = "2000-01-01";

function ChequesTab() {
  const [today] = useState(() => academyToday());
  const [msg, setMsg] = useState<FeeMessage | null>(null);
  const pending = useReceipts({ from: ALL_TIME, to: today, chequeStatus: "pending" });
  const deposited = useReceipts({ from: ALL_TIME, to: today, chequeStatus: "deposited" });
  const rows = [...(pending.data ?? []), ...(deposited.data ?? [])].filter((r) => !r.cancelled);
  const loading = pending.isLoading || deposited.isLoading;
  const error = pending.error ?? deposited.error;

  return (
    <VStack gap={12}>
      <Text variant="body-sm" tone="secondary">
        Cheques taken but not yet cleared — pending first, then those deposited. They count as paid until marked bounced.
      </Text>
      {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
      {loading ? <Skeleton height={160} /> : null}
      {error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            void pending.refetch();
            void deposited.refetch();
          }}
        />
      ) : null}
      {!loading && !error && rows.length === 0 ? <EmptyState icon={ReceiptIcon} title="No cheques waiting" /> : null}
      {rows.length ? (
        <Text variant="label" tabular testID="fees-cheques-total">
          {rows.length} cheque{rows.length === 1 ? "" : "s"} · {formatPaise(sumPaise(rows))}
        </Text>
      ) : null}
      {rows.map((r) => (
        <Card key={r.id} compact testID={`fees-cheque-row-${r.number}`}>
          <VStack gap={8}>
            <HStack gap={8} align="center" wrap>
              <VStack gap={1} style={{ flex: 1, minWidth: 180 }}>
                <Text variant="label">
                  {r.student?.name ?? "—"}
                  {r.student ? ` · GR ${r.student.grNumber}` : ""}
                </Text>
                <Text variant="caption" tone="tertiary">
                  {r.number} · {formatDay(r.date)} · {modeText(r)}
                  {r.cheque?.date ? ` · dated ${formatDay(r.cheque.date)}` : ""}
                  {r.cheque?.depositedOn ? ` · deposited ${formatDay(r.cheque.depositedOn)}` : ""}
                </Text>
              </VStack>
              {r.cheque ? <StatusChip status={r.cheque.status} size="sm" /> : null}
              <Text variant="label" tabular>
                {formatPaise(r.amount)}
              </Text>
            </HStack>
            <ReceiptActions receipt={r} onDone={setMsg} allowCancel={false} />
          </VStack>
        </Card>
      ))}
    </VStack>
  );
}

// ---- fee plans ----

function PlansTab() {
  const years = useYears();
  const standards = useStandards();
  const act = useFeeActions();
  const [yearId, setYearId] = useState("");
  const [standardId, setStandardId] = useState("");
  const [editing, setEditing] = useState<FeePlan | "new" | null>(null);
  const [msg, setMsg] = useState<FeeMessage | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [today] = useState(() => academyToday());

  const year = years.data?.find((y) => y.id === yearId) ?? years.data?.find((y) => y.isCurrent) ?? years.data?.[0];
  const plans = useFeePlans({ academicYearId: year?.id, standardId: standardId || undefined }, { enabled: Boolean(year) });
  const standardName = (id: string) => standards.data?.find((s) => s.id === id)?.name ?? "—";

  const apply = async (p: FeePlan) => {
    setMsg(null);
    setApplying(p.id);
    try {
      const r = await act.applyPlan.mutateAsync(p.id);
      setMsg({ tone: "success", text: `${r.created} set up${r.alreadySetUp ? ` · ${r.alreadySetUp} already had fees` : ""}.` });
    } catch (err) {
      setMsg({ tone: "danger", text: apiErrorMessage(err) });
    } finally {
      setApplying(null);
    }
  };

  return (
    <VStack gap={12}>
      <HStack gap={12} wrap align="flex-end">
        <View style={{ minWidth: 180, flex: 1 }} testID="plan-year">
          <Select
            label="Academic year"
            value={year?.id ?? null}
            options={(years.data ?? []).map((y) => ({ value: y.id, label: y.label, sublabel: y.isCurrent ? "Current" : undefined }))}
            onChange={(v) => {
              setYearId(v);
              setEditing(null);
            }}
            placeholder="Choose a year"
          />
        </View>
        <View style={{ minWidth: 180, flex: 1 }} testID="plan-standard-filter">
          <Select
            label="Standard"
            value={standardId || null}
            options={[{ value: "", label: "All standards" }, ...(standards.data ?? []).map((s) => ({ value: s.id, label: s.name }))]}
            onChange={setStandardId}
            placeholder="All standards"
          />
        </View>
        {year && !editing ? <Button label="New plan" fullWidth={false} onPress={() => setEditing("new")} testID="plan-new" /> : null}
      </HStack>

      {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
      {!years.isLoading && !year ? <EmptyState icon={FileText} title="No academic year yet" message="Add one in Settings first." /> : null}

      {editing && year ? (
        <PlanForm
          key={editing === "new" ? "new" : editing.id}
          academicYearId={year.id}
          yearStart={year.startDate && isDay(year.startDate) ? year.startDate : today}
          plan={editing === "new" ? undefined : editing}
          onDone={(saved) => {
            setEditing(null);
            if (saved) setMsg({ tone: "success", text: `${saved.name} saved. It applies to fees set up from now on.` });
          }}
        />
      ) : null}

      {plans.isLoading ? <Skeleton height={160} /> : null}
      {plans.error ? <ErrorState error={plans.error} onRetry={() => void plans.refetch()} /> : null}
      {plans.data && plans.data.length === 0 ? (
        <EmptyState icon={FileText} title="No fee plans for this year" message="Create one per standard with New plan." />
      ) : null}
      {(plans.data ?? []).map((p) => {
        const gross = sumPaise(p.items);
        return (
          <Card key={p.id} compact testID={`plan-card-${p.name}`}>
            <VStack gap={8}>
              <HStack gap={8} align="center" wrap>
                <VStack gap={1} style={{ flex: 1, minWidth: 180 }}>
                  <Text variant="label">{p.name}</Text>
                  <Text variant="caption" tone="tertiary">
                    {standardName(p.standardId)} · minimum {formatPaise(p.minimumFee)}
                  </Text>
                </VStack>
                {!p.isActive ? <StatusChip status="inactive" size="sm" /> : null}
                <Text variant="label" tabular>
                  {formatPaise(gross)}
                </Text>
              </HStack>
              <Text variant="caption" tone="secondary">
                {p.items.map((i) => `${i.label} ${formatPaise(i.amount)}`).join(" · ")}
              </Text>
              {p.instalments.length ? (
                <Text variant="caption" tone="secondary">
                  {p.instalments.map((i) => `${i.label}: ${formatPaise(i.amount)} by ${formatDay(i.dueDate)}`).join(" · ")}
                </Text>
              ) : (
                <Text variant="caption" tone="tertiary">
                  No instalments — due in full on admission.
                </Text>
              )}
              <HStack gap={8} wrap>
                <Button label="Edit" size="sm" variant="secondary" fullWidth={false} onPress={() => setEditing(p)} testID={`plan-edit-${p.name}`} />
                <Button
                  label="Set up for all students"
                  size="sm"
                  variant="secondary"
                  fullWidth={false}
                  loading={applying === p.id}
                  disabled={!p.isActive || Boolean(applying)}
                  onPress={() => void apply(p)}
                  testID={`plan-apply-${p.name}`}
                />
              </HStack>
            </VStack>
          </Card>
        );
      })}
    </VStack>
  );
}

const styles = StyleSheet.create({
  struck: { textDecorationLine: "line-through" },
  dateField: { minWidth: 150, flex: 1 },
});

import React, { useState } from "react";
import { Receipt } from "lucide-react-native";

import { Screen, Card, VStack, HStack, Text, Button, TextField, ChipsRow, StatusChip, Banner, ConfirmDialog, EmptyState, ErrorState, Skeleton, ToggleRow } from "@shared/ui";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { academyToday, addDaysTo, formatDay, formatPaise, shiftMonth } from "@shared/format";
import { apiErrorMessage } from "@api/apiClient";
import { useExpenseActions, useExpenseList } from "../hooks/useExpenses";
import { ExpenseForm } from "../components/ExpenseForm";
import { MODE_LABELS, type Expense } from "../types";

const YMD = /^\d{4}-\d{2}-\d{2}$/;
/** The server returns at most this many; past it the totals would be short. */
const SERVER_LIMIT = 2000;

type RangeKey = "today" | "month" | "last";

/** The quick ranges, all ending no later than today. */
function rangeOf(key: RangeKey, today: string) {
  const month = today.slice(0, 7);
  if (key === "today") return { from: today, to: today };
  if (key === "month") return { from: `${month}-01`, to: today };
  return { from: `${shiftMonth(month, -1)}-01`, to: addDaysTo(`${month}-01`, -1) };
}

const RANGE_CHIPS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "month", label: "This month" },
  { key: "last", label: "Last month" },
];

/**
 * The old "Daily Expenses" page: what was spent, on what, and how it was
 * paid, each with its voucher number. Totals leave cancelled entries out,
 * so the figure here matches the dashboard's "spent".
 */
export default function ExpensesScreen() {
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.EXPENSES_MANAGE));
  const [today] = useState(() => academyToday());
  const [from, setFrom] = useState(() => `${academyToday().slice(0, 7)}-01`);
  const [to, setTo] = useState(() => academyToday());
  const [showCancelled, setShowCancelled] = useState(false);
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState<Expense | null>(null);
  const [cancelling, setCancelling] = useState<Expense | null>(null);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const validRange = YMD.test(from) && YMD.test(to) && from <= to;
  const list = useExpenseList({ from, to, includeCancelled: showCancelled }, { enabled: canManage && validRange });
  const { cancel } = useExpenseActions();

  const expenses = list.data ?? [];
  const counted = expenses.filter((e) => !e.cancelled);
  const total = counted.reduce((n, e) => n + e.amount, 0);
  const byCategory = new Map<string, number>();
  for (const e of counted) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  // "This month" first, so on the 1st (when it equals "Today") the month stays the one shown
  const activeRange = (["month", "today", "last"] as RangeKey[]).find((k) => {
    const r = rangeOf(k, today);
    return r.from === from && r.to === to;
  });

  function pickRange(key: RangeKey) {
    const r = rangeOf(key, today);
    setFrom(r.from);
    setTo(r.to);
  }

  function startCancel(e: Expense) {
    setCancelling(e);
    setReason("");
    setProblem(null);
  }

  function stopCancel() {
    setCancelling(null);
    setConfirming(false);
    setReason("");
  }

  function confirmCancel() {
    if (!cancelling) return;
    cancel.mutate(
      { id: cancelling.id, reason: reason.trim() },
      {
        onSuccess: stopCancel,
        onError: (err) => {
          setConfirming(false);
          setProblem(apiErrorMessage(err, "The expense could not be cancelled"));
        },
      },
    );
  }

  if (!canManage) {
    return (
      <Screen title="Daily expenses" testID="expenses-screen">
        <Banner tone="info" message="You do not have access to expenses." />
      </Screen>
    );
  }

  return (
    <Screen
      title="Daily expenses"
      subtitle={validRange ? (from === to ? formatDay(from) : `${formatDay(from)} – ${formatDay(to)}`) : undefined}
      right={!adding ? <Button label="Add expense" onPress={() => setAdding(true)} fullWidth={false} testID="expense-new" /> : undefined}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      testID="expenses-screen"
    >
      <VStack gap={12}>
        {saved ? (
          <Banner
            tone="success"
            title={`Saved as ${saved.voucher}`}
            message={`${formatPaise(saved.amount)} for ${saved.category} on ${formatDay(saved.date)}${saved.date < from || saved.date > to ? " — outside the range shown" : ""}.`}
            onDismiss={() => setSaved(null)}
          />
        ) : null}

        {adding ? (
          <ExpenseForm
            onSaved={(e) => {
              setSaved(e);
              setAdding(false);
            }}
            onClose={() => setAdding(false)}
          />
        ) : null}

        <Card>
          <VStack gap={10}>
            <ChipsRow chips={RANGE_CHIPS} active={activeRange ?? ""} onChange={(k) => pickRange(k as RangeKey)} />
            <HStack gap={12} wrap align="flex-end">
              <TextField label="From" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" containerStyle={{ width: 150 }} testID="expense-from" />
              <TextField label="To" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" containerStyle={{ width: 150 }} testID="expense-to" />
              <VStack style={{ minWidth: 220, flex: 1 }}>
                <ToggleRow
                  label="Show cancelled"
                  hint="Cancelled entries are never counted"
                  value={showCancelled}
                  onChange={setShowCancelled}
                  testID="expense-show-cancelled"
                />
              </VStack>
            </HStack>
            {!validRange ? <Banner tone="warning" message="Write the dates as YYYY-MM-DD, with the range starting on or before it ends." /> : null}
          </VStack>
        </Card>

        {validRange && list.data ? (
          <Card>
            <VStack gap={8}>
              <HStack gap={8} align="baseline" wrap>
                <Text variant="label" tone="secondary">
                  Total spent
                </Text>
                <Text variant="metric-sm" testID="expense-total">
                  {formatPaise(total)}
                </Text>
                <Text variant="caption" tone="tertiary">
                  {counted.length} expense{counted.length === 1 ? "" : "s"}
                </Text>
              </HStack>
              {categories.length ? (
                <HStack gap={16} wrap testID="expense-by-category">
                  {categories.map(([name, amount]) => (
                    <Text key={name} variant="body-sm" tone="secondary">
                      {name}{" "}
                      <Text variant="body-sm" weight="600" tabular>
                        {formatPaise(amount)}
                      </Text>
                    </Text>
                  ))}
                </HStack>
              ) : null}
            </VStack>
          </Card>
        ) : null}

        {expenses.length >= SERVER_LIMIT ? (
          <Banner tone="warning" message={`Only the latest ${SERVER_LIMIT.toLocaleString("en-IN")} entries are shown, so the totals are short. Narrow the range.`} />
        ) : null}
        {problem ? <Banner tone="danger" message={problem} onDismiss={() => setProblem(null)} /> : null}

        {validRange && list.isLoading ? <Skeleton height={160} /> : null}
        {list.error ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
        {validRange && list.data && expenses.length === 0 ? (
          <EmptyState icon={Receipt} title="No expenses in this range" message="Add one as money is paid out, so the day's cash adds up." />
        ) : null}

        {expenses.map((e) => (
          <VStack key={e.id} gap={8}>
            <ExpenseRow expense={e} onCancel={() => startCancel(e)} cancelOpen={cancelling?.id === e.id} />
            {cancelling?.id === e.id ? (
              <Card>
                <VStack gap={10}>
                  <TextField
                    label={`Why cancel ${e.voucher}?`}
                    required
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Entered twice, wrong amount…"
                    maxLength={200}
                    hint="Kept with the entry for the audit trail."
                    testID="expense-cancel-reason"
                  />
                  <HStack gap={8}>
                    <Button
                      label="Cancel expense"
                      variant="destructive"
                      size="sm"
                      fullWidth={false}
                      disabled={reason.trim().length < 3}
                      onPress={() => setConfirming(true)}
                      testID="expense-cancel-go"
                    />
                    <Button label="Keep it" variant="ghost" size="sm" fullWidth={false} onPress={stopCancel} testID="expense-cancel-keep" />
                  </HStack>
                </VStack>
              </Card>
            ) : null}
          </VStack>
        ))}
      </VStack>

      <ConfirmDialog
        visible={confirming && cancelling !== null}
        title={cancelling ? `Cancel ${cancelling.voucher}?` : "Cancel expense?"}
        message={
          cancelling
            ? `${formatPaise(cancelling.amount)} for ${cancelling.category}${cancelling.vendor ? ` to ${cancelling.vendor}` : ""}. It stays in the list, greyed out with your reason, and no longer counts. This cannot be undone.`
            : undefined
        }
        confirmLabel="Cancel expense"
        cancelLabel="Keep it"
        destructive
        loading={cancel.isPending}
        onConfirm={confirmCancel}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}

/** One expense; a cancelled one is greyed, its amount struck through, its reason shown. */
function ExpenseRow({ expense: e, onCancel, cancelOpen }: { expense: Expense; onCancel: () => void; cancelOpen: boolean }) {
  return (
    <Card compact style={e.cancelled ? { opacity: 0.55 } : undefined} testID={`expense-row-${e.voucher}`}>
      <HStack gap={12} align="flex-start" justify="space-between" wrap>
        <VStack gap={3} style={{ flex: 1, minWidth: 220 }}>
          <HStack gap={8} align="center" wrap>
            <Text variant="label" weight="600">
              {e.voucher}
            </Text>
            <Text variant="caption" tone="tertiary">
              {formatDay(e.date)}
            </Text>
            {e.cancelled ? <StatusChip status="cancelled" size="sm" /> : null}
          </HStack>
          <Text variant="body">
            {e.category}
            {e.vendor ? ` — ${e.vendor}` : ""}
          </Text>
          {e.description ? (
            <Text variant="body-sm" tone="secondary">
              {e.description}
            </Text>
          ) : null}
          <Text variant="caption" tone="tertiary">
            {MODE_LABELS[e.mode] ?? e.mode}
            {e.reference ? ` · ${e.reference}` : ""}
          </Text>
          {e.cancelled ? (
            <Text variant="caption" tone="danger">
              Cancelled: {e.cancelReason || "no reason given"}
            </Text>
          ) : null}
        </VStack>
        <VStack gap={6} align="flex-end">
          <Text variant="body" weight="600" tabular style={e.cancelled ? { textDecorationLine: "line-through" } : undefined}>
            {formatPaise(e.amount)}
          </Text>
          {!e.cancelled && !cancelOpen ? (
            <Button label="Cancel" size="xs" variant="ghost" fullWidth={false} onPress={onCancel} testID={`expense-cancel-${e.voucher}`} />
          ) : null}
        </VStack>
      </HStack>
    </Card>
  );
}

import React, { useState } from "react";
import { View } from "react-native";
import { VStack, HStack, Text, Button, TextField, Select, Banner } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { academyToday, formatDay, formatPaise } from "@shared/format";
import { useFeeActions } from "../hooks/useFees";
import { isDay, paiseToInput, readRupees } from "../money";
import { MODE_OPTIONS, REFERENCE_LABELS, type CollectInput, type FeeSummary, type PaymentMode, type Receipt } from "../types";

interface Props {
  studentId: string;
  summary: FeeSummary;
  onCancel: () => void;
  onPaid: (receipt: Receipt) => void;
}

/** What the desk is most likely taking: what is overdue, else the next instalment, never more than the balance. */
function suggested(s: FeeSummary) {
  const n = s.overdue > 0 ? s.overdue : (s.nextDue?.amount ?? s.balance);
  return Math.min(n, s.balance);
}

/**
 * Take a payment. The amount is typed in rupees and sent as whole paise; the
 * server refuses more than the balance and a date too far back, and numbers
 * the receipt.
 */
export function PaymentForm({ studentId, summary, onCancel, onPaid }: Props) {
  const act = useFeeActions();
  const [amount, setAmount] = useState(() => (suggested(summary) > 0 ? paiseToInput(suggested(summary)) : ""));
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [reference, setReference] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [bank, setBank] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [date, setDate] = useState(() => academyToday());
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amt = readRupees(amount);
  const errors = {
    amount: amt.error ?? (amt.paise === 0 ? "Enter the amount" : amt.paise !== null && amt.paise > summary.balance ? `That is more than the ${formatPaise(summary.balance)} due` : undefined),
    reference: mode === "card" && reference.trim() && !/^\d{4}$/.test(reference.trim()) ? "The last four digits of the card" : undefined,
    chequeNo: mode === "cheque" && chequeNo.trim().length < 3 ? "The cheque number" : undefined,
    bank: mode === "cheque" && bank.trim().length < 2 ? "The bank's name" : undefined,
    chequeDate: mode === "cheque" && chequeDate.trim() && !isDay(chequeDate) ? "YYYY-MM-DD" : undefined,
    date: isDay(date) ? undefined : "YYYY-MM-DD",
  };
  const invalid = Object.values(errors).some(Boolean);
  const show = (e: string | undefined, value: string) => (tried || value.trim() ? e : undefined);
  const refLabel = REFERENCE_LABELS[mode];

  const save = async () => {
    setTried(true);
    setError(null);
    if (invalid || amt.paise === null) return;
    const body: CollectInput = { amount: amt.paise, date: date.trim(), mode };
    if (refLabel && reference.trim()) body.reference = reference.trim();
    if (mode === "cheque") body.cheque = { number: chequeNo.trim(), bank: bank.trim(), date: chequeDate.trim() || undefined };
    if (note.trim()) body.note = note.trim();
    try {
      onPaid(await act.collect.mutateAsync({ studentId, body }));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <VStack gap={10}>
      <Text variant="label">Take payment</Text>
      {summary.overdue > 0 ? (
        <Text variant="caption" tone="danger">
          {formatPaise(summary.overdue)} overdue
        </Text>
      ) : summary.nextDue ? (
        <Text variant="caption" tone="tertiary">
          Next: {summary.nextDue.label}, {formatPaise(summary.nextDue.amount)} on {formatDay(summary.nextDue.dueDate)}
        </Text>
      ) : null}
      {error ? <Banner tone="danger" message={error} onDismiss={() => setError(null)} /> : null}
      <HStack gap={10} wrap align="flex-start">
        <TextField
          label="Amount"
          prefix="₹"
          value={amount}
          onChangeText={setAmount}
          numericField
          required
          error={show(errors.amount, amount)}
          hint={`Balance ${formatPaise(summary.balance)}`}
          containerStyle={{ flex: 1, minWidth: 160 }}
          testID="fees-pay-amount"
        />
        <View style={{ flex: 1, minWidth: 160 }} testID="fees-pay-mode">
          <Select
            label="Mode"
            value={mode}
            options={MODE_OPTIONS}
            onChange={(v) => {
              setMode(v as PaymentMode);
              setReference("");
            }}
          />
        </View>
        <TextField
          label="Date"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          error={errors.date}
          hint="Today, or a few days back at most"
          containerStyle={{ flex: 1, minWidth: 140 }}
          testID="fees-pay-date"
        />
      </HStack>

      {refLabel ? (
        <TextField
          label={refLabel}
          value={reference}
          onChangeText={setReference}
          maxLength={mode === "card" ? 4 : 80}
          keyboardType={mode === "card" ? "number-pad" : undefined}
          error={show(errors.reference, reference)}
          testID="fees-pay-reference"
        />
      ) : null}

      {mode === "cheque" ? (
        <HStack gap={10} wrap align="flex-start">
          <TextField
            label="Cheque number"
            value={chequeNo}
            onChangeText={setChequeNo}
            maxLength={20}
            required
            error={tried ? errors.chequeNo : undefined}
            containerStyle={{ flex: 1, minWidth: 140 }}
            testID="fees-cheque-number"
          />
          <TextField
            label="Bank"
            value={bank}
            onChangeText={setBank}
            maxLength={60}
            required
            error={tried ? errors.bank : undefined}
            containerStyle={{ flex: 1, minWidth: 140 }}
            testID="fees-cheque-bank"
          />
          <TextField
            label="Cheque date"
            value={chequeDate}
            onChangeText={setChequeDate}
            placeholder="YYYY-MM-DD"
            error={show(errors.chequeDate, chequeDate)}
            containerStyle={{ flex: 1, minWidth: 140 }}
            testID="fees-cheque-date"
          />
        </HStack>
      ) : null}

      <TextField label="Note" value={note} onChangeText={setNote} placeholder="Optional" maxLength={200} testID="fees-pay-note" />

      <HStack gap={8}>
        <Button
          label={amt.paise ? `Take ${formatPaise(amt.paise)}` : "Take payment"}
          fullWidth={false}
          loading={act.collect.isPending}
          disabled={tried && invalid}
          onPress={() => void save()}
          testID="fees-pay-save"
        />
        <Button label="Close" variant="ghost" fullWidth={false} onPress={onCancel} />
      </HStack>
    </VStack>
  );
}

import React, { useState } from "react";
import { View } from "react-native";

import { Card, VStack, HStack, Text, Button, TextField, Select, Banner, SectionHeader } from "@shared/ui";
import { academyToday, addDaysTo, formatPaise, parseRupees } from "@shared/format";
import { apiErrorMessage } from "@api/apiClient";
import { useSettings } from "@modules/academy/hooks/useAcademy";
import { useExpenseActions, useExpenseCategories } from "../hooks/useExpenses";
import { MODE_LABELS, PAYMENT_MODES, type Expense, type PaymentMode } from "../types";

const YMD = /^\d{4}-\d{2}-\d{2}$/;
/** The server's ceiling: ₹1 crore in paise. */
const MAX_PAISE = 1_000_000_000;
const SUGGESTIONS = 8;

const MODE_OPTIONS = PAYMENT_MODES.map((m) => ({ value: m, label: MODE_LABELS[m] }));

const REFERENCE_HINT: Record<PaymentMode, string> = {
  cash: "Bill or receipt number, if any",
  upi: "UPI transaction ID",
  card: "Last four digits or slip number",
  cheque: "Cheque number and bank",
  bank_transfer: "Bank reference (UTR)",
};

type Errors = Partial<Record<"date" | "category" | "amount", string>>;

/**
 * One expense, entered the way the old "Daily Expenses" page did. Categories
 * already used are offered as you type, so "Electricity" does not also turn
 * up as "electric bill". The amount is read as rupees and sent as paise.
 */
export function ExpenseForm({ onSaved, onClose }: { onSaved: (e: Expense) => void; onClose: () => void }) {
  const [today] = useState(() => academyToday());
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState("");
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [reference, setReference] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [problem, setProblem] = useState<string | null>(null);

  const categories = useExpenseCategories();
  const settings = useSettings();
  const { create } = useExpenseActions();
  const backdateDays = settings.data?.fees?.backdateDays;

  const typed = category.trim().toLowerCase();
  const known = categories.data ?? [];
  const suggestions = known.filter((c) => c.toLowerCase() !== typed && (!typed || c.toLowerCase().includes(typed))).slice(0, SUGGESTIONS);
  const paise = parseRupees(amount);

  function save() {
    setProblem(null);
    const next: Errors = {};
    if (!YMD.test(date)) next.date = "Write the date as YYYY-MM-DD.";
    else if (date > today) next.date = "A date in the future cannot be used.";
    else if (backdateDays !== undefined && date < addDaysTo(today, -backdateDays)) {
      next.date = `Expenses can be dated at most ${backdateDays} day(s) back.`;
    }
    const cat = category.trim();
    if (cat.length < 2) next.category = "Say what it was for, for example Electricity.";
    if (paise === null || paise <= 0) next.amount = "Write the amount in rupees, for example 1250 or 1250.50.";
    else if (paise > MAX_PAISE) next.amount = `At most ${formatPaise(MAX_PAISE)} in one entry.`;
    setErrors(next);
    if (Object.keys(next).length || paise === null) return;

    // the spelling already in use wins, so totals by category do not split on case
    const same = known.find((c) => c.toLowerCase() === cat.toLowerCase());
    create.mutate(
      {
        date,
        category: same ?? cat,
        vendor: vendor.trim() || undefined,
        description: description.trim() || undefined,
        amount: paise,
        mode,
        reference: reference.trim() || undefined,
      },
      {
        onSuccess: (e) => onSaved(e),
        onError: (err) => setProblem(apiErrorMessage(err, "The expense could not be saved")),
      },
    );
  }

  return (
    <Card testID="expense-form">
      <VStack gap={12}>
        <SectionHeader title="Add expense" subtitle="It gets the next voucher number when saved." />
        <HStack gap={12} wrap align="flex-start">
          <TextField
            label="Date"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            error={errors.date}
            hint={backdateDays !== undefined ? `Today, or up to ${backdateDays} day(s) back` : undefined}
            containerStyle={{ width: 170 }}
            testID="expense-date"
          />
          <TextField
            label="Amount"
            required
            prefix="₹"
            numericField
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            error={errors.amount}
            hint={paise !== null && paise > 0 ? formatPaise(paise) : undefined}
            containerStyle={{ width: 170 }}
            testID="expense-amount"
          />
          <View style={{ minWidth: 170, flex: 1 }} testID="expense-mode">
            <Select label="Paid by" value={mode} options={MODE_OPTIONS} onChange={(v) => setMode(v as PaymentMode)} />
          </View>
        </HStack>

        <VStack gap={6}>
          <TextField
            label="Category"
            required
            value={category}
            onChangeText={setCategory}
            placeholder="Electricity, Rent, Stationery…"
            maxLength={60}
            error={errors.category}
            testID="expense-category"
          />
          {suggestions.length ? (
            <HStack gap={6} wrap>
              {suggestions.map((c) => (
                <Button key={c} label={c} size="xs" variant="secondary" fullWidth={false} onPress={() => setCategory(c)} testID={`expense-suggest-${c}`} />
              ))}
            </HStack>
          ) : null}
        </VStack>

        <HStack gap={12} wrap align="flex-start">
          <TextField
            label="Paid to"
            value={vendor}
            onChangeText={setVendor}
            placeholder="Vendor or person"
            maxLength={80}
            containerStyle={{ minWidth: 200, flex: 1 }}
            testID="expense-vendor"
          />
          <TextField
            label="Reference"
            value={reference}
            onChangeText={setReference}
            placeholder={REFERENCE_HINT[mode]}
            maxLength={80}
            containerStyle={{ minWidth: 200, flex: 1 }}
            testID="expense-reference"
          />
        </HStack>
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What was bought or paid for"
          maxLength={300}
          testID="expense-description"
        />

        {problem ? <Banner tone="danger" message={problem} onDismiss={() => setProblem(null)} /> : null}
        <HStack gap={8}>
          <Button label="Save expense" onPress={save} loading={create.isPending} fullWidth={false} testID="expense-save" />
          <Button label="Close" variant="ghost" onPress={onClose} disabled={create.isPending} fullWidth={false} testID="expense-form-close" />
        </HStack>
        <Text variant="caption" tone="tertiary">
          A saved expense is never deleted. A mistake is cancelled with a reason and stays in the list.
        </Text>
      </VStack>
    </Card>
  );
}

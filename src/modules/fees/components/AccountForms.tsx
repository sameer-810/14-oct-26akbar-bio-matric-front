import React, { useState } from "react";
import { View } from "react-native";
import { VStack, HStack, Text, Button, TextField, Select, Banner } from "@shared/ui";
import { PERMISSIONS, ROLES } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { apiErrorCode, apiErrorMessage } from "@api/apiClient";
import { academyToday, formatPaise } from "@shared/format";
import { useFeeActions } from "../hooks/useFees";
import { isDay, paiseToInput, readRupees } from "../money";
import { MODE_OPTIONS, REFERENCE_LABELS, type FeeAccount, type FeeSummary, type PaymentMode, type RefundInput } from "../types";

/** A refusal from the server; a fee below the course's minimum gets its own heading so it is not missed. */
function FeeError({ error, onDismiss }: { error: unknown; onDismiss: () => void }) {
  const below = apiErrorCode(error) === "BELOW_MINIMUM";
  return (
    <Banner
      tone={below ? "warning" : "danger"}
      title={below ? "Below the minimum fee" : undefined}
      message={apiErrorMessage(error)}
      onDismiss={onDismiss}
    />
  );
}

/**
 * Set up a student's fees from their standard's plan as it is (the desk), or
 * with a discount and its reason (fees.manage). Below the plan's minimum only
 * the owner may go; the server says so.
 */
export function SetUpForm({ studentId, onCancel, onDone }: { studentId: string; onCancel: () => void; onDone: (a: FeeAccount) => void }) {
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.FEES_MANAGE));
  const isOwner = useAuthStore((s) => s.staff?.role === ROLES.OWNER);
  const act = useFeeActions();
  const [discount, setDiscount] = useState("");
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const d = readRupees(discount, 0);
  const reasonError = d.paise && !reason.trim() ? "Say why the discount is given" : undefined;

  const save = async () => {
    setTried(true);
    setError(null);
    if (d.error || reasonError || d.paise === null) return;
    try {
      onDone(await act.setUp.mutateAsync({ studentId, body: d.paise ? { discount: d.paise, discountReason: reason.trim() } : {} }));
    } catch (err) {
      setError(err);
    }
  };

  return (
    <VStack gap={10}>
      <Text variant="body-sm" tone="secondary">
        The fee, its items and its instalments come from this standard&apos;s fee plan for the year.
      </Text>
      {error ? <FeeError error={error} onDismiss={() => setError(null)} /> : null}
      {canManage ? (
        <HStack gap={10} wrap align="flex-start">
          <TextField
            label="Discount"
            prefix="₹"
            value={discount}
            onChangeText={setDiscount}
            numericField
            placeholder="0"
            error={discount.trim() ? d.error : undefined}
            hint={isOwner ? "Comes off the last instalments." : "Comes off the last instalments. Below the plan's minimum fee needs the owner."}
            containerStyle={{ flex: 1, minWidth: 160 }}
            testID="fees-discount"
          />
          <TextField
            label="Reason for the discount"
            value={reason}
            onChangeText={setReason}
            maxLength={200}
            required={Boolean(d.paise)}
            error={tried ? reasonError : undefined}
            containerStyle={{ flex: 2, minWidth: 200 }}
            testID="fees-discount-reason"
          />
        </HStack>
      ) : null}
      <HStack gap={8}>
        <Button
          label={d.paise ? `Set up with ${formatPaise(d.paise)} off` : "Set up from the plan"}
          fullWidth={false}
          loading={act.setUp.isPending}
          onPress={() => void save()}
          testID="fees-setup-save"
        />
        <Button label="Close" variant="ghost" fullWidth={false} onPress={onCancel} />
      </HStack>
    </VStack>
  );
}

/** Change the discount on an account (fees.manage). The schedule moves with it: less comes off the last instalments. */
export function ReviseForm({ account, onCancel, onDone }: { account: FeeAccount; onCancel: () => void; onDone: (a: FeeAccount) => void }) {
  const isOwner = useAuthStore((s) => s.staff?.role === ROLES.OWNER);
  const act = useFeeActions();
  const [discount, setDiscount] = useState(() => (account.discount ? paiseToInput(account.discount) : ""));
  const [reason, setReason] = useState(account.discountReason);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const s = account.summary;
  const d = readRupees(discount, 0);
  const net = d.paise === null ? null : s.gross - d.paise;
  const changed = d.paise !== account.discount || reason.trim() !== account.discountReason;
  const errors = {
    discount: d.error ?? (net !== null && net < 0 ? `More than the ${formatPaise(s.gross)} fee` : undefined),
    reason: d.paise && d.paise !== account.discount && !reason.trim() ? "Say why the discount is given" : undefined,
  };
  const min = account.plan?.minimumFee;

  const save = async () => {
    setTried(true);
    setError(null);
    if (errors.discount || errors.reason || d.paise === null || !changed) return;
    try {
      onDone(await act.revise.mutateAsync({ accountId: account.id, patch: { discount: d.paise, discountReason: reason.trim() } }));
    } catch (err) {
      setError(err);
    }
  };

  return (
    <VStack gap={10}>
      <Text variant="label">Change fees</Text>
      <Text variant="caption" tone="tertiary">
        Fee before discount {formatPaise(s.gross)}
        {min !== undefined ? ` · course minimum ${formatPaise(min)}` : ""}
      </Text>
      {error ? <FeeError error={error} onDismiss={() => setError(null)} /> : null}
      <HStack gap={10} wrap align="flex-start">
        <TextField
          label="Discount"
          prefix="₹"
          value={discount}
          onChangeText={setDiscount}
          numericField
          placeholder="0"
          error={discount.trim() || tried ? errors.discount : undefined}
          hint={net !== null && net >= 0 ? `New fee ${formatPaise(net)}` : undefined}
          containerStyle={{ flex: 1, minWidth: 160 }}
          testID="fees-revise-discount"
        />
        <TextField
          label="Reason for the discount"
          value={reason}
          onChangeText={setReason}
          maxLength={200}
          error={tried ? errors.reason : undefined}
          containerStyle={{ flex: 2, minWidth: 200 }}
          testID="fees-revise-reason"
        />
      </HStack>
      {net !== null && min !== undefined && net < min && !isOwner ? (
        <Text variant="caption" tone="warning">
          That is below the course&apos;s minimum of {formatPaise(min)}; only the owner can allow it.
        </Text>
      ) : null}
      {net !== null && net >= 0 && net < s.paid ? (
        <Text variant="caption" tone="warning">
          {formatPaise(s.paid)} has already been paid — more than the new fee. Refund the difference afterwards.
        </Text>
      ) : null}
      <HStack gap={8}>
        <Button label="Save fees" fullWidth={false} loading={act.revise.isPending} disabled={!changed} onPress={() => void save()} testID="fees-revise-save" />
        <Button label="Close" variant="ghost" fullWidth={false} onPress={onCancel} />
      </HStack>
    </VStack>
  );
}

/** Give money back (fees.manage): never more than has been paid, always with a reason. */
export function RefundForm({ studentId, summary, onCancel, onDone }: { studentId: string; summary: FeeSummary; onCancel: () => void; onDone: (text: string) => void }) {
  const act = useFeeActions();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(() => academyToday());
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amt = readRupees(amount);
  const errors = {
    amount: amt.error ?? (amt.paise === 0 ? "Enter the amount" : amt.paise !== null && amt.paise > summary.paid ? `Only ${formatPaise(summary.paid)} has been paid` : undefined),
    date: isDay(date) ? undefined : "YYYY-MM-DD",
    reason: reason.trim().length < 3 ? "Say why" : undefined,
  };
  const invalid = Object.values(errors).some(Boolean);
  const refLabel = mode === "cheque" ? "Cheque number" : REFERENCE_LABELS[mode];

  const save = async () => {
    setTried(true);
    setError(null);
    if (invalid || amt.paise === null) return;
    const body: RefundInput = { amount: amt.paise, date: date.trim(), mode, reason: reason.trim() };
    if (refLabel && reference.trim()) body.reference = reference.trim();
    try {
      const r = await act.refund.mutateAsync({ studentId, body });
      onDone(`Refunded ${formatPaise(r.amount)}.`);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <VStack gap={10}>
      <Text variant="label">Refund</Text>
      {error ? <Banner tone="danger" message={error} onDismiss={() => setError(null)} /> : null}
      <HStack gap={10} wrap align="flex-start">
        <TextField
          label="Amount"
          prefix="₹"
          value={amount}
          onChangeText={setAmount}
          numericField
          required
          error={tried || amount.trim() ? errors.amount : undefined}
          hint={`Paid so far ${formatPaise(summary.paid)}`}
          containerStyle={{ flex: 1, minWidth: 160 }}
          testID="fees-refund-amount"
        />
        <View style={{ flex: 1, minWidth: 160 }} testID="fees-refund-mode">
          <Select
            label="Paid back by"
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
          containerStyle={{ flex: 1, minWidth: 140 }}
          testID="fees-refund-date"
        />
      </HStack>
      {refLabel ? <TextField label={refLabel} value={reference} onChangeText={setReference} maxLength={80} testID="fees-refund-reference" /> : null}
      <TextField label="Reason" value={reason} onChangeText={setReason} maxLength={200} required error={tried ? errors.reason : undefined} testID="fees-refund-reason" />
      <HStack gap={8}>
        <Button
          label={amt.paise ? `Refund ${formatPaise(amt.paise)}` : "Refund"}
          variant="destructive"
          fullWidth={false}
          loading={act.refund.isPending}
          onPress={() => void save()}
          testID="fees-refund-save"
        />
        <Button label="Close" variant="ghost" fullWidth={false} onPress={onCancel} />
      </HStack>
    </VStack>
  );
}

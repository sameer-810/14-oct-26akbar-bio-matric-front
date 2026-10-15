import React, { useState } from "react";
import { VStack, HStack, Text, Button, TextField, ConfirmDialog } from "@shared/ui";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { apiErrorMessage } from "@api/apiClient";
import { formatPaise } from "@shared/format";
import { canPrint } from "@shared/print/printHtml";
import { useFeeActions, usePrintReceipt } from "../hooks/useFees";
import type { Receipt } from "../types";

export type FeeMessage = { tone: "success" | "danger"; text: string };

interface Props {
  receipt: Receipt;
  /** the outcome, for the parent's banner */
  onDone: (msg: FeeMessage) => void;
  /** the cheques list offers only the cheque's own steps */
  allowCancel?: boolean;
}

/**
 * What can be done to one receipt: print it; deposit or clear a cheque (the
 * desk); mark a cheque bounced or cancel the receipt (fees.manage) — those
 * two undo money, so each asks for a reason and a confirmation.
 */
export function ReceiptActions({ receipt: r, onDone, allowCancel = true }: Props) {
  const canCollect = useAuthStore((s) => s.hasPermission(PERMISSIONS.FEES_COLLECT) || s.hasPermission(PERMISSIONS.FEES_MANAGE));
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.FEES_MANAGE));
  const act = useFeeActions();
  const printer = usePrintReceipt();
  const [open, setOpen] = useState<"cancel" | "bounce" | null>(null);
  const [text, setText] = useState("");
  const [confirming, setConfirming] = useState(false);

  const status = r.mode === "cheque" && !r.cancelled ? r.cheque?.status : undefined;
  const busy = act.cheque.isPending || act.cancelReceipt.isPending;

  const close = () => {
    setOpen(null);
    setText("");
    setConfirming(false);
  };

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      close();
      onDone({ tone: "success", text: ok });
    } catch (err) {
      setConfirming(false);
      onDone({ tone: "danger", text: apiErrorMessage(err) });
    }
  };

  const cheque = (action: "deposit" | "clear" | "bounce", ok: string) =>
    run(() => act.cheque.mutateAsync({ id: r.id, body: { action, note: action === "bounce" ? text.trim() || undefined : undefined } }), ok);

  const toggle = (which: "cancel" | "bounce") => {
    setText("");
    setOpen(open === which ? null : which);
  };

  return (
    <VStack gap={6}>
      <HStack gap={6} wrap>
        {canPrint ? (
          <Button
            label="Print"
            size="xs"
            variant="secondary"
            fullWidth={false}
            loading={printer.printing === r.id}
            onPress={() => void printer.print(r.id)}
            testID={`fees-print-${r.number}`}
          />
        ) : null}
        {canCollect && status === "pending" ? (
          <Button
            label="Deposited"
            size="xs"
            variant="secondary"
            fullWidth={false}
            disabled={busy}
            onPress={() => void cheque("deposit", `Cheque ${r.cheque?.number} marked deposited.`)}
            testID={`fees-deposit-${r.number}`}
          />
        ) : null}
        {canCollect && (status === "pending" || status === "deposited") ? (
          <Button
            label="Cleared"
            size="xs"
            variant="secondary"
            fullWidth={false}
            disabled={busy}
            onPress={() => void cheque("clear", `Cheque ${r.cheque?.number} marked cleared.`)}
            testID={`fees-clear-${r.number}`}
          />
        ) : null}
        {canManage && status && status !== "bounced" ? (
          <Button label="Bounced" size="xs" variant="ghost" fullWidth={false} disabled={busy} onPress={() => toggle("bounce")} testID={`fees-bounce-${r.number}`} />
        ) : null}
        {canManage && allowCancel && !r.cancelled ? (
          <Button label="Cancel" size="xs" variant="ghost" fullWidth={false} disabled={busy} onPress={() => toggle("cancel")} testID={`fees-cancel-${r.number}`} />
        ) : null}
      </HStack>
      {printer.error ? (
        <Text variant="caption" tone="danger">
          {printer.error}
        </Text>
      ) : null}

      {open === "cancel" ? (
        <VStack gap={8}>
          <TextField
            label="Why cancel it"
            value={text}
            onChangeText={setText}
            placeholder="Wrong amount, entered twice…"
            maxLength={200}
            required
            testID="fees-cancel-reason"
          />
          <HStack gap={8}>
            <Button
              label="Cancel this receipt…"
              variant="destructive"
              size="sm"
              fullWidth={false}
              disabled={text.trim().length < 3}
              onPress={() => setConfirming(true)}
              testID="fees-cancel-confirm"
            />
            <Button label="Keep it" variant="ghost" size="sm" fullWidth={false} onPress={close} />
          </HStack>
        </VStack>
      ) : null}

      {open === "bounce" ? (
        <VStack gap={8}>
          <TextField label="Bank's note" value={text} onChangeText={setText} placeholder="Optional — funds insufficient…" maxLength={200} testID="fees-bounce-note" />
          <HStack gap={8}>
            <Button label="Mark bounced…" variant="destructive" size="sm" fullWidth={false} onPress={() => setConfirming(true)} testID="fees-bounce-confirm" />
            <Button label="Not bounced" variant="ghost" size="sm" fullWidth={false} onPress={close} />
          </HStack>
        </VStack>
      ) : null}

      <ConfirmDialog
        visible={confirming && open === "cancel"}
        title={`Cancel receipt ${r.number}?`}
        message={`${formatPaise(r.amount)} stops counting towards the fees. The receipt stays on record, struck through, and its number is not used again.`}
        confirmLabel="Yes, cancel it"
        cancelLabel="Keep it"
        destructive
        loading={act.cancelReceipt.isPending}
        onConfirm={() => void run(() => act.cancelReceipt.mutateAsync({ id: r.id, reason: text.trim() }), `Receipt ${r.number} cancelled.`)}
        onCancel={() => setConfirming(false)}
      />
      <ConfirmDialog
        visible={confirming && open === "bounce"}
        title={`Cheque ${r.cheque?.number ?? ""} bounced?`}
        message={`${formatPaise(r.amount)} is taken back off the fees paid and the family is told to pay at the office.`}
        confirmLabel="Yes, it bounced"
        cancelLabel="Go back"
        destructive
        loading={act.cheque.isPending}
        onConfirm={() => void cheque("bounce", `Cheque ${r.cheque?.number} marked bounced; ${formatPaise(r.amount)} is due again.`)}
        onCancel={() => setConfirming(false)}
      />
    </VStack>
  );
}

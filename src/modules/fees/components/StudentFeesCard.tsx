import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { Card, VStack, HStack, Text, Button, Banner, SectionHeader, StatTile, StatusChip, Skeleton, ErrorState } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { formatDay, formatPaise } from "@shared/format";
import { canPrint } from "@shared/print/printHtml";
import { useFeeAccount, usePrintReceipt } from "../hooks/useFees";
import { MODE_LABELS, modeText, type FeeAccount, type Receipt } from "../types";
import { PaymentForm } from "./PaymentForm";
import { SetUpForm, ReviseForm, RefundForm } from "./AccountForms";
import { ReceiptActions, type FeeMessage } from "./ReceiptActions";

type Panel = "setup" | "pay" | "refund" | "revise" | null;

/**
 * A student's fees for the current year, on the student's page: what is
 * charged, paid and due, the instalments, every receipt and refund, and the
 * desk's actions. Shows nothing to staff without a fee permission.
 */
export function StudentFeesCard({ studentId }: { studentId: string }) {
  const canView = useAuthStore(
    (s) => s.hasPermission(PERMISSIONS.FEES_VIEW) || s.hasPermission(PERMISSIONS.FEES_COLLECT) || s.hasPermission(PERMISSIONS.FEES_MANAGE),
  );
  const canCollect = useAuthStore((s) => s.hasPermission(PERMISSIONS.FEES_COLLECT) || s.hasPermission(PERMISSIONS.FEES_MANAGE));
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.FEES_MANAGE));
  const account = useFeeAccount(studentId, { enabled: canView });
  const printer = usePrintReceipt();
  const [panel, setPanel] = useState<Panel>(null);
  const [msg, setMsg] = useState<FeeMessage | null>(null);
  /** the receipt just taken, offered for printing */
  const [taken, setTaken] = useState<Receipt | null>(null);

  if (!canView) return null;

  const toggle = (p: Panel) => {
    setMsg(null);
    setPanel(panel === p ? null : p);
  };

  if (account.isLoading) {
    return (
      <Card testID="fees-card">
        <SectionHeader title="Fees" />
        <Skeleton height={120} />
      </Card>
    );
  }
  if (account.error) {
    return (
      <Card testID="fees-card">
        <SectionHeader title="Fees" />
        <ErrorState error={account.error} onRetry={() => void account.refetch()} />
      </Card>
    );
  }

  const a = account.data;
  if (!a) {
    return (
      <Card testID="fees-card">
        <VStack gap={10}>
          <SectionHeader title="Fees" subtitle="Not set up for this year yet" />
          {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
          {canCollect && panel !== "setup" ? (
            <Button label="Set up fees" fullWidth={false} onPress={() => toggle("setup")} testID="fees-setup" />
          ) : null}
          {!canCollect ? (
            <Text variant="body-sm" tone="tertiary">
              Someone who collects fees can set them up.
            </Text>
          ) : null}
          {panel === "setup" ? (
            <SetUpForm
              studentId={studentId}
              onCancel={() => setPanel(null)}
              onDone={(acc) => {
                setPanel(null);
                setMsg({ tone: "success", text: `Fees set up: ${formatPaise(acc.summary.net)} for the year.` });
              }}
            />
          ) : null}
        </VStack>
      </Card>
    );
  }

  const s = a.summary;
  const subtitle = [a.plan?.name, a.discount ? `${formatPaise(a.discount)} discount${a.discountReason ? ` — ${a.discountReason}` : ""}` : null].filter(Boolean).join(" · ");

  return (
    <Card testID="fees-card">
      <VStack gap={12}>
        <SectionHeader title="Fees" subtitle={subtitle || undefined} />
        {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
        {taken ? (
          <Banner
            tone="success"
            message={`Receipt ${taken.number} for ${formatPaise(taken.amount)}`}
            action={
              canPrint ? (
                <Button
                  label="Print"
                  size="sm"
                  fullWidth={false}
                  loading={printer.printing === taken.id}
                  onPress={() => void printer.print(taken.id)}
                  testID="fees-pay-print"
                />
              ) : undefined
            }
            onDismiss={() => setTaken(null)}
          />
        ) : null}
        {printer.error ? <Banner tone="danger" message={printer.error} onDismiss={printer.clearError} /> : null}

        <HStack gap={12} wrap>
          <StatTile label="Net fee" value={formatPaise(s.net)} sublabel={s.discount ? `after ${formatPaise(s.discount)} off` : undefined} testID="fees-net" />
          <StatTile label="Paid" value={formatPaise(s.paid)} sublabel={s.refunded ? `${formatPaise(s.refunded)} refunded` : undefined} accent="green" testID="fees-paid" />
          <StatTile
            label="Balance"
            value={formatPaise(s.balance)}
            sublabel={s.nextDue ? `next ${formatPaise(s.nextDue.amount)} on ${formatDay(s.nextDue.dueDate)}` : undefined}
            testID="fees-balance"
          />
          <StatTile label="Overdue" value={formatPaise(s.overdue)} accent="rose" attention={s.overdue > 0} testID="fees-overdue" />
        </HStack>
        {s.pendingCheques ? (
          <Text variant="caption" tone="warning">
            {s.pendingCheques} cheque{s.pendingCheques === 1 ? "" : "s"} not yet cleared — counted as paid until the bank says otherwise.
          </Text>
        ) : null}

        <HStack gap={8} wrap align="center">
          {canCollect && s.balance > 0 ? (
            <Button
              label="Take payment"
              fullWidth={false}
              onPress={() => {
                setTaken(null);
                toggle("pay");
              }}
              testID="fees-pay"
            />
          ) : null}
          {s.balance <= 0 ? (
            <Text variant="body-sm" tone="success">
              Fully paid
            </Text>
          ) : null}
          {canManage ? <Button label="Change fees" variant="secondary" fullWidth={false} onPress={() => toggle("revise")} testID="fees-revise" /> : null}
          {canManage && s.paid > 0 ? <Button label="Refund" variant="ghost" fullWidth={false} onPress={() => toggle("refund")} testID="fees-refund" /> : null}
        </HStack>

        {panel === "pay" ? (
          <Card compact elevation="raised">
            <PaymentForm
              studentId={studentId}
              summary={s}
              onCancel={() => setPanel(null)}
              onPaid={(r) => {
                setPanel(null);
                setTaken(r);
              }}
            />
          </Card>
        ) : null}
        {panel === "revise" ? (
          <Card compact elevation="raised">
            <ReviseForm
              account={a}
              onCancel={() => setPanel(null)}
              onDone={(acc) => {
                setPanel(null);
                setMsg({ tone: "success", text: `Fees changed: now ${formatPaise(acc.summary.net)}.` });
              }}
            />
          </Card>
        ) : null}
        {panel === "refund" ? (
          <Card compact elevation="raised">
            <RefundForm
              studentId={studentId}
              summary={s}
              onCancel={() => setPanel(null)}
              onDone={(text) => {
                setPanel(null);
                setMsg({ tone: "success", text });
              }}
            />
          </Card>
        ) : null}

        <Schedule account={a} />
        <Receipts receipts={a.receipts} onDone={setMsg} />
        <Refunds account={a} />
      </VStack>
    </Card>
  );
}

function Schedule({ account }: { account: FeeAccount }) {
  const rows = account.summary.schedule;
  if (!rows.length) return null;
  return (
    <VStack gap={0}>
      <Text variant="label" style={styles.heading}>
        Instalments
      </Text>
      {rows.map((i, n) => (
        <HStack key={`${i.dueDate}-${n}`} gap={8} align="center" wrap style={styles.row} testID={`fees-instalment-${n}`}>
          <VStack gap={1} style={{ flex: 1, minWidth: 140 }}>
            <Text variant="body-sm">{i.label}</Text>
            <Text variant="caption" tone={i.overdue ? "danger" : "tertiary"}>
              Due {formatDay(i.dueDate)}
            </Text>
          </VStack>
          <VStack gap={1} style={styles.money}>
            <Text variant="body-sm" tabular>
              {formatPaise(i.amount)}
            </Text>
            <Text variant="caption" tone="tertiary" tabular>
              paid {formatPaise(i.paid)}
            </Text>
          </VStack>
          <StatusChip status={i.status} size="sm" />
          {i.overdue ? (
            <Text variant="label" tone="danger" tabular>
              {formatPaise(i.due)} overdue
            </Text>
          ) : null}
        </HStack>
      ))}
    </VStack>
  );
}

function Receipts({ receipts, onDone }: { receipts: Receipt[]; onDone: (m: FeeMessage) => void }) {
  return (
    <VStack gap={0}>
      <Text variant="label" style={styles.heading}>
        Receipts
      </Text>
      {receipts.length === 0 ? (
        <Text variant="body-sm" tone="tertiary">
          No money taken yet.
        </Text>
      ) : null}
      {[...receipts].reverse().map((r) => {
        const bounced = r.cheque?.status === "bounced";
        const struck = r.cancelled || bounced ? styles.struck : null;
        return (
          <VStack key={r.id} gap={6} style={styles.row} testID={`fees-receipt-${r.number}`}>
            <HStack gap={8} align="center" wrap>
              <VStack gap={1} style={{ flex: 1, minWidth: 160 }}>
                <Text variant="body-sm" weight="600" tone={r.cancelled ? "disabled" : "primary"} style={struck}>
                  {r.number}
                </Text>
                <Text variant="caption" tone="tertiary">
                  {formatDay(r.date)} · {modeText(r)}
                </Text>
              </VStack>
              {r.cancelled ? <StatusChip status="cancelled" size="sm" /> : r.cheque ? <StatusChip status={r.cheque.status} size="sm" /> : null}
              <Text variant="label" tabular tone={r.cancelled ? "disabled" : "primary"} style={[styles.money, struck]}>
                {formatPaise(r.amount)}
              </Text>
            </HStack>
            {r.cancelled ? (
              <Text variant="caption" tone="danger">
                Cancelled{r.cancelReason ? ` — ${r.cancelReason}` : ""}
              </Text>
            ) : null}
            {bounced ? (
              <Text variant="caption" tone="danger">
                Cheque bounced{r.cheque?.bouncedOn ? ` on ${formatDay(r.cheque.bouncedOn)}` : ""}
                {r.cheque?.bounceNote ? ` — ${r.cheque.bounceNote}` : ""}; not counted
              </Text>
            ) : null}
            <ReceiptActions receipt={r} onDone={onDone} />
          </VStack>
        );
      })}
    </VStack>
  );
}

function Refunds({ account }: { account: FeeAccount }) {
  if (!account.refunds.length) return null;
  return (
    <VStack gap={0}>
      <Text variant="label" style={styles.heading}>
        Refunds
      </Text>
      {account.refunds.map((r) => (
        <HStack key={r.id} gap={8} align="center" wrap style={styles.row}>
          <VStack gap={1} style={{ flex: 1, minWidth: 160 }}>
            <Text variant="body-sm">{r.reason}</Text>
            <Text variant="caption" tone="tertiary">
              {formatDay(r.date)} · {MODE_LABELS[r.mode]}
              {r.reference ? ` · ${r.reference}` : ""}
            </Text>
          </VStack>
          <Text variant="label" tabular tone="danger" style={styles.money}>
            −{formatPaise(r.amount)}
          </Text>
        </HStack>
      ))}
    </VStack>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 4, marginBottom: 4 },
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border.subtle },
  money: { minWidth: 96, alignItems: "flex-end", textAlign: "right" },
  struck: { textDecorationLine: "line-through" },
});

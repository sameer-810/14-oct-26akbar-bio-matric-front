import React, { useState } from "react";
import { Card, VStack, HStack, Text, Button, StatusChip, Banner, ConfirmDialog } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { apiErrorMessage } from "@api/apiClient";
import { formatDay, formatDateTime } from "@shared/format";
import { useNoticeActions } from "../hooks/useNotices";
import type { Notice } from "../types";
import { audienceLabel } from "./AudiencePicker";
import { NoticeForm } from "./NoticeForm";

const families = (n: number) => `${n} famil${n === 1 ? "y" : "ies"}`;

/** One notice on the board: what it says, who it is for, until when, and who was told. */
export function NoticeCard({ notice: n, canManage, today }: { notice: Notice; canManage: boolean; today: string }) {
  const act = useNoticeActions();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const expired = Boolean(n.expiresOn && n.expiresOn < today);

  if (editing) {
    return (
      <NoticeForm
        notice={n}
        onDone={(text) => {
          setEditing(false);
          if (text) setMsg({ tone: "success", text });
        }}
      />
    );
  }

  async function send() {
    setMsg(null);
    try {
      const after = await act.notify.mutateAsync(n.id);
      const told = after.familiesTold - n.familiesTold;
      setMsg({ tone: "success", text: told > 0 ? `Sent to ${families(told)}.` : "Every family it is for was already told." });
    } catch (err) {
      setMsg({ tone: "danger", text: apiErrorMessage(err) });
    }
  }

  async function remove() {
    try {
      await act.remove.mutateAsync(n.id);
      setConfirming(false);
    } catch (err) {
      setConfirming(false);
      setMsg({ tone: "danger", text: apiErrorMessage(err) });
    }
  }

  return (
    <Card accentColor={n.pinned ? palette.primary[600] : undefined} testID={`notice-card-${n.title}`}>
      <VStack gap={8}>
        <HStack gap={8} align="center" wrap>
          <Text variant="h3" style={{ flex: 1 }}>
            {n.title}
          </Text>
          {n.pinned ? <StatusChip status="pinned" size="sm" /> : null}
          {expired ? <StatusChip status="expired" size="sm" /> : null}
        </HStack>
        {n.body ? <Text variant="body">{n.body}</Text> : null}
        <Text variant="body-sm" tone="secondary">
          For: {audienceLabel(n)}
        </Text>
        <Text variant="caption" tone="tertiary">
          Posted {formatDateTime(n.createdAt)} ·{" "}
          {n.expiresOn ? `${expired ? "Ended" : "Shows until"} ${formatDay(n.expiresOn)}` : "Until removed"}
        </Text>
        {n.notifiedAt ? (
          <Text variant="caption" tone="secondary" testID="notice-told">
            Sent to {families(n.familiesTold)}
          </Text>
        ) : null}
        {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
        {canManage ? (
          <HStack gap={8} wrap>
            <Button label="Edit" size="xs" variant="ghost" onPress={() => setEditing(true)} testID="notice-edit" />
            <Button label="Send to phones" size="xs" variant="secondary" onPress={() => void send()} loading={act.notify.isPending} testID="notice-send" />
            <Button label="Remove" size="xs" variant="ghost" onPress={() => setConfirming(true)} testID="notice-remove" />
          </HStack>
        ) : null}
      </VStack>
      <ConfirmDialog
        visible={confirming}
        title="Remove this notice?"
        message={`"${n.title}" comes off the board for staff and families. Alerts already sent stay on their phones.`}
        confirmLabel="Remove"
        destructive
        loading={act.remove.isPending}
        onConfirm={() => void remove()}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  );
}

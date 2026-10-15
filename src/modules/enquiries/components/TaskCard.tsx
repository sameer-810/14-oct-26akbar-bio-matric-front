import React, { useState } from "react";
import { Pressable } from "react-native";
import { Card, VStack, HStack, Text, Button, TextField, StatusChip, Banner } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { apiErrorMessage } from "@api/apiClient";
import { formatDateTime, formatTime } from "@shared/format";
import { useEnquiryActions } from "../hooks/useEnquiries";
import { STAGE_LABELS, type EnquiryTask } from "../types";

interface Props {
  task: EnquiryTask;
  /** when the screen opened — an open call before this is overdue */
  now: number;
  /** on the board, the card names its lead; on the lead's own page it need not */
  showLead?: boolean;
  showAssignee?: boolean;
  /** the board's day columns already say the day, so only the time is shown there */
  timeOnly?: boolean;
  onOpenLead?: (enquiryId: string) => void;
}

/**
 * One follow-up. "Done" asks what happened before closing it, because the
 * outcome is what the next person to call this family reads first.
 */
export function TaskCard({ task: t, now, showLead, showAssignee, timeOnly, onOpenLead }: Props) {
  const act = useEnquiryActions();
  const [closing, setClosing] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [error, setError] = useState<string | null>(null);
  const overdue = !t.done && (t.overdue ?? Date.parse(t.dueAt) < now);
  const lead = t.lead;

  async function markDone() {
    setError(null);
    try {
      await act.updateTask.mutateAsync({ taskId: t.id, patch: { done: true, outcome: outcome.trim() } });
      setClosing(false);
      setOutcome("");
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card compact accentColor={overdue ? palette.danger.text : undefined} testID={`task-${t.id}`}>
      <VStack gap={6}>
        <HStack gap={8} align="center" wrap>
          <Text variant="label" tone={overdue ? "danger" : "secondary"} tabular>
            {timeOnly ? formatTime(t.dueAt) : formatDateTime(t.dueAt)}
            {overdue ? " · overdue" : ""}
          </Text>
          {t.done ? <StatusChip status="done" size="sm" /> : null}
        </HStack>
        <Text variant="body-sm" weight="600" style={t.done ? { color: palette.text.tertiary } : undefined}>
          {t.title}
        </Text>
        {showLead && lead ? (
          <Pressable onPress={() => onOpenLead?.(lead.id)} accessibilityRole="link" accessibilityLabel={`Open enquiry ${lead.number}`}>
            <VStack gap={2}>
              <Text variant="body-sm" tone="link">
                #{lead.number} {lead.name}
              </Text>
              <Text variant="caption" tone="tertiary">
                {[lead.phone, STAGE_LABELS[lead.stage]].filter(Boolean).join(" · ")}
              </Text>
            </VStack>
          </Pressable>
        ) : null}
        {showAssignee ? (
          <Text variant="caption" tone="tertiary">
            {t.assigneeName ? `With ${t.assigneeName}` : "Not assigned"}
          </Text>
        ) : null}
        {t.done ? (
          <Text variant="caption" tone="secondary">
            {t.outcome ? `Outcome: ${t.outcome}` : "Done"}
            {t.doneAt ? ` · ${formatDateTime(t.doneAt)}` : ""}
          </Text>
        ) : closing ? (
          <VStack gap={8}>
            {error ? <Banner tone="danger" message={error} onDismiss={() => setError(null)} /> : null}
            <TextField
              label="What happened"
              value={outcome}
              onChangeText={setOutcome}
              placeholder="Spoke to father, will visit Saturday"
              maxLength={500}
              autoFocus
              testID="task-outcome"
            />
            <HStack gap={8} wrap>
              <Button label="Mark done" size="sm" fullWidth={false} onPress={markDone} loading={act.updateTask.isPending} testID="task-save" />
              <Button label="Cancel" size="sm" variant="ghost" fullWidth={false} onPress={() => setClosing(false)} />
            </HStack>
          </VStack>
        ) : (
          <HStack>
            <Button label="Done" size="xs" variant="secondary" fullWidth={false} onPress={() => setClosing(true)} testID={`task-done-${t.title}`} />
          </HStack>
        )}
      </VStack>
    </Card>
  );
}

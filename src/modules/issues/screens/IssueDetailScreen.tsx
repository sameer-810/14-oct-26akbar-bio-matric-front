import React, { useState } from "react";
import { View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { Screen, Card, VStack, HStack, Text, Button, TextField, Select, StatusChip, Banner, ErrorState, Skeleton, SectionHeader, ToggleRow, EmptyState } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { apiErrorMessage } from "@api/apiClient";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { formatDateTime, formatDay } from "@shared/format";
import { useIssue, useIssueActions, useIssueAssignees } from "../hooks/useIssues";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  PRIORITY_OPTIONS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  type Issue,
  type IssueComment,
  type IssuePatch,
  type IssuePriority,
  type IssueStatus,
} from "../types";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * One issue and its thread. Those who handle issues assign, prioritise and
 * set a due date; whoever has it (or raised it) can only move its status.
 * Internal notes stay with staff — the family sees every other reply.
 */
export default function IssueDetailScreen() {
  const { id } = useRoute().params as { id: string };
  const nav = useNavigation<{ navigate: (name: string, params?: object) => void }>();
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.ISSUES_MANAGE));
  const issue = useIssue(id);
  const i = issue.data;

  return (
    <Screen
      title={i ? `#${i.number} ${i.title}` : "Issue"}
      subtitle={i ? `${CATEGORY_LABELS[i.category]} · raised ${formatDateTime(i.createdAt)}` : undefined}
      right={<Button label="All issues" variant="ghost" onPress={() => nav.navigate("IssuesList")} />}
      testID="issue-detail"
    >
      <VStack gap={16}>
        {issue.isLoading ? <Skeleton height={120} /> : null}
        {issue.error ? <ErrorState error={issue.error} onRetry={() => void issue.refetch()} /> : null}
        {i ? (
          <>
            <Card>
              <VStack gap={8}>
                <HStack gap={8} wrap>
                  <StatusChip status={STATUS_LABELS[i.status]} />
                  <StatusChip status={`${PRIORITY_LABELS[i.priority]} priority`} />
                </HStack>
                <Text variant="body">{i.description || "No description."}</Text>
                <Text variant="body-sm" tone="secondary">
                  Raised by {i.raisedBy.type === "parent" ? "a parent" : "staff"}
                  {i.raisedBy.name ? ` — ${i.raisedBy.name}` : ""}
                </Text>
                {i.student ? (
                  <Text variant="body-sm" tone="secondary">
                    Student: {i.student.name} (GR {i.student.grNumber})
                  </Text>
                ) : null}
                <Text variant="caption" tone="tertiary">
                  {i.assigneeId ? `With ${i.assigneeName || "a staff member"}` : "Not assigned"}
                  {i.dueOn ? ` · due ${formatDay(i.dueOn)}` : ""}
                  {i.resolvedAt ? ` · resolved ${formatDateTime(i.resolvedAt)}` : ""}
                </Text>
              </VStack>
            </Card>

            {/* keyed so the due-date draft starts again from what the server holds */}
            <HandlePanel key={`${i.id}:${i.dueOn ?? ""}`} issue={i} canManage={canManage} />

            <Thread issue={i} />
          </>
        ) : null}
      </VStack>
    </Screen>
  );
}

function HandlePanel({ issue: i, canManage }: { issue: Issue; canManage: boolean }) {
  const act = useIssueActions();
  const assignees = useIssueAssignees({ enabled: canManage });
  const [due, setDue] = useState(i.dueOn ?? "");
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  async function save(patch: IssuePatch, done: string) {
    setMsg(null);
    try {
      await act.update.mutateAsync({ id: i.id, patch });
      setMsg({ tone: "success", text: done });
    } catch (err) {
      setMsg({ tone: "danger", text: apiErrorMessage(err) });
    }
  }

  const dueValid = due.trim() === "" || YMD.test(due.trim());

  return (
    <Card>
      <VStack gap={12}>
        <SectionHeader title="Handling" subtitle={canManage ? undefined : "Only someone who handles issues can reassign or re-prioritise."} />
        {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
        <HStack gap={12} wrap>
          <View style={{ flex: 1, minWidth: 180 }} testID="issue-status">
            <Select
              label="Status"
              value={i.status}
              options={STATUS_OPTIONS}
              onChange={(s) => s !== i.status && void save({ status: s as IssueStatus }, `Marked ${STATUS_LABELS[s as IssueStatus].toLowerCase()}.`)}
              disabled={act.update.isPending}
            />
          </View>
          {canManage ? (
            <View style={{ flex: 1, minWidth: 180 }} testID="issue-priority">
              <Select
                label="Priority"
                value={i.priority}
                options={PRIORITY_OPTIONS}
                onChange={(p) => p !== i.priority && void save({ priority: p as IssuePriority }, `Priority set to ${PRIORITY_LABELS[p as IssuePriority].toLowerCase()}.`)}
                disabled={act.update.isPending}
              />
            </View>
          ) : null}
        </HStack>
        {canManage ? (
          <HStack gap={12} wrap align="flex-end">
            <View style={{ flex: 1, minWidth: 220 }} testID="issue-assignee">
              <Select
                label="Assigned to"
                value={i.assigneeId ?? ""}
                options={[{ value: "", label: "Nobody" }, ...(assignees.data ?? []).map((a) => ({ value: a.id, label: a.name, sublabel: a.role.replace(/_/g, " ") }))]}
                onChange={(a) => (a || null) !== i.assigneeId && void save({ assigneeId: a || null }, a ? "Assigned." : "No longer assigned.")}
                placeholder={assignees.isLoading ? "Loading staff…" : "Nobody"}
                disabled={act.update.isPending}
              />
            </View>
            <TextField
              label="Due on"
              value={due}
              onChangeText={setDue}
              placeholder="YYYY-MM-DD"
              error={dueValid ? undefined : "Write it as YYYY-MM-DD"}
              containerStyle={{ width: 160 }}
              testID="issue-due"
            />
            <Button
              label="Set due date"
              size="sm"
              variant="secondary"
              fullWidth={false}
              disabled={!dueValid || (due.trim() || null) === i.dueOn}
              loading={act.update.isPending}
              onPress={() => void save({ dueOn: due.trim() || null }, due.trim() ? `Due ${formatDay(due.trim())}.` : "Due date cleared.")}
              testID="issue-due-save"
            />
          </HStack>
        ) : null}
      </VStack>
    </Card>
  );
}

function Thread({ issue: i }: { issue: Issue }) {
  const act = useIssueActions();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const comments = [...i.comments].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const family = i.raisedBy.type === "parent";

  async function send() {
    setError(null);
    try {
      await act.comment.mutateAsync({ id: i.id, body: body.trim(), internal });
      setBody("");
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <VStack gap={10}>
      <SectionHeader title="Thread" subtitle={family ? "Replies reach the family in their app; internal notes do not." : undefined} />
      {comments.length === 0 ? <EmptyState title="No replies yet" /> : null}
      {comments.map((c) => (
        <CommentCard key={c.id} comment={c} />
      ))}
      <Card>
        <VStack gap={10}>
          {error ? <Banner tone="danger" message={error} onDismiss={() => setError(null)} /> : null}
          <TextField label="Reply" value={body} onChangeText={setBody} multiline maxLength={2000} placeholder={internal ? "A note for staff only" : "Write a reply"} testID="issue-reply" />
          <ToggleRow
            label="Internal note"
            hint={internal ? "Only staff will see this." : family ? "Off: the family sees this reply." : undefined}
            value={internal}
            onChange={setInternal}
            testID="issue-internal"
          />
          <HStack>
            <Button label={internal ? "Add note" : "Send"} onPress={send} loading={act.comment.isPending} disabled={!body.trim()} fullWidth={false} testID="issue-send" />
          </HStack>
        </VStack>
      </Card>
    </VStack>
  );
}

function CommentCard({ comment: c }: { comment: IssueComment }) {
  return (
    <Card
      compact
      accentColor={c.internal ? palette.warning.text : undefined}
      style={c.internal ? { backgroundColor: palette.warning.bg, borderColor: palette.warning.border } : undefined}
      testID={c.internal ? "issue-comment-internal" : "issue-comment"}
    >
      <VStack gap={4}>
        <HStack gap={8} align="center" wrap>
          <Text variant="label" style={{ flex: 1 }}>
            {c.by.name || (c.by.type === "parent" ? "Parent" : "Staff")}
            {c.by.type === "parent" ? " (parent)" : ""}
          </Text>
          <Text variant="caption" tone="tertiary">
            {formatDateTime(c.at)}
          </Text>
        </HStack>
        {c.internal ? (
          <Text variant="caption" weight="600" style={{ color: palette.warning.text }}>
            Internal note — not shown to the family
          </Text>
        ) : null}
        <Text variant="body-sm">{c.body}</Text>
      </VStack>
    </Card>
  );
}

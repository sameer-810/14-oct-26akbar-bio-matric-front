import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { MessageSquareWarning } from "lucide-react-native";

import { Screen, Card, VStack, HStack, Text, Button, TextField, Select, ChipsRow, StatusChip, Banner, EmptyState, ErrorState, Skeleton, SectionHeader, ToggleRow } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { apiErrorMessage } from "@api/apiClient";
import { formatRelative } from "@shared/format";
import { useIssueList, useIssueActions } from "../hooks/useIssues";
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  PRIORITY_LABELS,
  PRIORITY_OPTIONS,
  STATUS_LABELS,
  type Issue,
  type IssueCategory,
  type IssueFilter,
  type IssuePriority,
} from "../types";

type Nav = { navigate: (name: string, params?: object) => void };

const VIEWS = [
  { key: "active", label: "Active" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
];

/** Only the two top priorities get a rule down the side, so they stand out in a long list. */
const PRIORITY_ACCENT: Partial<Record<IssuePriority, string>> = {
  urgent: palette.danger.text,
  high: palette.warning.text,
};

/**
 * The issue tracker: what parents and staff have raised, most urgent first.
 * Staff who do not handle issues see only the ones they raised or were given
 * (the server decides that, not this screen).
 */
export default function IssuesScreen() {
  const nav = useNavigation<Nav>();
  const [view, setView] = useState("active");
  const [mine, setMine] = useState(false);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // "3 h ago" is measured from when the screen opened, not re-read on every render
  const [now] = useState(() => Date.now());

  const filter: IssueFilter = { status: view === "all" ? undefined : (view as IssueFilter["status"]), mine: mine || undefined };
  const list = useIssueList(filter);
  const issues = list.data ?? [];

  return (
    <Screen
      title="Issues"
      subtitle="Raised by parents and staff, with who is handling each one."
      right={!adding ? <Button label="Raise an issue" onPress={() => setAdding(true)} testID="issue-new" /> : undefined}
      testID="issues-screen"
    >
      <VStack gap={12}>
        {adding ? (
          <NewIssueForm
            onDone={(issue) => {
              setAdding(false);
              if (issue) setNotice(`Issue #${issue.number} raised.`);
            }}
          />
        ) : null}
        {notice ? <Banner tone="success" message={notice} onDismiss={() => setNotice(null)} /> : null}

        <HStack gap={12} wrap align="center">
          <ChipsRow chips={VIEWS} active={view} onChange={setView} />
          <VStack style={{ minWidth: 200 }}>
            <ToggleRow label="Only mine" value={mine} onChange={setMine} testID="issues-mine" />
          </VStack>
        </HStack>

        {list.isLoading ? <Skeleton height={140} /> : null}
        {list.error ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
        {list.data && issues.length === 0 ? (
          <EmptyState icon={MessageSquareWarning} title={view === "active" ? "Nothing open" : "No issues here"} message={mine ? "Only the ones you raised or were given are shown." : undefined} />
        ) : null}
        {issues.map((i) => (
          <IssueCard key={i.id} issue={i} now={now} onOpen={() => nav.navigate("IssueDetail", { id: i.id })} />
        ))}
      </VStack>
    </Screen>
  );
}

function IssueCard({ issue: i, now, onOpen }: { issue: Issue; now: number; onOpen: () => void }) {
  return (
    <Card onPress={onOpen} accentColor={PRIORITY_ACCENT[i.priority]} accessibilityLabel={`Issue ${i.number}: ${i.title}`} testID={`issue-card-${i.number}`}>
      <VStack gap={6}>
        <HStack gap={8} align="center" wrap>
          <Text variant="h3" style={{ flex: 1, minWidth: 180 }}>
            #{i.number} {i.title}
          </Text>
          <StatusChip status={PRIORITY_LABELS[i.priority]} size="sm" />
          <StatusChip status={STATUS_LABELS[i.status]} size="sm" />
        </HStack>
        <Text variant="body-sm" tone="secondary">
          {[
            CATEGORY_LABELS[i.category],
            `Raised by ${i.raisedBy.type === "parent" ? "parent" : "staff"}${i.raisedBy.name ? ` ${i.raisedBy.name}` : ""}`,
            i.student ? `about ${i.student.name} (GR ${i.student.grNumber})` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        <Text variant="caption" tone="tertiary">
          {i.assigneeId ? `With ${i.assigneeName || "a staff member"}` : "Not assigned"} · {formatRelative(i.createdAt, now)}
          {i.comments.length ? ` · ${i.comments.length} repl${i.comments.length === 1 ? "y" : "ies"}` : ""}
        </Text>
      </VStack>
    </Card>
  );
}

/** Staff raise an issue here; parents raise theirs from the parent app. */
function NewIssueForm({ onDone }: { onDone: (issue?: Issue) => void }) {
  const act = useIssueActions();
  const [v, setV] = useState<{ title: string; description: string; category: IssueCategory; priority: IssuePriority }>({
    title: "",
    description: "",
    category: "other",
    priority: "normal",
  });
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      const issue = await act.create.mutateAsync({
        title: v.title.trim(),
        description: v.description.trim() || undefined,
        category: v.category,
        priority: v.priority,
      });
      onDone(issue);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card testID="issue-form">
      <VStack gap={12}>
        <SectionHeader title="Raise an issue" />
        {error ? <Banner tone="danger" message={error} /> : null}
        <TextField label="Title" value={v.title} onChangeText={(t) => setV({ ...v, title: t })} maxLength={140} required testID="issue-title" />
        <TextField
          label="What happened"
          value={v.description}
          onChangeText={(t) => setV({ ...v, description: t })}
          multiline
          maxLength={4000}
          placeholder="Optional"
          testID="issue-description"
        />
        <HStack gap={12} wrap>
          <VStack flex={1} style={{ minWidth: 180 }}>
            <Select label="Category" value={v.category} options={CATEGORY_OPTIONS} onChange={(c) => setV({ ...v, category: c as IssueCategory })} />
          </VStack>
          <VStack flex={1} style={{ minWidth: 180 }}>
            <Select label="Priority" value={v.priority} options={PRIORITY_OPTIONS} onChange={(p) => setV({ ...v, priority: p as IssuePriority })} />
          </VStack>
        </HStack>
        <HStack gap={8}>
          <Button label="Raise it" onPress={submit} loading={act.create.isPending} disabled={v.title.trim().length < 3} testID="issue-save" />
          <Button label="Cancel" variant="ghost" onPress={() => onDone()} />
        </HStack>
      </VStack>
    </Card>
  );
}

import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MessageCircleQuestion } from "lucide-react-native";

import { Screen, Card, VStack, HStack, Text, Button, Banner, TextField, Select, StatusChip, SectionHeader, Skeleton, EmptyState, useBreakpoint } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { formatRelative } from "@shared/format";
import { useFamilyIssues, useParentActions, useSelectedChild } from "../hooks/useParent";
import type { IssueCategory } from "../types";

const CATEGORIES: { value: IssueCategory; label: string }[] = [
  { value: "attendance", label: "Attendance" },
  { value: "academic", label: "Studies and tests" },
  { value: "fees", label: "Fees" },
  { value: "facility", label: "Classroom and building" },
  { value: "app", label: "This app" },
  { value: "staff", label: "A member of staff" },
  { value: "other", label: "Something else" },
];

/**
 * Write to the academy and see their answer — the old "feedback form", but
 * with a reply. A message about one child can say which.
 */
export default function ParentIssuesScreen() {
  const { isWide } = useBreakpoint();
  const nav = useNavigation<{ navigate: (name: string, params?: object) => void }>();
  const issues = useFamilyIssues();
  const { children } = useSelectedChild();
  const act = useParentActions();
  const [form, setForm] = useState<{ title: string; description: string; category: IssueCategory; studentId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!form) return;
    setError(null);
    try {
      const i = await act.raiseIssue.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        studentId: form.studentId || undefined,
      });
      setForm(null);
      nav.navigate("ParentIssue", { id: i.id });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Screen
      title="Questions and issues"
      right={!form ? <Button label="Write to us" size="sm" onPress={() => setForm({ title: "", description: "", category: "attendance", studentId: children[0]?.id ?? "" })} testID="issue-new" /> : null}
      testID="parent-issues"
    >
      <View style={[styles.wrap, isWide && styles.wrapWide]}>
        <VStack gap={12}>
          {error ? <Banner tone="danger" message={error} onDismiss={() => setError(null)} /> : null}
          {form ? (
            <Card>
              <VStack gap={12}>
                <SectionHeader title="Write to the academy" subtitle="You will get a notification when they reply." />
                <Select label="About" value={form.category} options={CATEGORIES} onChange={(v) => setForm({ ...form, category: v as IssueCategory })} />
                {children.length ? (
                  <Select
                    label="Child"
                    value={form.studentId}
                    options={[...children.map((c) => ({ value: c.id, label: c.name })), { value: "", label: "Not about one child" }]}
                    onChange={(v) => setForm({ ...form, studentId: v })}
                  />
                ) : null}
                <TextField label="Subject" value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} maxLength={140} testID="issue-title" />
                <TextField
                  label="Message"
                  value={form.description}
                  onChangeText={(t) => setForm({ ...form, description: t })}
                  multiline
                  maxLength={4000}
                  testID="issue-description"
                />
                <HStack gap={8}>
                  <Button
                    label="Send"
                    onPress={submit}
                    loading={act.raiseIssue.isPending}
                    disabled={form.title.trim().length < 3 || form.description.trim().length < 3}
                    testID="issue-send"
                  />
                  <Button label="Cancel" variant="ghost" onPress={() => setForm(null)} />
                </HStack>
              </VStack>
            </Card>
          ) : null}
          {issues.isLoading ? <Skeleton height={100} /> : null}
          {issues.data?.length === 0 && !form ? (
            <EmptyState icon={MessageCircleQuestion} title="Nothing yet" message="Questions you send and the academy's replies appear here." />
          ) : null}
          {(issues.data ?? []).map((i) => (
            <Card key={i.id} onPress={() => nav.navigate("ParentIssue", { id: i.id })} testID={`parent-issue-${i.number}`}>
              <HStack gap={8} align="center">
                <VStack gap={2} flex={1}>
                  <Text variant="label">
                    #{i.number} {i.title}
                  </Text>
                  <Text variant="caption" tone="tertiary">
                    {i.comments.length ? `${i.comments.length} message${i.comments.length === 1 ? "" : "s"} · ` : ""}
                    {formatRelative(i.updatedAt)}
                  </Text>
                </VStack>
                <StatusChip status={i.status} size="sm" />
              </HStack>
            </Card>
          ))}
        </VStack>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignSelf: "center" },
  wrapWide: { maxWidth: 640 },
});

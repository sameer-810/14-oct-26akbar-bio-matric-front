import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRoute } from "@react-navigation/native";

import { Screen, Card, VStack, HStack, Text, Button, Banner, TextField, StatusChip, Skeleton, ErrorState, useBreakpoint } from "@shared/ui";
import { palette, radius } from "@shared/designSystem";
import { apiErrorMessage } from "@api/apiClient";
import { formatDateTime } from "@shared/format";
import { useFamilyIssue, useParentActions } from "../hooks/useParent";

/** One question and the conversation about it. Writing on a resolved one opens it again. */
export default function ParentIssueScreen() {
  const { isWide } = useBreakpoint();
  const { id } = useRoute().params as { id: string };
  const issue = useFamilyIssue(id);
  const act = useParentActions();
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const i = issue.data;

  async function send() {
    setError(null);
    try {
      await act.commentOnIssue.mutateAsync({ id, body: reply.trim() });
      setReply("");
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Screen title={i ? `#${i.number} ${i.title}` : "Question"} testID="parent-issue">
      <View style={[styles.wrap, isWide && styles.wrapWide]}>
        <VStack gap={12}>
          {issue.isLoading ? <Skeleton height={120} /> : null}
          {issue.error ? <ErrorState error={issue.error} /> : null}
          {i ? (
            <>
              <Card>
                <VStack gap={6}>
                  <HStack gap={8} align="center">
                    <Text variant="caption" tone="tertiary" style={{ flex: 1 }}>
                      Sent {formatDateTime(i.createdAt)}
                    </Text>
                    <StatusChip status={i.status} size="sm" />
                  </HStack>
                  <Text>{i.description}</Text>
                </VStack>
              </Card>
              {i.comments.map((c) => (
                <View key={c.id} style={[styles.bubble, c.by.type === "parent" ? styles.mine : styles.theirs]} testID={`issue-comment-${c.by.type}`}>
                  <Text variant="caption" tone="tertiary">
                    {c.by.type === "parent" ? "You" : c.by.name || "The academy"} · {formatDateTime(c.at)}
                  </Text>
                  <Text variant="body-sm">{c.body}</Text>
                </View>
              ))}
              {error ? <Banner tone="danger" message={error} onDismiss={() => setError(null)} /> : null}
              {i.status !== "closed" ? (
                <Card>
                  <VStack gap={8}>
                    <TextField label="Reply" value={reply} onChangeText={setReply} multiline maxLength={2000} testID="issue-reply" />
                    <Button label="Send" onPress={send} loading={act.commentOnIssue.isPending} disabled={!reply.trim()} testID="issue-reply-send" />
                  </VStack>
                </Card>
              ) : (
                <Text tone="tertiary">This question is closed. Write a new one if you need to.</Text>
              )}
            </>
          ) : null}
        </VStack>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignSelf: "center" },
  wrapWide: { maxWidth: 640 },
  bubble: { padding: 12, borderRadius: radius.md, gap: 4, maxWidth: "88%" },
  mine: { alignSelf: "flex-end", backgroundColor: palette.primary[50] },
  theirs: { alignSelf: "flex-start", backgroundColor: palette.surface.primary, borderWidth: 1, borderColor: palette.border.default },
});

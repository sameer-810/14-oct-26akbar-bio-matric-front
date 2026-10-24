import React, { useState } from "react";
import { Bell } from "lucide-react-native";
import { Screen, Card, VStack, HStack, Text, Button, EmptyState, ErrorState, Skeleton, Pagination } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { formatRelative } from "@shared/format";
import { useInbox, useMarkInboxRead } from "../hooks/useInbox";

/** A staff member's own notes: their punches, machines waiting, punches nobody owns. */
export default function InboxScreen() {
  const [page, setPage] = useState(1);
  const inbox = useInbox(page);
  const mark = useMarkInboxRead();
  const data = inbox.data;

  return (
    <Screen
      title="Notifications"
      subtitle={data ? `${data.unread} unread` : undefined}
      right={
        data?.unread ? (
          <Button label="Mark all read" variant="secondary" size="sm" loading={mark.isPending} onPress={() => mark.mutate({ all: true })} />
        ) : undefined
      }
      testID="inbox-screen"
    >
      <VStack gap={10}>
        {inbox.isLoading ? <Skeleton height={120} /> : null}
        {inbox.error ? <ErrorState error={inbox.error} onRetry={() => void inbox.refetch()} /> : null}
        {data && data.items.length === 0 ? <EmptyState icon={Bell} title="Nothing yet" /> : null}
        {data?.items.map((n) => (
          <Card
            key={n.id}
            onPress={n.read ? undefined : () => mark.mutate({ ids: [n.id] })}
            style={n.read ? undefined : { borderLeftWidth: 3, borderLeftColor: palette.primary[600] }}
            testID={`inbox-${n.type}`}
          >
            <HStack gap={10} align="flex-start">
              <VStack gap={2} flex={1}>
                <Text variant="label-lg" tone={n.read ? "secondary" : "primary"}>
                  {n.title}
                </Text>
                <Text variant="body-sm" tone="secondary">
                  {n.body}
                </Text>
              </VStack>
              <Text variant="caption" tone="tertiary">
                {formatRelative(n.createdAt)}
              </Text>
            </HStack>
          </Card>
        ))}
        {data && data.total > data.limit ? (
          <Pagination
            page={page}
            totalPages={Math.ceil(data.total / data.limit)}
            total={data.total}
            limit={data.limit}
            onPageChange={setPage}
          />
        ) : null}
      </VStack>
    </Screen>
  );
}

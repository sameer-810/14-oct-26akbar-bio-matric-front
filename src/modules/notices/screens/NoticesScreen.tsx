import React, { useState } from "react";
import { Megaphone } from "lucide-react-native";

import { Screen, VStack, Button, Banner, Skeleton, ErrorState, EmptyState, ToggleRow } from "@shared/ui";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { academyToday } from "@shared/format";
import { useNotices } from "../hooks/useNotices";
import { NoticeCard } from "../components/NoticeCard";
import { NoticeForm } from "../components/NoticeForm";

/**
 * The notice board: holidays, parents' meetings, functions. Families see the
 * ones for them in their app; posting can also put it on their phones, which
 * the old "Gateway" broadcast promised and never did.
 */
export default function NoticesScreen() {
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.NOTICES_MANAGE) || s.hasPermission(PERMISSIONS.MESSAGES_BROADCAST));
  const [today] = useState(() => academyToday());
  const [showExpired, setShowExpired] = useState(false);
  const [adding, setAdding] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const list = useNotices({ includeExpired: showExpired });
  // the server sorts this way too; kept here so an edit to "pinned" never reorders oddly
  const notices = [...(list.data ?? [])].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <Screen
      title="Notice board"
      subtitle="Holidays, meetings and news for staff and families."
      right={canManage && !adding ? <Button label="Post a notice" onPress={() => setAdding(true)} testID="notice-new" /> : undefined}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      testID="notices-screen"
    >
      <VStack gap={12}>
        {done ? <Banner tone="success" message={done} onDismiss={() => setDone(null)} /> : null}
        {adding ? (
          <NoticeForm
            onDone={(text) => {
              setAdding(false);
              setDone(text ?? null);
            }}
          />
        ) : null}
        <ToggleRow label="Show expired" hint="Notices past their last day." value={showExpired} onChange={setShowExpired} testID="notices-show-expired" />
        {list.isLoading ? <Skeleton height={140} /> : null}
        {list.error ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
        {list.data && notices.length === 0 ? (
          <EmptyState icon={Megaphone} title="No notices" message={canManage ? "Post one for everyone or for some batches." : undefined} />
        ) : null}
        {notices.map((n) => (
          <NoticeCard key={n.id} notice={n} canManage={canManage} today={today} />
        ))}
      </VStack>
    </Screen>
  );
}

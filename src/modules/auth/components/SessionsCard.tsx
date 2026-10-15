import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MonitorSmartphone } from "lucide-react-native";

import { Card, VStack, SectionHeader, ListRow, Button, ConfirmDialog, ErrorState, Skeleton, StatusChip } from "@shared/ui";
import { useAuthStore } from "@shared/store/useAuthStore";
import { palette } from "@shared/designSystem";
import { formatRelative } from "@shared/format";
import { authApi } from "../api/authApi";
import type { SessionRow } from "../types";

/** Where this account is signed in, with a remote sign-out for a lost phone. */
export function SessionsCard() {
  const audience = useAuthStore((s) => s.audience) ?? "staff";
  const qc = useQueryClient();
  const sessions = useQuery({ queryKey: ["sessions", audience], queryFn: () => authApi.sessions(audience) });
  const [target, setTarget] = useState<SessionRow | null>(null);
  const revoke = useMutation({
    mutationFn: (id: string) => authApi.revokeSession(audience, id),
    onSuccess: () => {
      setTarget(null);
      void qc.invalidateQueries({ queryKey: ["sessions", audience] });
    },
  });

  return (
    <Card>
      <VStack gap={8}>
        <SectionHeader title="Signed in on" subtitle="Sign out a phone or computer you no longer use." />
        {sessions.isLoading ? <Skeleton height={48} /> : null}
        {sessions.error ? <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} /> : null}
        {(sessions.data ?? []).map((s) => (
          <ListRow
            key={s.id}
            title={s.deviceName}
            subtitle={`Last used ${formatRelative(s.lastUsedAt)}${s.ip ? ` · ${s.ip}` : ""}`}
            leading={<MonitorSmartphone size={18} color={palette.text.tertiary} />}
            right={
              s.current ? (
                <StatusChip status="This device" size="sm" />
              ) : (
                <Button label="Sign out" size="xs" variant="secondary" onPress={() => setTarget(s)} />
              )
            }
          />
        ))}
      </VStack>
      <ConfirmDialog
        visible={Boolean(target)}
        title="Sign out that device?"
        message={target ? `${target.deviceName} will need the password to sign in again.` : undefined}
        confirmLabel="Sign out"
        destructive
        loading={revoke.isPending}
        onConfirm={() => target && revoke.mutate(target.id)}
        onCancel={() => setTarget(null)}
      />
    </Card>
  );
}

import React, { useState } from "react";
import { Platform, Linking } from "react-native";
import { FileText } from "lucide-react-native";

import { Screen, VStack, Button, Banner, Skeleton, ErrorState, EmptyState } from "@shared/ui";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { apiErrorMessage } from "@api/apiClient";
import { environment } from "@config/env";
import { documentsApi } from "../api/documentsApi";
import { useDocuments } from "../hooks/useDocuments";
import { useFilePicker } from "../hooks/useFilePicker";
import { DocumentCard } from "../components/DocumentCard";
import { DocumentForm } from "../components/DocumentForm";

/**
 * Worksheets, notes and circulars shared with families — the old "Share
 * Documents". Opening asks for a ten-minute link the browser or the phone's
 * viewer opens directly, so the file never passes through the app's memory.
 */
export default function DocumentsScreen() {
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.NOTICES_MANAGE));
  const docs = useDocuments();
  const picker = useFilePicker({ enabled: canManage });
  const [adding, setAdding] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  async function open(id: string) {
    setError(null);
    setOpening(id);
    try {
      const { url } = await documentsApi.link(id);
      const full = `${environment.apiUrl}${url}`;
      if (Platform.OS === "web") window.open(full, "_blank", "noopener");
      else await Linking.openURL(full);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setOpening(null);
    }
  }

  return (
    <Screen
      title="Documents"
      subtitle="Worksheets, notes and circulars shared with families."
      right={canManage && !adding ? <Button label="Share a document" onPress={() => setAdding(true)} testID="document-new" /> : undefined}
      refreshing={docs.isRefetching}
      onRefresh={() => void docs.refetch()}
      testID="documents-screen"
    >
      <VStack gap={12}>
        {done ? <Banner tone="success" message={done} onDismiss={() => setDone(null)} /> : null}
        {error ? <Banner tone="danger" message={error} onDismiss={() => setError(null)} /> : null}
        {adding ? (
          <DocumentForm
            picker={picker}
            onDone={(text) => {
              setAdding(false);
              setDone(text ?? null);
            }}
          />
        ) : null}
        {docs.isLoading ? <Skeleton height={120} /> : null}
        {docs.error ? <ErrorState error={docs.error} onRetry={() => void docs.refetch()} /> : null}
        {docs.data && docs.data.length === 0 ? (
          <EmptyState icon={FileText} title="Nothing shared yet" message={canManage ? "Share a worksheet or a circular with everyone or some batches." : undefined} />
        ) : null}
        {(docs.data ?? []).map((d) => (
          <DocumentCard key={d.id} doc={d} canManage={canManage} opening={opening === d.id} onOpen={() => void open(d.id)} />
        ))}
      </VStack>
    </Screen>
  );
}

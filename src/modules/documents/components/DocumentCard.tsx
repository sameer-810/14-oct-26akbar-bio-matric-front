import React, { useState } from "react";
import { FileText, Image as ImageIcon } from "lucide-react-native";
import { Card, VStack, HStack, Text, Button, Banner, ConfirmDialog } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { apiErrorMessage } from "@api/apiClient";
import { formatDateTime } from "@shared/format";
import { audienceLabel } from "@modules/notices/components/AudiencePicker";
import { useDocumentActions } from "../hooks/useDocuments";
import { formatSize, type SharedDocument } from "../types";

/** One shared file: what it is, who it is for, and a way to open it. */
export function DocumentCard({
  doc: d,
  canManage,
  opening,
  onOpen,
}: {
  doc: SharedDocument;
  canManage: boolean;
  opening: boolean;
  onOpen: () => void;
}) {
  const act = useDocumentActions();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const Icon = d.mimeType === "application/pdf" ? FileText : ImageIcon;

  async function remove() {
    try {
      await act.remove.mutateAsync(d.id);
      setConfirming(false);
    } catch (err) {
      setConfirming(false);
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card testID={`document-card-${d.title}`}>
      <VStack gap={8}>
        <HStack gap={12} align="flex-start">
          <Icon size={22} color={palette.text.secondary} />
          <VStack gap={4} flex={1}>
            <Text variant="h3">{d.title}</Text>
            {d.description ? <Text variant="body-sm">{d.description}</Text> : null}
            <Text variant="caption" tone="secondary">
              {d.fileName} · {formatSize(d.size)}
            </Text>
            <Text variant="body-sm" tone="secondary">
              For: {audienceLabel(d)}
            </Text>
            <Text variant="caption" tone="tertiary">
              Shared {formatDateTime(d.createdAt)}
              {d.familiesTold ? ` · ${d.familiesTold} famil${d.familiesTold === 1 ? "y" : "ies"} told` : ""}
            </Text>
          </VStack>
        </HStack>
        {error ? <Banner tone="danger" message={error} onDismiss={() => setError(null)} /> : null}
        <HStack gap={8} wrap>
          <Button label="Open" size="xs" variant="secondary" onPress={onOpen} loading={opening} testID={`document-open-${d.title}`} />
          {canManage ? <Button label="Remove" size="xs" variant="ghost" onPress={() => setConfirming(true)} testID="document-remove" /> : null}
        </HStack>
      </VStack>
      <ConfirmDialog
        visible={confirming}
        title="Remove this document?"
        message={`"${d.title}" and its file are deleted. Families can no longer open it.`}
        confirmLabel="Remove"
        destructive
        loading={act.remove.isPending}
        onConfirm={() => void remove()}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  );
}

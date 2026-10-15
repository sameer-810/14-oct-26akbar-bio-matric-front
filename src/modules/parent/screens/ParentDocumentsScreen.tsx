import React, { useState } from "react";
import { View, Platform, Linking, StyleSheet } from "react-native";
import { FileText, Image as ImageIcon } from "lucide-react-native";

import { Screen, Card, VStack, HStack, Text, Button, Banner, Skeleton, ErrorState, EmptyState, useBreakpoint } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { apiErrorMessage } from "@api/apiClient";
import { environment } from "@config/env";
import { formatRelative } from "@shared/format";
import { parentApi } from "../api/parentApi";
import { useFamilyDocuments } from "../hooks/useParent";

const sizeOf = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

/**
 * Worksheets and notes shared with this family. Opening asks the server for
 * a ten-minute link, which the phone's viewer or a browser tab opens directly.
 */
export default function ParentDocumentsScreen() {
  const { isWide } = useBreakpoint();
  const docs = useFamilyDocuments();
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  async function open(id: string) {
    setError(null);
    setOpening(id);
    try {
      const { url } = await parentApi.documentLink(id);
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
    <Screen title="Documents" onRefresh={() => void docs.refetch()} refreshing={docs.isRefetching} testID="parent-documents">
      <View style={[styles.wrap, isWide && styles.wrapWide]}>
        <VStack gap={12}>
          {error ? <Banner tone="danger" message={error} onDismiss={() => setError(null)} /> : null}
          {docs.isLoading ? <Skeleton height={120} /> : null}
          {docs.error ? <ErrorState error={docs.error} onRetry={() => void docs.refetch()} /> : null}
          {docs.data?.length === 0 ? <EmptyState icon={FileText} title="Nothing shared yet" /> : null}
          {(docs.data ?? []).map((d) => {
            const Icon = d.mimeType === "application/pdf" ? FileText : ImageIcon;
            return (
              <Card key={d.id} testID={`parent-document-${d.title}`}>
                <HStack gap={12} align="center">
                  <Icon size={22} color={palette.text.secondary} />
                  <VStack gap={2} flex={1}>
                    <Text variant="label">{d.title}</Text>
                    {d.description ? (
                      <Text variant="body-sm" tone="secondary">
                        {d.description}
                      </Text>
                    ) : null}
                    <Text variant="caption" tone="tertiary">
                      {d.fileName} · {sizeOf(d.size)} · {formatRelative(d.createdAt)}
                    </Text>
                  </VStack>
                  <Button label="Open" size="sm" variant="secondary" loading={opening === d.id} onPress={() => void open(d.id)} testID={`parent-document-open-${d.title}`} />
                </HStack>
              </Card>
            );
          })}
        </VStack>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignSelf: "center" },
  wrapWide: { maxWidth: 640 },
});

import React, { useState } from "react";
import { Card, VStack, HStack, Text, Button, Banner, SectionHeader, TextField, ToggleRow } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { AudiencePicker } from "@modules/notices/components/AudiencePicker";
import { useDocumentActions } from "../hooks/useDocuments";
import { formatSize, type PickedFile } from "../types";

/**
 * Share one PDF or picture with everyone or some batches. The file is chosen
 * through the screen's picker, so a file set before the form opened is kept.
 */
export function DocumentForm({
  picker,
  onDone,
}: {
  picker: { file: PickedFile | null; error: string | null; choose: () => Promise<void>; clear: () => void };
  onDone: (message?: string) => void;
}) {
  const act = useDocumentActions();
  const [v, setV] = useState({ title: "", description: "", batchIds: [] as string[], notify: true });
  const [error, setError] = useState<string | null>(null);
  const file = picker.file;

  async function submit() {
    setError(null);
    if (!file) {
      setError("Choose the file to share.");
      return;
    }
    try {
      const d = await act.share.mutateAsync({
        title: v.title.trim(),
        description: v.description.trim() || undefined,
        batchIds: v.batchIds,
        notify: v.notify,
        file,
      });
      picker.clear();
      onDone(d.familiesTold ? `Shared, and ${d.familiesTold} famil${d.familiesTold === 1 ? "y was" : "ies were"} told.` : "Shared.");
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card testID="document-form">
      <VStack gap={12}>
        <SectionHeader title="Share a document" subtitle="A PDF, JPG or PNG up to 10 MB." />
        {error ? <Banner tone="danger" message={error} onDismiss={() => setError(null)} /> : null}
        <TextField label="Title" value={v.title} onChangeText={(t) => setV({ ...v, title: t })} placeholder="Algebra worksheet 3" maxLength={120} testID="document-title" />
        <TextField
          label="Description"
          value={v.description}
          onChangeText={(t) => setV({ ...v, description: t })}
          placeholder="Optional — what it is and when it is due"
          multiline
          maxLength={500}
          testID="document-description"
        />
        <VStack gap={6}>
          <HStack gap={12} align="center" wrap>
            <Button label={file ? "Choose another file" : "Choose file"} variant="secondary" size="sm" onPress={() => void picker.choose()} testID="document-file" />
            {file ? (
              <Text variant="body-sm" testID="document-file-chosen">
                {file.name} · {formatSize(file.size)}
              </Text>
            ) : (
              <Text variant="body-sm" tone="tertiary">
                No file chosen
              </Text>
            )}
          </HStack>
          {picker.error ? <Banner tone="danger" message={picker.error} /> : null}
        </VStack>
        <AudiencePicker value={{ batchIds: v.batchIds }} onChange={(a) => setV({ ...v, batchIds: a.batchIds })} />
        <ToggleRow
          label="Tell the families"
          hint="Each family it is for gets an alert to open it in the app."
          value={v.notify}
          onChange={(n) => setV({ ...v, notify: n })}
          testID="document-notify"
        />
        <HStack gap={8}>
          <Button label="Share" onPress={submit} loading={act.share.isPending} disabled={v.title.trim().length < 2 || !file} testID="document-save" />
          <Button label="Cancel" variant="ghost" onPress={() => onDone()} />
        </HStack>
      </VStack>
    </Card>
  );
}

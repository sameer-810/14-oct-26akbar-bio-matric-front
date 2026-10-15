import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Card, VStack, HStack, Text, Button, Banner, SectionHeader, TextField, StatusChip } from "@shared/ui";
import { palette, radius } from "@shared/designSystem";
import { apiErrorMessage } from "@api/apiClient";
import { useStandards, useCreateStandard, useUpdateStandard } from "../hooks/useAcademy";
import type { Standard, Subject } from "../types";

const pad = (n: number, w: number) => String(n).padStart(w, "0");

/** Standards with their GR numbering and subjects. */
export function StandardsPanel() {
  const standards = useStandards();
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <VStack gap={16}>
      {(standards.data ?? []).map((s) =>
        editing === s.id ? (
          <StandardForm key={s.id} standard={s} onDone={() => setEditing(null)} />
        ) : (
          <Card key={s.id} onPress={() => setEditing(s.id)} accessibilityLabel={`Edit ${s.name}`}>
            <VStack gap={6}>
              <HStack gap={8} align="center" wrap>
                <Text variant="h3">{s.name}</Text>
                <Text variant="caption" tone="tertiary">
                  code {s.code}
                </Text>
                {!s.isActive ? <StatusChip status="inactive" size="sm" /> : null}
              </HStack>
              <Text variant="body-sm" tone="secondary">
                GR numbers {s.grPrefix}
                {pad(s.grStartAt, s.grPadding)} onwards
              </Text>
              <Text variant="body-sm" tone="secondary">
                {s.subjects.length ? s.subjects.map((x) => x.shortName || x.name).join(" · ") : "No subjects yet"}
              </Text>
            </VStack>
          </Card>
        ),
      )}
      {editing === "new" ? (
        <StandardForm onDone={() => setEditing(null)} />
      ) : (
        <Button label="Add a standard" variant="secondary" onPress={() => setEditing("new")} testID="standard-new" />
      )}
    </VStack>
  );
}

function StandardForm({ standard, onDone }: { standard?: Standard; onDone: () => void }) {
  const create = useCreateStandard();
  const update = useUpdateStandard();
  const [v, setV] = useState({
    name: standard?.name ?? "",
    code: standard?.code ?? "",
    grPrefix: standard?.grPrefix ?? "",
    grStartAt: String(standard?.grStartAt ?? 1),
    grPadding: String(standard?.grPadding ?? 3),
    subjects: standard?.subjects ?? ([] as Subject[]),
  });
  const [error, setError] = useState<string | null>(null);
  const preview = v.grPrefix ? `${v.grPrefix}${pad(Number(v.grStartAt) || 1, Number(v.grPadding) || 3)}` : "—";

  async function save() {
    setError(null);
    const body = {
      name: v.name,
      grPrefix: v.grPrefix,
      grStartAt: Number(v.grStartAt) || 1,
      grPadding: Number(v.grPadding) || 3,
      subjects: v.subjects.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), shortName: s.shortName.trim() })),
    };
    try {
      if (standard) await update.mutateAsync({ id: standard.id, ...body });
      else await create.mutateAsync({ ...body, code: v.code });
      onDone();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card>
      <VStack gap={12}>
        <SectionHeader title={standard ? `Edit ${standard.name}` : "New standard"} />
        {error ? <Banner tone="danger" message={error} /> : null}
        <HStack gap={12} wrap>
          <TextField label="Name" value={v.name} onChangeText={(t) => setV({ ...v, name: t })} placeholder="Std. 12 (SCI)" containerStyle={{ flex: 2, minWidth: 200 }} testID="std-name" />
          <TextField
            label="Code"
            value={v.code}
            onChangeText={(t) => setV({ ...v, code: t.toUpperCase() })}
            editable={!standard}
            hint={standard ? "Fixed once created" : "e.g. 12SCI"}
            containerStyle={{ flex: 1, minWidth: 120 }}
            testID="std-code"
          />
        </HStack>
        <HStack gap={12} wrap>
          <TextField label="GR prefix" value={v.grPrefix} onChangeText={(t) => setV({ ...v, grPrefix: t.replace(/\D/g, "") })} keyboardType="number-pad" containerStyle={{ flex: 1, minWidth: 110 }} testID="std-prefix" />
          <TextField label="First number" value={v.grStartAt} onChangeText={(t) => setV({ ...v, grStartAt: t.replace(/\D/g, "") })} keyboardType="number-pad" containerStyle={{ flex: 1, minWidth: 110 }} testID="std-start" />
          <TextField label="Digits" value={v.grPadding} onChangeText={(t) => setV({ ...v, grPadding: t.replace(/\D/g, "").slice(0, 1) })} keyboardType="number-pad" containerStyle={{ flex: 1, minWidth: 90 }} />
        </HStack>
        <Text variant="caption" tone="tertiary">
          The first new admission here gets GR {preview}. Imported students keep their own numbers.
        </Text>

        <Text variant="label">Subjects</Text>
        {v.subjects.map((s, i) => (
          <View key={i} style={styles.subjectRow}>
            <TextField
              value={s.name}
              onChangeText={(t) => setV({ ...v, subjects: v.subjects.map((x, j) => (j === i ? { ...x, name: t } : x)) })}
              placeholder="Subject"
              accessibilityLabel={`Subject ${i + 1}`}
              containerStyle={{ flex: 2 }}
            />
            <TextField
              value={s.shortName}
              onChangeText={(t) => setV({ ...v, subjects: v.subjects.map((x, j) => (j === i ? { ...x, shortName: t } : x)) })}
              placeholder="Short"
              accessibilityLabel={`Short name ${i + 1}`}
              containerStyle={{ flex: 1 }}
            />
            <Button label="Remove" size="xs" variant="ghost" onPress={() => setV({ ...v, subjects: v.subjects.filter((_, j) => j !== i) })} />
          </View>
        ))}
        {v.subjects.length < 15 ? (
          <Button label="Add subject" size="sm" variant="secondary" onPress={() => setV({ ...v, subjects: [...v.subjects, { name: "", shortName: "" }] })} />
        ) : null}

        <HStack gap={8}>
          <Button label="Save" onPress={save} loading={create.isPending || update.isPending} testID="std-save" />
          <Button label="Cancel" variant="ghost" onPress={onDone} />
        </HStack>
      </VStack>
    </Card>
  );
}

const styles = StyleSheet.create({
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 6,
    borderRadius: radius.sm,
    backgroundColor: palette.surface.secondary,
  },
});

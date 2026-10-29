import React, { useState } from "react";
import { Card, VStack, HStack, Button, Banner, SectionHeader, TextField, Select, Text, ToggleRow } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { useStandards, useCreateBatch, useUpdateBatch } from "../hooks/useAcademy";
import type { Batch, DayKey } from "../types";
import { DaysPicker } from "./DaysPicker";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Create or edit a batch. The times are what make a punch "present" or
 * "late", so a timing change is shown to the person making it, and the server
 * keeps the old value in the audit trail.
 */
export function BatchForm({ batch, onDone }: { batch?: Batch; onDone: () => void }) {
  const standards = useStandards();
  const create = useCreateBatch();
  const update = useUpdateBatch();
  const [v, setV] = useState({
    name: batch?.name ?? "",
    standardId: batch?.standardId ?? "",
    startTime: batch?.startTime ?? "15:30",
    endTime: batch?.endTime ?? "18:30",
    workingDays: batch?.workingDays ?? (["mon", "tue", "wed", "thu", "fri", "sat"] as DayKey[]),
    room: batch?.room ?? "",
    isActive: batch?.isActive ?? true,
  });
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!TIME.test(v.startTime) || !TIME.test(v.endTime)) {
      setError("Write times as 24-hour HH:mm, for example 15:30.");
      return;
    }
    try {
      if (batch) {
        await update.mutateAsync({
          id: batch.id,
          name: v.name,
          startTime: v.startTime,
          endTime: v.endTime,
          workingDays: v.workingDays,
          room: v.room,
          isActive: v.isActive,
        });
      } else {
        await create.mutateAsync({
          name: v.name,
          standardId: v.standardId,
          startTime: v.startTime,
          endTime: v.endTime,
          workingDays: v.workingDays,
          room: v.room,
        });
      }
      onDone();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  const timingChanged = batch && (batch.startTime !== v.startTime || batch.endTime !== v.endTime);

  return (
    <Card>
      <VStack gap={12}>
        <SectionHeader title={batch ? `Edit ${batch.name}` : "New batch"} />
        {error ? <Banner tone="danger" message={error} /> : null}
        <TextField label="Name" value={v.name} onChangeText={(t) => setV({ ...v, name: t })} placeholder="Std. 10 – B1" testID="batch-name" />
        {!batch ? (
          <Select
            label="Standard"
            value={v.standardId || null}
            options={(standards.data ?? []).filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name }))}
            onChange={(id) => setV({ ...v, standardId: id })}
            placeholder="Choose a standard"
          />
        ) : null}
        <HStack gap={12} wrap>
          <TextField label="Starts" value={v.startTime} onChangeText={(t) => setV({ ...v, startTime: t })} placeholder="15:30" containerStyle={{ flex: 1, minWidth: 120 }} testID="batch-start" />
          <TextField label="Ends" value={v.endTime} onChangeText={(t) => setV({ ...v, endTime: t })} placeholder="18:30" containerStyle={{ flex: 1, minWidth: 120 }} testID="batch-end" />
          <TextField label="Room" value={v.room} onChangeText={(t) => setV({ ...v, room: t })} containerStyle={{ flex: 1, minWidth: 120 }} />
        </HStack>
        {timingChanged ? (
          <Text variant="caption" tone="warning">
            New timing applies to attendance from now on. Past days keep the timing they were marked with.
          </Text>
        ) : null}
        <Text variant="label">Meets on</Text>
        <DaysPicker value={v.workingDays} onChange={(d) => setV({ ...v, workingDays: d })} />
        {batch ? <ToggleRow label="Active" hint="An inactive batch is never marked absent." value={v.isActive} onChange={(b) => setV({ ...v, isActive: b })} /> : null}
        <HStack gap={8}>
          <Button label="Save batch" onPress={save} loading={create.isPending || update.isPending} testID="batch-save" />
          <Button label="Cancel" variant="ghost" onPress={onDone} />
        </HStack>
      </VStack>
    </Card>
  );
}

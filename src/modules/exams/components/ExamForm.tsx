import React, { useState } from "react";
import { Card, VStack, HStack, Text, Button, Banner, SectionHeader, TextField, Select } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { useBatches, useStandards } from "@modules/academy/hooks/useAcademy";
import { useExamActions } from "../hooks/useExams";
import type { Exam } from "../types";

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Set up a test (the old "Add exam"): one standard, any of its batches, one
 * day. The pass mark is left to the server's 35% unless the teacher sets one.
 */
export function ExamForm({ onDone }: { onDone: (created?: Exam) => void }) {
  const act = useExamActions();
  const standards = useStandards();
  const [v, setV] = useState({
    name: "",
    subject: "",
    standardId: "",
    batchIds: [] as string[],
    date: "",
    startTime: "",
    maxMarks: "",
    passingMarks: "",
    topics: "",
  });
  const batches = useBatches({ standardId: v.standardId }, { enabled: Boolean(v.standardId) });
  const [error, setError] = useState<string | null>(null);

  const max = Number(v.maxMarks);
  const maxOk = Number.isInteger(max) && max >= 1 && max <= 1000;
  const standardBatches = v.standardId ? (batches.data ?? []).filter((b) => b.isActive && b.standardId === v.standardId) : [];

  const toggleBatch = (id: string) =>
    setV((s) => ({ ...s, batchIds: s.batchIds.includes(id) ? s.batchIds.filter((b) => b !== id) : [...s.batchIds, id] }));

  async function submit() {
    setError(null);
    const name = v.name.trim();
    if (name.length < 2) return setError("Give the test a name, for example \"Unit test 3\".");
    if (!v.standardId || v.batchIds.length === 0) return setError("Choose the standard and at least one batch.");
    if (!YMD.test(v.date.trim())) return setError("Write the date as YYYY-MM-DD, for example 2026-10-20.");
    if (v.startTime.trim() && !HHMM.test(v.startTime.trim())) return setError("Write the start time as HH:MM on the 24-hour clock, for example 16:30.");
    if (!maxOk) return setError("Maximum marks must be a whole number from 1 to 1000.");
    let passingMarks: number | undefined;
    if (v.passingMarks.trim()) {
      passingMarks = Number(v.passingMarks.trim());
      if (!Number.isFinite(passingMarks) || passingMarks < 0 || !Number.isInteger(passingMarks * 2)) {
        return setError("The pass mark must be a whole or half mark.");
      }
      if (passingMarks > max) return setError("The pass mark is above the maximum.");
    }
    try {
      const created = await act.create.mutateAsync({
        name,
        subject: v.subject.trim() || undefined,
        standardId: v.standardId,
        batchIds: v.batchIds,
        date: v.date.trim(),
        startTime: v.startTime.trim() || undefined,
        maxMarks: max,
        passingMarks,
        topics: v.topics.trim() || undefined,
      });
      onDone(created);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card testID="exam-form">
      <VStack gap={12}>
        <SectionHeader title="New test" />
        {error ? <Banner tone="danger" message={error} onDismiss={() => setError(null)} /> : null}
        <HStack gap={12} wrap>
          <TextField
            label="Name"
            value={v.name}
            onChangeText={(t) => setV({ ...v, name: t })}
            placeholder="Unit test 3"
            maxLength={80}
            containerStyle={{ flex: 2, minWidth: 200 }}
            testID="exam-name"
          />
          <TextField
            label="Subject"
            value={v.subject}
            onChangeText={(t) => setV({ ...v, subject: t })}
            placeholder="Optional"
            maxLength={60}
            containerStyle={{ flex: 1, minWidth: 160 }}
            testID="exam-subject"
          />
        </HStack>
        <Select
          label="Standard"
          value={v.standardId || null}
          options={(standards.data ?? []).filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name }))}
          // batches belong to one standard, so a new standard starts the choice again
          onChange={(id) => setV({ ...v, standardId: id, batchIds: [] })}
          placeholder="Choose a standard"
        />
        {v.standardId ? (
          <VStack gap={6}>
            <Text variant="label">Batches</Text>
            {batches.isLoading ? <Text variant="caption" tone="tertiary">Loading batches…</Text> : null}
            {batches.data && standardBatches.length === 0 ? (
              <Text variant="caption" tone="warning">This standard has no active batches.</Text>
            ) : null}
            <HStack gap={8} wrap role="group" accessibilityLabel="Batches">
              {standardBatches.map((b) => {
                const on = v.batchIds.includes(b.id);
                return (
                  <Button
                    key={b.id}
                    label={b.name}
                    size="sm"
                    variant={on ? "primary" : "secondary"}
                    accessibilityHint={on ? "In this test. Press to leave it out." : "Not in this test. Press to add it."}
                    onPress={() => toggleBatch(b.id)}
                    testID={`exam-batch-${b.name}`}
                  />
                );
              })}
            </HStack>
          </VStack>
        ) : null}
        <HStack gap={12} wrap>
          <TextField
            label="Date"
            value={v.date}
            onChangeText={(t) => setV({ ...v, date: t })}
            placeholder="YYYY-MM-DD"
            containerStyle={{ width: 150 }}
            testID="exam-date"
          />
          <TextField
            label="Starts"
            value={v.startTime}
            onChangeText={(t) => setV({ ...v, startTime: t })}
            placeholder="Optional, 16:00"
            containerStyle={{ width: 150 }}
            testID="exam-start"
          />
          <TextField
            label="Maximum marks"
            value={v.maxMarks}
            onChangeText={(t) => setV({ ...v, maxMarks: t })}
            placeholder="50"
            numericField
            keyboardType="number-pad"
            containerStyle={{ width: 150 }}
            testID="exam-max"
          />
          <TextField
            label="Pass mark"
            value={v.passingMarks}
            onChangeText={(t) => setV({ ...v, passingMarks: t })}
            placeholder="Optional"
            hint={maxOk ? `35% if empty (${Math.ceil(max * 0.35)})` : "35% if empty"}
            numericField
            keyboardType="decimal-pad"
            containerStyle={{ width: 150 }}
            testID="exam-pass"
          />
        </HStack>
        <TextField
          label="Topics"
          value={v.topics}
          onChangeText={(t) => setV({ ...v, topics: t })}
          placeholder="Optional — sent to families with the announcement"
          maxLength={300}
          testID="exam-topics"
        />
        <HStack gap={8}>
          <Button label="Save test" onPress={submit} loading={act.create.isPending} testID="exam-save" />
          <Button label="Cancel" variant="ghost" onPress={() => onDone()} />
        </HStack>
      </VStack>
    </Card>
  );
}

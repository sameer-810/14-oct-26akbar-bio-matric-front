import React, { useState } from "react";
import { VStack, HStack, Text, Button } from "@shared/ui";
import { useBatches } from "@modules/academy/hooks/useAcademy";
import type { Audience } from "../types";

export type { Audience };

/** "Everyone", the batch names, or how many students — one line for a card. */
export function audienceLabel(item: { everyone: boolean; batchNames?: string[]; studentIds?: string[] }) {
  if (item.everyone) return "Everyone";
  const parts: string[] = [];
  const names = (item.batchNames ?? []).filter(Boolean);
  if (names.length) parts.push(names.join(", "));
  const students = item.studentIds?.length ?? 0;
  if (students) parts.push(`${students} student${students === 1 ? "" : "s"}`);
  return parts.join(" · ") || "Chosen batches";
}

/**
 * Who a notice or a document goes to: everyone, or the batches ticked here.
 * "Chosen batches" with none ticked still means everyone, so the hint says so
 * rather than letting someone think they narrowed it.
 */
export function AudiencePicker({ value, onChange, label = "For" }: { value: Audience; onChange: (v: Audience) => void; label?: string }) {
  const batches = useBatches();
  const [mode, setMode] = useState<"everyone" | "batches">(value.batchIds.length ? "batches" : "everyone");
  // inactive batches stay listed when an older item already names them
  const options = (batches.data ?? []).filter((b) => b.isActive || value.batchIds.includes(b.id));

  const toggle = (id: string) =>
    onChange({ batchIds: value.batchIds.includes(id) ? value.batchIds.filter((b) => b !== id) : [...value.batchIds, id] });

  return (
    <VStack gap={8}>
      <Text variant="label">{label}</Text>
      <HStack gap={8} wrap>
        <Button
          label="Everyone"
          size="sm"
          variant={mode === "everyone" ? "primary" : "secondary"}
          onPress={() => {
            setMode("everyone");
            if (value.batchIds.length) onChange({ batchIds: [] });
          }}
          testID="audience-everyone"
        />
        <Button
          label="Chosen batches"
          size="sm"
          variant={mode === "batches" ? "primary" : "secondary"}
          onPress={() => setMode("batches")}
          testID="audience-batches"
        />
      </HStack>
      {mode === "batches" ? (
        <VStack gap={6}>
          {batches.isLoading ? (
            <Text variant="caption" tone="tertiary">
              Loading batches…
            </Text>
          ) : null}
          <HStack gap={6} wrap>
            {options.map((b) => (
              <Button
                key={b.id}
                label={b.name}
                size="xs"
                variant={value.batchIds.includes(b.id) ? "primary" : "ghost"}
                onPress={() => toggle(b.id)}
                testID={`audience-batch-${b.name}`}
              />
            ))}
          </HStack>
          <Text variant="caption" tone="tertiary">
            {value.batchIds.length
              ? `${value.batchIds.length} batch${value.batchIds.length === 1 ? "" : "es"} chosen.`
              : "Tick at least one batch, or it goes to everyone."}
          </Text>
        </VStack>
      ) : null}
    </VStack>
  );
}

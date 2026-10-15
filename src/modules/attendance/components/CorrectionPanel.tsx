import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { VStack, HStack, Text, Button, TextField, ChipsRow, Banner } from "@shared/ui";
import { palette, radius } from "@shared/designSystem";
import { apiErrorMessage } from "@api/apiClient";
import { useAttendanceActions } from "../hooks/useAttendance";
import type { RegisterRow, DayStatus } from "../types";

/**
 * Two ways to fix a day, both with a reason the audit trail keeps:
 *   add the punch the machine missed — it goes through the same rules, or
 *   set the day by hand — the engine leaves a hand-set day alone.
 */
export function CorrectionPanel({ row, date, onDone }: { row: RegisterRow; date: string; onDone: () => void }) {
  const act = useAttendanceActions();
  const [mode, setMode] = useState<"punch" | "status">("punch");
  const [time, setTime] = useState("");
  const [status, setStatus] = useState<DayStatus>("present");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    try {
      if (mode === "punch") {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Write the time as HH:mm, for example 15:25");
        await act.manualPunch.mutateAsync({ studentId: row.studentId, date, time, reason });
      } else {
        await act.override.mutateAsync({ studentId: row.studentId, date, status, reason });
      }
      onDone();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <View style={styles.box} testID="correction-panel">
      <VStack gap={10}>
        <Text variant="label">Correct {row.name}</Text>
        {error ? <Banner tone="danger" message={error} /> : null}
        <ChipsRow
          chips={[
            { key: "punch", label: "Add a missed punch" },
            { key: "status", label: "Set the day" },
          ]}
          active={mode}
          onChange={(k) => setMode(k as "punch" | "status")}
        />
        {mode === "punch" ? (
          <TextField label="Time of the punch" value={time} onChangeText={setTime} placeholder="15:25" testID="correction-time" />
        ) : (
          <ChipsRow
            chips={(["present", "late", "absent", "leave"] as DayStatus[]).map((s) => ({ key: s, label: s[0].toUpperCase() + s.slice(1) }))}
            active={status}
            onChange={(k) => setStatus(k as DayStatus)}
          />
        )}
        <TextField label="Reason" value={reason} onChangeText={setReason} placeholder="Machine was off at 3:20" testID="correction-reason" />
        <HStack gap={8} wrap>
          <Button label="Save" onPress={save} loading={act.manualPunch.isPending || act.override.isPending} disabled={reason.trim().length < 3} testID="correction-save" />
          {row.source === "manual" ? (
            <Button
              label="Undo hand-set day"
              variant="secondary"
              onPress={async () => {
                await act.clearOverride.mutateAsync({ studentId: row.studentId, date });
                onDone();
              }}
            />
          ) : null}
          <Button label="Cancel" variant="ghost" onPress={onDone} />
        </HStack>
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.primary[200],
    backgroundColor: palette.primary[50],
  },
});

import React, { useState } from "react";
import { CalendarOff } from "lucide-react-native";
import {
  Screen,
  VStack,
  HStack,
  Card,
  Text,
  Button,
  TextField,
  Banner,
  SectionHeader,
  ListRow,
  ConfirmDialog,
  EmptyState,
  ToggleRow,
} from "@shared/ui";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { apiErrorMessage } from "@api/apiClient";
import { academyToday, formatDay } from "@shared/format";
import { useHolidays, useCreateHoliday, useRemoveHoliday, useBatches, useCurrentYear } from "../hooks/useAcademy";
import type { Holiday } from "../types";

/**
 * Days without class. Nobody is marked absent and no parent is messaged on a
 * holiday — so Diwali goes here before it arrives, not after.
 */
export default function HolidaysScreen() {
  const year = useCurrentYear();
  const holidays = useHolidays({ from: academyToday() });
  const batches = useBatches(year ? { academicYearId: year.id } : {});
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.BATCHES_MANAGE));
  const create = useCreateHoliday();
  const remove = useRemoveHoliday();
  const [form, setForm] = useState({ date: "", name: "", allBatches: true, batchIds: [] as string[] });
  const [target, setTarget] = useState<Holiday | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const batchName = (id: string) => batches.data?.find((b) => b.id === id)?.name ?? "a batch";

  async function add() {
    setMsg(null);
    try {
      await create.mutateAsync({ date: form.date, name: form.name, batchIds: form.allBatches ? [] : form.batchIds });
      setForm({ date: "", name: "", allBatches: true, batchIds: [] });
      setMsg({ tone: "success", text: "Holiday added. Nobody will be marked absent that day." });
    } catch (err) {
      setMsg({ tone: "danger", text: apiErrorMessage(err) });
    }
  }

  return (
    <Screen title="Holidays" subtitle="Upcoming days without class" testID="holidays-screen">
      <VStack gap={16}>
        {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
        <Card>
          <VStack gap={4}>
            {(holidays.data ?? []).map((h) => (
              <ListRow
                key={h.id}
                title={`${formatDay(h.date)} — ${h.name}`}
                subtitle={h.batchIds.length ? h.batchIds.map(batchName).join(", ") : "All batches"}
                right={canManage ? <Button label="Remove" size="xs" variant="ghost" onPress={() => setTarget(h)} /> : undefined}
              />
            ))}
            {holidays.data?.length === 0 ? <EmptyState icon={CalendarOff} title="No holidays coming up" /> : null}
          </VStack>
        </Card>
        {canManage ? (
          <Card>
            <VStack gap={12}>
              <SectionHeader title="Add a holiday" />
              <HStack gap={12} wrap>
                <TextField label="Date" value={form.date} onChangeText={(t) => setForm({ ...form, date: t })} placeholder="YYYY-MM-DD" containerStyle={{ flex: 1, minWidth: 150 }} testID="holiday-date" />
                <TextField label="Name" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="Diwali" containerStyle={{ flex: 2, minWidth: 200 }} testID="holiday-name" />
              </HStack>
              <ToggleRow label="Every batch" value={form.allBatches} onChange={(b) => setForm({ ...form, allBatches: b })} />
              {!form.allBatches ? (
                <HStack gap={6} wrap>
                  {(batches.data ?? []).map((b) => {
                    const on = form.batchIds.includes(b.id);
                    return (
                      <Button
                        key={b.id}
                        label={b.name}
                        size="xs"
                        variant={on ? "primary" : "secondary"}
                        onPress={() => setForm({ ...form, batchIds: on ? form.batchIds.filter((x) => x !== b.id) : [...form.batchIds, b.id] })}
                      />
                    );
                  })}
                </HStack>
              ) : null}
              <Button label="Add holiday" onPress={add} loading={create.isPending} testID="holiday-add" />
            </VStack>
          </Card>
        ) : (
          <Text variant="caption" tone="tertiary">
            Only a manager or the owner can add holidays.
          </Text>
        )}
      </VStack>
      <ConfirmDialog
        visible={Boolean(target)}
        title="Remove this holiday?"
        message={target ? `${target.name} becomes a normal class day again.` : undefined}
        confirmLabel="Remove"
        destructive
        loading={remove.isPending}
        onConfirm={async () => {
          if (target) await remove.mutateAsync(target.id);
          setTarget(null);
        }}
        onCancel={() => setTarget(null)}
      />
    </Screen>
  );
}

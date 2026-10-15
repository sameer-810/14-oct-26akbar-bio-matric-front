import React, { useState } from "react";
import { Card, VStack, HStack, Text, Button, Banner, SectionHeader, TextField, StatusChip, ListRow } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { useYears, useCreateYear, useMakeYearCurrent } from "../hooks/useAcademy";

/** Academic years. The current one is where new batches go and where admissions end by default. */
export function YearsPanel() {
  const years = useYears();
  const create = useCreateYear();
  const makeCurrent = useMakeYearCurrent();
  const [form, setForm] = useState({ label: "", startDate: "", endDate: "" });
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  // "2027-2028" fills the dates in: April to March, as the academy runs
  function onLabel(label: string) {
    const m = /^(\d{4})-(\d{4})$/.exec(label.trim());
    setForm(m ? { label, startDate: `${m[1]}-04-01`, endDate: `${m[2]}-03-31` } : { ...form, label });
  }

  async function run(fn: () => Promise<unknown>, ok: string) {
    setMsg(null);
    try {
      await fn();
      setMsg({ tone: "success", text: ok });
    } catch (err) {
      setMsg({ tone: "danger", text: apiErrorMessage(err) });
    }
  }

  return (
    <VStack gap={16}>
      {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
      <Card>
        <VStack gap={4}>
          <SectionHeader title="Academic years" />
          {(years.data ?? []).map((y) => (
            <ListRow
              key={y.id}
              title={y.label}
              subtitle={`${y.startDate} to ${y.endDate}`}
              right={
                y.isCurrent ? (
                  <StatusChip status="active" size="sm" />
                ) : (
                  <Button label="Make current" size="xs" variant="secondary" onPress={() => run(() => makeCurrent.mutateAsync(y.id), `${y.label} is now the current year.`)} />
                )
              }
            />
          ))}
          {years.data?.length === 0 ? <Text tone="tertiary">No academic year yet. Add the current one below.</Text> : null}
        </VStack>
      </Card>
      <Card>
        <VStack gap={12}>
          <SectionHeader title="Add a year" />
          <TextField label="Year" value={form.label} onChangeText={onLabel} placeholder="2027-2028" testID="year-label" />
          <HStack gap={12} wrap>
            <TextField label="Starts" value={form.startDate} onChangeText={(t) => setForm({ ...form, startDate: t })} placeholder="YYYY-MM-DD" containerStyle={{ flex: 1, minWidth: 160 }} />
            <TextField label="Ends" value={form.endDate} onChangeText={(t) => setForm({ ...form, endDate: t })} placeholder="YYYY-MM-DD" containerStyle={{ flex: 1, minWidth: 160 }} />
          </HStack>
          <Button
            label="Add year"
            loading={create.isPending}
            onPress={() =>
              run(async () => {
                await create.mutateAsync(form);
                setForm({ label: "", startDate: "", endDate: "" });
              }, "Year added.")
            }
            testID="year-add"
          />
        </VStack>
      </Card>
    </VStack>
  );
}

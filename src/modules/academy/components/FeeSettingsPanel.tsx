import React, { useState } from "react";
import { Card, VStack, HStack, Button, Banner, SectionHeader, ToggleRow, TextField, Text } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { formatDay } from "@shared/format";
import { useUpdateSettings } from "../hooks/useAcademy";
import type { InstituteSettings } from "../types";
import { NumberField } from "./NumberField";

type Draft = InstituteSettings["fees"];

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * What a receipt shows and how strict the desk is: the academy's GSTIN, the
 * GST rate by the date it took effect (fees are quoted including it), how
 * far back money may be dated, and fee reminders.
 */
export function FeeSettingsPanel({ settings }: { settings: InstituteSettings }) {
  const save = useUpdateSettings();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [rate, setRate] = useState({ percent: "", from: "" });
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const v: Draft = draft ?? settings.fees;
  const set = (patch: Partial<Draft>) => setDraft({ ...v, ...patch });

  function addRate() {
    const pct = Number(rate.percent);
    if (!ISO.test(rate.from) || !Number.isFinite(pct) || pct < 0 || pct > 50) {
      setMsg({ tone: "danger", text: "Give the GST % (for example 18) and the date it applies from (YYYY-MM-DD)." });
      return;
    }
    const others = v.taxRates.filter((r) => r.effectiveFrom !== rate.from);
    set({ taxRates: [...others, { rateBps: Math.round(pct * 100), effectiveFrom: rate.from }].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)) });
    setRate({ percent: "", from: "" });
  }

  async function submit() {
    setMsg(null);
    try {
      await save.mutateAsync({ fees: v });
      setDraft(null);
      setMsg({ tone: "success", text: "Saved. New receipts use these." });
    } catch (err) {
      setMsg({ tone: "danger", text: apiErrorMessage(err) });
    }
  }

  return (
    <VStack gap={16}>
      {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
      <Card>
        <VStack gap={12}>
          <SectionHeader title="On the receipt" />
          <TextField label="GSTIN" value={v.gstin} onChangeText={(t) => set({ gstin: t.toUpperCase().trim() })} placeholder="27AAAPA1234A1Z5" autoCapitalize="characters" testID="fees-gstin" />
          <TextField label="Note printed at the bottom" value={v.receiptNote} onChangeText={(t) => set({ receiptNote: t })} maxLength={300} />
        </VStack>
      </Card>

      <Card>
        <VStack gap={12}>
          <SectionHeader title="GST" subtitle="Fees are quoted including GST. Each receipt uses the rate in force on its date; a past receipt never changes." />
          {v.taxRates.length === 0 ? <Text tone="tertiary">No GST — receipts show the full amount as the fee.</Text> : null}
          {v.taxRates.map((r) => (
            <HStack key={r.effectiveFrom} gap={8} align="center">
              <Text style={{ flex: 1 }}>
                {r.rateBps / 100}% from {formatDay(r.effectiveFrom)}
              </Text>
              <Button label="Remove" size="xs" variant="ghost" onPress={() => set({ taxRates: v.taxRates.filter((x) => x !== r) })} />
            </HStack>
          ))}
          <HStack gap={8} wrap align="flex-end">
            <TextField label="GST %" value={rate.percent} onChangeText={(t) => setRate({ ...rate, percent: t })} keyboardType="decimal-pad" containerStyle={{ width: 100 }} testID="fees-gst-percent" />
            <TextField label="From" value={rate.from} onChangeText={(t) => setRate({ ...rate, from: t })} placeholder="YYYY-MM-DD" containerStyle={{ width: 150 }} testID="fees-gst-from" />
            <Button label="Add rate" variant="secondary" size="sm" onPress={addRate} testID="fees-gst-add" />
          </HStack>
        </VStack>
      </Card>

      <Card>
        <VStack gap={12}>
          <SectionHeader title="Desk rules and reminders" />
          <NumberField
            label="Receipts and expenses may be dated this many days back"
            value={v.backdateDays}
            onChange={(n) => set({ backdateDays: n })}
            suffix="days"
            max={60}
          />
          <ToggleRow
            label="Remind families about overdue fees"
            hint="A message in the app when an instalment's date has passed with money still due."
            value={v.reminders.enabled}
            onChange={(b) => set({ reminders: { ...v.reminders, enabled: b } })}
            testID="fees-reminders"
          />
          {v.reminders.enabled ? (
            <NumberField
              label="…and again every"
              value={v.reminders.everyDays}
              onChange={(n) => set({ reminders: { ...v.reminders, everyDays: Math.max(1, n) } })}
              suffix="days"
              max={60}
            />
          ) : null}
        </VStack>
      </Card>

      <HStack gap={8}>
        <Button label="Save" onPress={submit} loading={save.isPending} disabled={!draft} testID="fees-settings-save" />
        {draft ? <Button label="Undo changes" variant="ghost" onPress={() => setDraft(null)} /> : null}
      </HStack>
    </VStack>
  );
}

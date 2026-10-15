import React, { useState } from "react";
import { Card, VStack, HStack, Text, Button, Banner, SectionHeader, TextField, Select } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { academyToday, formatDay, formatRupees } from "@shared/format";
import { usePayRates, useRateActions } from "../hooks/usePayroll";
import { PAY_KIND_LABELS, type PayKind } from "../types";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The old "salary structure": hourly, per lecture or per subject, and a
 * fixed monthly salary. A change is a new rate from a date — past months
 * keep what they were paid at.
 */
export function PayRatesCard({ teacherId, canManage }: { teacherId: string; canManage: boolean }) {
  const rates = usePayRates(teacherId);
  const act = useRateActions(teacherId);
  const [form, setForm] = useState<{ effectiveFrom: string; kind: PayKind; rate: string; subjects: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!form) return;
    setError(null);
    if (!ISO.test(form.effectiveFrom)) return setError("Write the date as YYYY-MM-DD.");
    const rate = Number(form.rate);
    if (!Number.isInteger(rate) || rate < 0) return setError("Give the rate in whole rupees.");
    // "Physics 500, Maths 400"
    const subjectRates =
      form.kind === "per_subject"
        ? form.subjects
            .split(",")
            .map((x) => x.trim().match(/^(.+?)\s+(\d+)$/))
            .filter((x): x is RegExpMatchArray => Boolean(x))
            .map((x) => ({ subject: x[1], rate: Number(x[2]) }))
        : undefined;
    if (form.kind === "per_subject" && !subjectRates?.length) return setError('List subjects with their rates, for example "Physics 500, Maths 400".');
    try {
      await act.set.mutateAsync({ effectiveFrom: form.effectiveFrom, kind: form.kind, rate, subjectRates });
      setForm(null);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card testID="pay-rates">
      <VStack gap={10}>
        <SectionHeader
          title="Pay rate"
          right={
            canManage && !form ? (
              <Button
                label="Set a rate"
                size="xs"
                variant="secondary"
                onPress={() => setForm({ effectiveFrom: `${academyToday().slice(0, 7)}-01`, kind: "per_lecture", rate: "", subjects: "" })}
                testID="rate-new"
              />
            ) : undefined
          }
        />
        {(rates.data ?? []).map((r, i) => (
          <HStack key={r.id} gap={8} align="center" wrap>
            <VStack gap={2} flex={1}>
              <Text variant="body-sm" weight={i === 0 ? "600" : "400"}>
                {PAY_KIND_LABELS[r.kind]} · {formatRupees(r.rate)}
                {r.subjectRates.length ? ` (${r.subjectRates.map((s) => `${s.subject} ${formatRupees(s.rate)}`).join(", ")})` : ""}
              </Text>
              <Text variant="caption" tone="tertiary">
                From {formatDay(r.effectiveFrom)}
              </Text>
            </VStack>
            {canManage ? <Button label="Remove" size="xs" variant="ghost" onPress={() => act.remove.mutate(r.id)} /> : null}
          </HStack>
        ))}
        {rates.data?.length === 0 && !form ? <Text variant="body-sm" tone="tertiary">No rate yet — the salary report shows nothing for this teacher until one is set.</Text> : null}
        {error ? <Banner tone="danger" message={error} /> : null}
        {form ? (
          <VStack gap={10}>
            <Select
              label="How they are paid"
              value={form.kind}
              options={(Object.keys(PAY_KIND_LABELS) as PayKind[]).map((k) => ({ value: k, label: PAY_KIND_LABELS[k] }))}
              onChange={(k) => setForm({ ...form, kind: k as PayKind })}
            />
            <HStack gap={12} wrap>
              <TextField
                label={form.kind === "per_subject" ? "Other subjects" : form.kind === "monthly" ? "Per month" : form.kind === "hourly" ? "Per hour" : "Per lecture"}
                value={form.rate}
                onChangeText={(t) => setForm({ ...form, rate: t.replace(/\D/g, "") })}
                prefix="₹"
                keyboardType="number-pad"
                containerStyle={{ width: 160 }}
                testID="rate-amount"
              />
              <TextField label="From" value={form.effectiveFrom} onChangeText={(t) => setForm({ ...form, effectiveFrom: t })} containerStyle={{ width: 150 }} />
            </HStack>
            {form.kind === "per_subject" ? (
              <TextField label="Subjects and rates" value={form.subjects} onChangeText={(t) => setForm({ ...form, subjects: t })} placeholder="Physics 500, Maths 400" />
            ) : null}
            <HStack gap={8}>
              <Button label="Save rate" onPress={submit} loading={act.set.isPending} testID="rate-save" />
              <Button label="Cancel" variant="ghost" onPress={() => setForm(null)} />
            </HStack>
          </VStack>
        ) : null}
      </VStack>
    </Card>
  );
}

import React, { useState } from "react";
import { View } from "react-native";
import { Card, VStack, HStack, Text, Button, TextField, Select, Banner } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { formatPaise } from "@shared/format";
import { useStandards } from "@modules/academy/hooks/useAcademy";
import { useFeeActions } from "../hooks/useFees";
import { addMonthsTo, isDay, paiseToInput, readRupees, splitEvenly, sumPaise } from "../money";
import type { FeeItem, FeePlan, Instalment } from "../types";

type ItemDraft = { label: string; amount: string; kind?: FeeItem["kind"] };
type InstDraft = { label: string; dueDate: string; amount: string };

interface Props {
  academicYearId: string;
  /** the first instalment's date when splitting, if none is typed yet */
  yearStart: string;
  plan?: FeePlan;
  onDone: (saved: FeePlan | null) => void;
}

/**
 * A standard's fee for one academic year: its items, the minimum a discount
 * may not go below without the owner, and the instalments, which must add up
 * to the fee to the paisa before it can be saved.
 */
export function PlanForm({ academicYearId, yearStart, plan, onDone }: Props) {
  const standards = useStandards();
  const act = useFeeActions();
  const [name, setName] = useState(plan?.name ?? "");
  const [standardId, setStandardId] = useState(plan?.standardId ?? "");
  const [items, setItems] = useState<ItemDraft[]>(() =>
    plan ? plan.items.map((i) => ({ label: i.label, amount: paiseToInput(i.amount), kind: i.kind })) : [{ label: "Course fee", amount: "", kind: "course" }],
  );
  const [minimum, setMinimum] = useState(() => (plan ? paiseToInput(plan.minimumFee) : ""));
  const [insts, setInsts] = useState<InstDraft[]>(() =>
    (plan?.instalments ?? []).map((i) => ({ label: i.label, dueDate: i.dueDate, amount: paiseToInput(i.amount) })),
  );
  const [parts, setParts] = useState("3");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemAmounts = items.map((i) => readRupees(i.amount));
  const instAmounts = insts.map((i) => readRupees(i.amount));
  const itemsOk = itemAmounts.every((a) => a.paise !== null);
  const total = sumPaise(itemAmounts.map((a) => ({ amount: a.paise ?? 0 })));
  const instTotal = sumPaise(instAmounts.map((a) => ({ amount: a.paise ?? 0 })));
  const min = readRupees(minimum, 0);

  const errors = {
    name: name.trim().length < 2 ? "Give the plan a name" : undefined,
    standard: standardId ? undefined : "Choose the standard",
    items: items.some((i) => !i.label.trim()) ? "Every item needs a label" : undefined,
    minimum: min.error ?? (min.paise !== null && min.paise > total ? `More than the ${formatPaise(total)} fee` : undefined),
    insts:
      insts.some((i) => !i.label.trim() || !isDay(i.dueDate)) || instAmounts.some((a) => a.paise === null)
        ? "Every instalment needs a label, a date (YYYY-MM-DD) and an amount"
        : insts.length && instTotal !== total
          ? `The instalments add up to ${formatPaise(instTotal)}, not the ${formatPaise(total)} fee`
          : undefined,
  };
  const invalid = !itemsOk || Object.values(errors).some(Boolean);

  const setItem = (n: number, patch: Partial<ItemDraft>) => setItems((list) => list.map((x, i) => (i === n ? { ...x, ...patch } : x)));
  const setInst = (n: number, patch: Partial<InstDraft>) => setInsts((list) => list.map((x, i) => (i === n ? { ...x, ...patch } : x)));

  /** Replace the instalments with N equal parts of the fee; the odd paise go on the first. Typed labels and dates are kept. */
  const split = () => {
    const n = Number.parseInt(parts, 10);
    if (!itemsOk || !total || !(n >= 1 && n <= 24)) return;
    const amounts = splitEvenly(total, n);
    setInsts(
      amounts.map((amount, k) => ({
        label: insts[k]?.label || (k === 0 ? "At admission" : `Instalment ${k + 1}`),
        dueDate: insts[k]?.dueDate || addMonthsTo(yearStart, k),
        amount: paiseToInput(amount),
      })),
    );
  };

  const save = async () => {
    setTried(true);
    setError(null);
    if (invalid || min.paise === null) return;
    const its: FeeItem[] = items.map((i, n) => ({ label: i.label.trim(), amount: itemAmounts[n].paise ?? 0, kind: i.kind ?? (n === 0 ? "course" : "additional") }));
    const instalments: Instalment[] = insts.map((i, n) => ({ label: i.label.trim(), dueDate: i.dueDate.trim(), amount: instAmounts[n].paise ?? 0 }));
    try {
      const saved = plan
        ? await act.updatePlan.mutateAsync({ id: plan.id, patch: { name: name.trim(), items: its, minimumFee: min.paise, instalments } })
        : await act.createPlan.mutateAsync({ standardId, academicYearId, name: name.trim(), items: its, minimumFee: min.paise, instalments });
      onDone(saved);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <Card>
      <VStack gap={12}>
        <Text variant="h3">{plan ? `Edit ${plan.name}` : "New fee plan"}</Text>
        {error ? <Banner tone="danger" message={error} onDismiss={() => setError(null)} /> : null}
        <HStack gap={10} wrap align="flex-start">
          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Std 10 — 2026-27"
            maxLength={80}
            required
            error={tried ? errors.name : undefined}
            containerStyle={{ flex: 2, minWidth: 200 }}
            testID="plan-name"
          />
          <View style={{ flex: 1, minWidth: 180 }} testID="plan-standard">
            <Select
              label="Standard"
              value={standardId || null}
              options={(standards.data ?? []).filter((s) => s.isActive || s.id === standardId).map((s) => ({ value: s.id, label: s.name }))}
              onChange={setStandardId}
              placeholder="Choose a standard"
              required
              disabled={Boolean(plan)}
              hint={plan ? "A plan stays with its standard." : undefined}
              error={tried ? errors.standard : undefined}
            />
          </View>
        </HStack>

        <Text variant="label">Fee items</Text>
        {items.map((it, n) => (
          <HStack key={n} gap={8} align="flex-start" wrap>
            <TextField
              value={it.label}
              onChangeText={(t) => setItem(n, { label: t })}
              placeholder="Label"
              maxLength={80}
              accessibilityLabel={`Item ${n + 1} label`}
              containerStyle={{ flex: 2, minWidth: 160 }}
              testID={`plan-item-label-${n}`}
            />
            <TextField
              value={it.amount}
              onChangeText={(t) => setItem(n, { amount: t })}
              prefix="₹"
              numericField
              placeholder="0"
              accessibilityLabel={`Item ${n + 1} amount`}
              error={tried || it.amount.trim() ? itemAmounts[n].error : undefined}
              containerStyle={{ flex: 1, minWidth: 130 }}
              testID={`plan-item-amount-${n}`}
            />
            {items.length > 1 ? (
              <Button
                label="Remove"
                variant="ghost"
                size="sm"
                fullWidth={false}
                onPress={() => setItems((list) => list.filter((_, i) => i !== n))}
                testID={`plan-item-remove-${n}`}
              />
            ) : null}
          </HStack>
        ))}
        {tried && errors.items ? (
          <Text variant="caption" tone="danger">
            {errors.items}
          </Text>
        ) : null}
        <HStack gap={12} align="center" wrap>
          {items.length < 20 ? (
            <Button
              label="Add item"
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={() => setItems((list) => [...list, { label: "", amount: "", kind: "additional" }])}
              testID="plan-item-add"
            />
          ) : null}
          <Text variant="label" tabular testID="plan-total">
            Fee {itemsOk ? formatPaise(total) : "—"}
          </Text>
        </HStack>

        <TextField
          label="Minimum fee"
          prefix="₹"
          value={minimum}
          onChangeText={setMinimum}
          numericField
          placeholder="0"
          hint="A discount may not take the fee below this without the owner."
          error={tried || minimum.trim() ? errors.minimum : undefined}
          containerStyle={{ maxWidth: 260 }}
          testID="plan-minimum"
        />

        <Text variant="label">Instalments</Text>
        <Text variant="caption" tone="tertiary">
          Optional. Without them a student&apos;s whole fee falls due on their admission day.
        </Text>
        {insts.map((it, n) => (
          <HStack key={n} gap={8} align="flex-start" wrap>
            <TextField
              value={it.label}
              onChangeText={(t) => setInst(n, { label: t })}
              placeholder="Label"
              maxLength={60}
              accessibilityLabel={`Instalment ${n + 1} label`}
              containerStyle={{ flex: 2, minWidth: 140 }}
              testID={`plan-inst-label-${n}`}
            />
            <TextField
              value={it.dueDate}
              onChangeText={(t) => setInst(n, { dueDate: t })}
              placeholder="YYYY-MM-DD"
              accessibilityLabel={`Instalment ${n + 1} due date`}
              containerStyle={{ flex: 1, minWidth: 130 }}
              testID={`plan-inst-date-${n}`}
            />
            <TextField
              value={it.amount}
              onChangeText={(t) => setInst(n, { amount: t })}
              prefix="₹"
              numericField
              placeholder="0"
              accessibilityLabel={`Instalment ${n + 1} amount`}
              containerStyle={{ flex: 1, minWidth: 130 }}
              testID={`plan-inst-amount-${n}`}
            />
            <Button
              label="Remove"
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={() => setInsts((list) => list.filter((_, i) => i !== n))}
              testID={`plan-inst-remove-${n}`}
            />
          </HStack>
        ))}
        <HStack gap={8} align="flex-end" wrap>
          {insts.length < 24 ? (
            <Button
              label="Add instalment"
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={() => setInsts((list) => [...list, { label: `Instalment ${list.length + 1}`, dueDate: "", amount: "" }])}
              testID="plan-inst-add"
            />
          ) : null}
          <TextField
            label="Split evenly into"
            value={parts}
            onChangeText={setParts}
            keyboardType="number-pad"
            maxLength={2}
            containerStyle={{ width: 130 }}
            testID="plan-split-count"
          />
          <Button
            label={`Split evenly into ${parts || "N"}`}
            variant="secondary"
            size="sm"
            fullWidth={false}
            disabled={!itemsOk || !total}
            onPress={split}
            testID="plan-split"
          />
        </HStack>
        {insts.length ? (
          <Text variant="label" tabular tone={instTotal === total ? "success" : "danger"} testID="plan-inst-total">
            Instalments {formatPaise(instTotal)} of {itemsOk ? formatPaise(total) : "—"}
          </Text>
        ) : null}
        {(tried || insts.length) && errors.insts ? (
          <Text variant="caption" tone="danger">
            {errors.insts}
          </Text>
        ) : null}

        <HStack gap={8}>
          <Button
            label={plan ? "Save plan" : "Create plan"}
            fullWidth={false}
            loading={act.createPlan.isPending || act.updatePlan.isPending}
            disabled={tried && invalid}
            onPress={() => void save()}
            testID="plan-save"
          />
          <Button label="Close" variant="ghost" fullWidth={false} onPress={() => onDone(null)} />
        </HStack>
      </VStack>
    </Card>
  );
}

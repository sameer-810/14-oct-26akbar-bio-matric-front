import React, { useState } from "react";
import { View, StyleSheet } from "react-native";

import { Screen, Card, VStack, HStack, Text, Button, TextField, Banner, SectionHeader, StatusChip, Skeleton, useBreakpoint } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { academyToday, formatDay } from "@shared/format";
import { useSelectedChild, useChildLeaves, useParentActions, useParentSettings } from "../hooks/useParent";
import { ChildPicker } from "../components/ChildPicker";

const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * The parent applies; the academy approves. Until then the register is not
 * touched — the old app's leave form changed nothing anywhere.
 */
export default function ParentLeaveScreen() {
  const { isWide } = useBreakpoint();
  const { child } = useSelectedChild();
  const settings = useParentSettings();
  const leaves = useChildLeaves(child?.id);
  const act = useParentActions();
  const [form, setForm] = useState({ from: academyToday(), to: "", reason: "" });
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const open = settings.data?.sections.leaveApplication !== false;

  async function submit() {
    if (!child) return;
    setMsg(null);
    const to = form.to || form.from;
    if (!isDay(form.from) || !isDay(to)) {
      setMsg({ tone: "danger", text: "Write dates as YYYY-MM-DD, for example 2026-10-20." });
      return;
    }
    try {
      await act.applyLeave.mutateAsync({ studentId: child.id, from: form.from, to, reason: form.reason.trim() });
      setForm({ from: academyToday(), to: "", reason: "" });
      setMsg({ tone: "success", text: "Sent. The academy will approve it and you will get an alert." });
    } catch (err) {
      setMsg({ tone: "danger", text: apiErrorMessage(err) });
    }
  }

  return (
    <Screen title="Leave" subtitle={child?.name} testID="parent-leave">
      <View style={[styles.wrap, isWide && styles.wrapWide]}>
        <VStack gap={16}>
          <ChildPicker />
          {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
          {open ? (
            <Card>
              <VStack gap={12}>
                <SectionHeader title="Apply for leave" subtitle="For a day or a few days. You can apply up to a few days after." />
                <HStack gap={12} wrap>
                  <TextField
                    label="From"
                    value={form.from}
                    onChangeText={(t) => setForm({ ...form, from: t })}
                    placeholder="YYYY-MM-DD"
                    containerStyle={{ flex: 1, minWidth: 140 }}
                    testID="leave-from"
                  />
                  <TextField
                    label="To"
                    value={form.to}
                    onChangeText={(t) => setForm({ ...form, to: t })}
                    placeholder="Same day"
                    hint="Leave empty for one day"
                    containerStyle={{ flex: 1, minWidth: 140 }}
                    testID="leave-to"
                  />
                </HStack>
                <TextField
                  label="Reason"
                  value={form.reason}
                  onChangeText={(t) => setForm({ ...form, reason: t })}
                  placeholder="Fever, family function…"
                  maxLength={300}
                  testID="leave-reason"
                />
                <Button
                  label="Send to the academy"
                  onPress={submit}
                  loading={act.applyLeave.isPending}
                  disabled={!child || form.reason.trim().length < 3}
                  testID="leave-submit"
                />
              </VStack>
            </Card>
          ) : (
            <Banner tone="info" title="Leave by phone" message={`Please call the academy${settings.data?.phone ? ` on ${settings.data.phone}` : ""} to tell them about leave.`} />
          )}

          <Card>
            <VStack gap={10}>
              <SectionHeader title="Applications" />
              {leaves.isLoading ? <Skeleton height={60} /> : null}
              {leaves.data?.length === 0 ? (
                <Text tone="tertiary" variant="body-sm">
                  None yet.
                </Text>
              ) : null}
              {(leaves.data ?? []).map((l) => (
                <HStack key={l.id} gap={8} align="center" testID={`leave-row-${l.status}`}>
                  <VStack gap={2} flex={1}>
                    <Text variant="body-sm">
                      {formatDay(l.from)}
                      {l.to !== l.from ? ` – ${formatDay(l.to)}` : ""}
                    </Text>
                    {l.reason ? (
                      <Text variant="caption" tone="secondary">
                        {l.reason}
                      </Text>
                    ) : null}
                  </VStack>
                  <StatusChip status={l.status} size="sm" />
                </HStack>
              ))}
            </VStack>
          </Card>
        </VStack>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignSelf: "center" },
  wrapWide: { maxWidth: 640 },
});

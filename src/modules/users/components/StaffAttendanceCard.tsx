import React, { useState } from "react";
import { Card, VStack, HStack, Button, TextField, Banner, SectionHeader, Text, PunchDaysCard } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { academyToday, addDaysTo } from "@shared/format";
import { useUpdateUser, useUserDays } from "../hooks/useUsers";
import type { StaffUser } from "../types";

/**
 * A staff member on the fingerprint machines: the number they punch with
 * (one number per person across students, faculty and staff) and their
 * last two weeks. A teacher login punches through its faculty record.
 */
export function StaffAttendanceCard({ user }: { user: StaffUser }) {
  const update = useUpdateUser(user.id);
  const [draft, setDraft] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const to = academyToday();
  const from = addDaysTo(to, -13);
  const days = useUserDays(user.id, from, to, Boolean(user.biometricId));

  if (user.teacherId) {
    return (
      <Card>
        <Text tone="secondary">{"This login punches with its faculty record's fingerprint ID; see the teacher's page."}</Text>
      </Card>
    );
  }

  const value = draft ?? user.biometricId ?? "";
  async function save(next: string | null) {
    setMessage(null);
    try {
      await update.mutateAsync({ biometricId: next });
      setDraft(null);
      setMessage({ tone: "success", text: next ? "Saved. Their punches now count as theirs." : "Removed from the machines' list." });
    } catch (err) {
      setMessage({ tone: "danger", text: apiErrorMessage(err) });
    }
  }

  return (
    <VStack gap={12}>
      <Card>
        <VStack gap={10}>
          <SectionHeader title="Fingerprint machines" subtitle="The number they are enrolled under on the machines." />
          {message ? <Banner tone={message.tone} message={message.text} /> : null}
          <TextField
            label="Fingerprint ID"
            value={value}
            onChangeText={(t) => setDraft(t.replace(/\D/g, ""))}
            keyboardType="number-pad"
            hint="Enrol them on the machine under this number first. Empty means they do not punch."
            testID="user-bio"
          />
          <HStack gap={8} wrap>
            <Button
              label="Save"
              disabled={!value || value === user.biometricId}
              loading={update.isPending}
              onPress={() => save(value)}
              testID="user-bio-save"
            />
            {user.biometricId ? <Button label="Remove" variant="ghost" onPress={() => save(null)} /> : null}
          </HStack>
        </VStack>
      </Card>
      {user.biometricId && days.data ? <PunchDaysCard data={days.data} testID="user-days" /> : null}
    </VStack>
  );
}

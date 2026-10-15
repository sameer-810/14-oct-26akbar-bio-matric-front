import React, { useState } from "react";
import { View } from "react-native";
import { Card, VStack, HStack, Button, Banner, TextField, Select, SectionHeader, ToggleRow } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { useStandards, useBatches, useCurrentYear } from "@modules/academy/hooks/useAcademy";
import { useParentMatches } from "@modules/students/hooks/useStudents";
import { useEnquiryActions } from "../hooks/useEnquiries";
import { YMD } from "../enquiryDates";
import { phoneOf, type ConvertResult, type Enquiry } from "../types";

/**
 * One click from lead to student: the admission is made from the lead's own
 * details, so only the class is asked for here. Brothers and sisters can be
 * added to the family's existing parent login, as on the admission screen.
 */
export function AdmitPanel({ lead: l, onAdmitted }: { lead: Enquiry; onAdmitted: (r: ConvertResult, batchName: string) => void }) {
  const act = useEnquiryActions();
  const year = useCurrentYear();
  const standards = useStandards();
  const [standardId, setStandardId] = useState(l.standardId ?? "");
  const [batchId, setBatchId] = useState("");
  const [admissionDate, setAdmissionDate] = useState("");
  const [linkTo, setLinkTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const batches = useBatches({ academicYearId: year?.id, standardId: standardId || undefined }, { enabled: Boolean(year && standardId) });
  const matches = useParentMatches(phoneOf(l));
  const dateOk = admissionDate.trim() === "" || YMD.test(admissionDate.trim());

  async function admit() {
    setError(null);
    try {
      const r = await act.convert.mutateAsync({
        id: l.id,
        body: {
          standardId: standardId || undefined,
          batchId,
          admissionDate: admissionDate.trim() || undefined,
          parent: linkTo ? { mode: "existing", parentAccountId: linkTo } : { mode: "new" },
        },
      });
      onAdmitted(r, batches.data?.find((b) => b.id === batchId)?.name ?? "");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not admit the student"));
    }
  }

  return (
    <Card testID="enquiry-admit">
      <VStack gap={12}>
        <SectionHeader title="Admit" subtitle="Makes the student from this lead's details, with a parent login, and closes its follow-ups." />
        {error ? <Banner tone="danger" message={error} onDismiss={() => setError(null)} /> : null}
        <HStack gap={12} wrap>
          <View style={{ flex: 1, minWidth: 180 }} testID="enquiry-admit-standard">
            <Select
              label="Standard"
              value={standardId || null}
              options={(standards.data ?? []).filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name }))}
              onChange={(id) => {
                setStandardId(id);
                setBatchId("");
              }}
              required
              placeholder="Choose the standard"
            />
          </View>
          <View style={{ flex: 1, minWidth: 180 }} testID="enquiry-batch">
            <Select
              label="Batch"
              value={batchId || null}
              options={(batches.data ?? [])
                .filter((b) => b.isActive)
                .map((b) => ({ value: b.id, label: b.name, sublabel: `${b.startTime}–${b.endTime} · ${b.studentCount ?? 0} students` }))}
              onChange={setBatchId}
              required
              disabled={!standardId}
              placeholder={standardId ? "Choose the batch" : "Choose the standard first"}
            />
          </View>
          <TextField
            label="Admission date"
            value={admissionDate}
            onChangeText={setAdmissionDate}
            placeholder="YYYY-MM-DD (today if empty)"
            error={dateOk ? undefined : "Write it as YYYY-MM-DD"}
            containerStyle={{ flex: 1, minWidth: 180 }}
            testID="enquiry-admission-date"
          />
        </HStack>
        {(matches.data ?? []).length ? (
          <Banner
            tone="info"
            title="This family may already have a login"
            message={(matches.data ?? []).map((m) => `${m.username} (${m.name || "parent"}, ${m.children} child${m.children === 1 ? "" : "ren"})`).join(" · ")}
            action={
              <VStack gap={6}>
                {(matches.data ?? []).map((m) => (
                  <ToggleRow
                    key={m.id}
                    label={`Add to ${m.username} — a brother or sister is already here`}
                    value={linkTo === m.id}
                    onChange={(on) => setLinkTo(on ? m.id : null)}
                  />
                ))}
              </VStack>
            }
          />
        ) : null}
        <HStack>
          <Button
            label="Admit as student"
            fullWidth={false}
            onPress={admit}
            loading={act.convert.isPending}
            disabled={!standardId || !batchId || !dateOk}
            testID="enquiry-admit-confirm"
          />
        </HStack>
      </VStack>
    </Card>
  );
}

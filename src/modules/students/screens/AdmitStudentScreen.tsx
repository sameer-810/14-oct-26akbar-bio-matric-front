import React, { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";

import {
  Screen,
  Card,
  VStack,
  HStack,
  Text,
  Button,
  Banner,
  TextField,
  Select,
  ChipsRow,
  SectionHeader,
  ToggleRow,
  useBreakpoint,
} from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { fieldErrors, type FieldErrors } from "@modules/auth/auth.validation";
import { useStandards, useBatches, useSchools, useCurrentYear, useSettings } from "@modules/academy/hooks/useAcademy";
import { academyApi } from "@modules/academy/api/academyApi";
import { useAdmitStudent, useParentMatches } from "../hooks/useStudents";
import { admissionSchema } from "../students.validation";
import { AdmissionSlip } from "../components/AdmissionSlip";
import type { AdmitResult, Guardian } from "../types";
import type { StudentsParamList } from "../StudentsNavigator";

type Props = NativeStackScreenProps<StudentsParamList, "AdmitStudent">;

const EMPTY = {
  standardId: "",
  batchId: "",
  firstName: "",
  middleName: "",
  lastName: "",
  gender: "",
  dateOfBirth: "",
  studentPhone: "",
  schoolName: "",
  fatherName: "",
  fatherPhone: "",
  motherName: "",
  motherPhone: "",
  line1: "",
  city: "Mumbai",
  pincode: "",
  grNumber: "",
};

/**
 * Admission in one screen: class, student, parents. Only the first name, the
 * batch and one mobile number are required — the busy-evening admission takes
 * two minutes; the rest can be filled in later from the student's page.
 */
export default function AdmitStudentScreen({ navigation }: Props) {
  const { isWide } = useBreakpoint();
  const year = useCurrentYear();
  const settings = useSettings();
  const standards = useStandards();
  const schools = useSchools();
  const admit = useAdmitStudent();
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [existingGr, setExistingGr] = useState(false);
  const [linkTo, setLinkTo] = useState<string | null>(null);
  const [result, setResult] = useState<AdmitResult | null>(null);
  const set = (k: keyof typeof EMPTY) => (t: string) => setV((x) => ({ ...x, [k]: t }));

  const batches = useBatches(
    { academicYearId: year?.id, standardId: v.standardId || undefined },
    { enabled: Boolean(year && v.standardId) },
  );
  const nextGr = useQuery({
    queryKey: ["nextGr", v.standardId],
    queryFn: () => academyApi.nextGr(v.standardId),
    enabled: Boolean(v.standardId),
    // another desk may admit in between; always ask
    staleTime: 0,
  });
  const matches = useParentMatches(v.fatherPhone || v.motherPhone);

  async function submit() {
    const parsed = admissionSchema.safeParse(v);
    setErrors(fieldErrors(parsed));
    if (!parsed.success) return;
    setError(null);
    const guardians: Guardian[] = [];
    if (v.fatherName || v.fatherPhone) guardians.push({ relation: "father", name: v.fatherName, phone: v.fatherPhone });
    if (v.motherName || v.motherPhone) guardians.push({ relation: "mother", name: v.motherName, phone: v.motherPhone });
    try {
      const r = await admit.mutateAsync({
        standardId: v.standardId,
        batchId: v.batchId,
        firstName: v.firstName,
        middleName: v.middleName || undefined,
        lastName: v.lastName || undefined,
        gender: v.gender || undefined,
        dateOfBirth: v.dateOfBirth || null,
        phone: v.studentPhone || undefined,
        schoolName: v.schoolName || undefined,
        address: { line1: v.line1, city: v.city, pincode: v.pincode },
        guardians,
        grNumber: existingGr && v.grNumber ? v.grNumber : undefined,
        parent: linkTo ? { mode: "existing", parentAccountId: linkTo } : { mode: "new" },
      });
      setResult(r);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not admit the student"));
    }
  }

  if (result) {
    const s = result.student;
    return (
      <Screen title="Admitted" testID="admission-done">
        <VStack gap={16} style={{ maxWidth: isWide ? 640 : undefined }}>
          <Card>
            <AdmissionSlip
              academy={settings.data?.name ?? "Akbar's Academy"}
              studentName={s.name}
              grNumber={s.grNumber}
              biometricId={s.biometricId}
              batchName={batches.data?.find((b) => b.id === s.batchId)?.name ?? ""}
              username={result.parentLogin.username}
              temporaryPassword={result.parentLogin.temporaryPassword}
            />
          </Card>
          <Banner
            tone="info"
            title="Next: the fingerprint"
            message={`${s.firstName} is being added to the fingerprint machine as ${s.biometricId}. Enrol a finger there: Menu → User Mgt → find ${s.biometricId} → Fingerprint.`}
          />
          <HStack gap={8} wrap>
            <Button label="Open student" onPress={() => navigation.replace("StudentDetail", { id: s.id })} />
            <Button
              label="Admit another"
              variant="secondary"
              onPress={() => {
                setResult(null);
                setV({ ...EMPTY, standardId: v.standardId, batchId: v.batchId });
                setLinkTo(null);
              }}
              testID="admit-another"
            />
          </HStack>
        </VStack>
      </Screen>
    );
  }

  const col = { flex: 1, minWidth: isWide ? 220 : 160 };

  return (
    <Screen title="New admission" subtitle={year ? `Academic year ${year.label}` : undefined} testID="admit-screen">
      <VStack gap={16} style={{ maxWidth: isWide ? 860 : undefined }}>
        {error ? <Banner tone="danger" message={error} /> : null}

        <Card>
          <VStack gap={12}>
            <SectionHeader title="Class" />
            <HStack gap={12} wrap>
              <HStack style={col}>
                <Select
                  label="Standard"
                  value={v.standardId || null}
                  options={(standards.data ?? []).filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name }))}
                  onChange={(id) => setV((x) => ({ ...x, standardId: id, batchId: "" }))}
                  error={errors.standardId}
                  required
                  placeholder="Choose"
                />
              </HStack>
              <HStack style={col}>
                <Select
                  label="Batch"
                  value={v.batchId || null}
                  options={(batches.data ?? []).filter((b) => b.isActive).map((b) => ({ value: b.id, label: b.name, sublabel: `${b.startTime}–${b.endTime} · ${b.studentCount ?? 0} students` }))}
                  onChange={set("batchId")}
                  error={errors.batchId}
                  required
                  disabled={!v.standardId}
                  placeholder={v.standardId ? "Choose" : "Choose the standard first"}
                />
              </HStack>
            </HStack>
            {v.standardId ? (
              <Text variant="body-sm" tone="secondary" testID="next-gr">
                {existingGr
                  ? "Using the GR number the student already has."
                  : `GR number will be about ${nextGr.data?.next ?? "…"} — fingerprint ID ${settings.data?.biometricIdPrefix ?? "26"}${nextGr.data?.next ?? "…"}.`}
              </Text>
            ) : null}
            <ToggleRow
              label="This student already has a GR number"
              hint="A returning student keeps their number, so the finger already on the machine still works."
              value={existingGr}
              onChange={setExistingGr}
            />
            {existingGr ? <TextField label="Existing GR number" value={v.grNumber} onChangeText={set("grNumber")} keyboardType="number-pad" error={errors.grNumber} /> : null}
          </VStack>
        </Card>

        <Card>
          <VStack gap={12}>
            <SectionHeader title="Student" />
            <HStack gap={12} wrap>
              <TextField label="First name" value={v.firstName} onChangeText={set("firstName")} required error={errors.firstName} containerStyle={col} testID="admit-first" />
              <TextField label="Middle name" value={v.middleName} onChangeText={set("middleName")} containerStyle={col} />
              <TextField label="Last name" value={v.lastName} onChangeText={set("lastName")} containerStyle={col} testID="admit-last" />
            </HStack>
            <ChipsRow
              chips={[
                { key: "female", label: "Girl" },
                { key: "male", label: "Boy" },
                { key: "other", label: "Other" },
              ]}
              active={v.gender}
              onChange={set("gender")}
            />
            <HStack gap={12} wrap>
              <TextField label="Date of birth" value={v.dateOfBirth} onChangeText={set("dateOfBirth")} placeholder="YYYY-MM-DD" error={errors.dateOfBirth} containerStyle={col} />
              <TextField label="Student's mobile" value={v.studentPhone} onChangeText={set("studentPhone")} keyboardType="phone-pad" error={errors.studentPhone} containerStyle={col} />
            </HStack>
            <HStack style={{ width: "100%" }}>
              <Select
                label="School / college"
                value={v.schoolName || null}
                options={(schools.data ?? []).map((s) => ({ value: s.name, label: s.name }))}
                onChange={set("schoolName")}
                placeholder="Choose, or type below"
              />
            </HStack>
            <TextField label="Not on the list? Type the school" value={v.schoolName} onChangeText={set("schoolName")} />
          </VStack>
        </Card>

        <Card>
          <VStack gap={12}>
            <SectionHeader title="Parents" subtitle="Arrival and leaving alerts go to the parent login made from these." />
            <HStack gap={12} wrap>
              <TextField label="Father's name" value={v.fatherName} onChangeText={set("fatherName")} containerStyle={col} testID="admit-father" />
              <TextField label="Father's mobile" value={v.fatherPhone} onChangeText={set("fatherPhone")} keyboardType="phone-pad" error={errors.fatherPhone} containerStyle={col} testID="admit-father-phone" />
            </HStack>
            <HStack gap={12} wrap>
              <TextField label="Mother's name" value={v.motherName} onChangeText={set("motherName")} containerStyle={col} />
              <TextField label="Mother's mobile" value={v.motherPhone} onChangeText={set("motherPhone")} keyboardType="phone-pad" error={errors.motherPhone} containerStyle={col} />
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
                        testID={`link-${m.username}`}
                      />
                    ))}
                  </VStack>
                }
              />
            ) : null}
          </VStack>
        </Card>

        <Card>
          <VStack gap={12}>
            <SectionHeader title="Address" />
            <TextField label="Address" value={v.line1} onChangeText={set("line1")} />
            <HStack gap={12} wrap>
              <TextField label="City" value={v.city} onChangeText={set("city")} containerStyle={col} />
              <TextField label="PIN code" value={v.pincode} onChangeText={(t) => set("pincode")(t.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" containerStyle={col} />
            </HStack>
          </VStack>
        </Card>

        <HStack gap={8}>
          <Button label="Admit student" onPress={submit} loading={admit.isPending} size="lg" testID="admit-submit" />
          <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
        </HStack>
      </VStack>
    </Screen>
  );
}

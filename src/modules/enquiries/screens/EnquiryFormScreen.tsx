import React, { useState } from "react";
import { View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Screen, Card, VStack, HStack, Text, Button, Banner, TextField, Select, ChipsRow, SectionHeader, useBreakpoint } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { fieldErrors, type FieldErrors } from "@modules/auth/auth.validation";
import { useStandards, useSchools } from "@modules/academy/hooks/useAcademy";
import { useEnquiryActions, useEnquiryAssignees, useEnquiryMatches } from "../hooks/useEnquiries";
import { enquirySchema } from "../enquiries.validation";
import { followUpInstant } from "../enquiryDates";
import { NEW_STAGE_CHOICES, SOURCE_OPTIONS, STAGE_LABELS, type EnquiryGuardian, type EnquiryInput, type EnquirySource, type EnquiryStage } from "../types";
import type { EnquiriesParamList } from "../EnquiriesNavigator";

type Props = NativeStackScreenProps<EnquiriesParamList, "EnquiryNew">;

const EMPTY = {
  firstName: "",
  middleName: "",
  lastName: "",
  gender: "",
  dateOfBirth: "",
  schoolName: "",
  standardId: "",
  fatherName: "",
  fatherPhone: "",
  motherName: "",
  motherPhone: "",
  source: "walk_in",
  sourceNote: "",
  stage: "warm",
  assigneeId: "",
  followUpTitle: "",
  followUpDate: "",
  followUpTime: "",
};

const tenDigits = (p: string) => /^[6-9]\d{9}$/.test(p.replace(/\D/g, "").slice(-10));

/**
 * A new lead, as quick as a phone call allows: a first name and one mobile
 * are enough. A first follow-up can be set right here so it lands on the board.
 */
export default function EnquiryFormScreen({ navigation }: Props) {
  const { isWide } = useBreakpoint();
  const seeAll = useAuthStore((s) => s.hasPermission(PERMISSIONS.ENQUIRIES_ALL));
  const myId = useAuthStore((s) => s.staff?.id ?? "");
  const standards = useStandards();
  const schools = useSchools();
  const assignees = useEnquiryAssignees({ enabled: seeAll });
  const act = useEnquiryActions();
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof EMPTY) => (t: string) => setV((x) => ({ ...x, [k]: t }));
  const matches = useEnquiryMatches(tenDigits(v.fatherPhone) ? v.fatherPhone : v.motherPhone);
  const found = matches.data && (matches.data.leads.length > 0 || matches.data.students.length > 0) ? matches.data : null;

  async function submit() {
    const parsed = enquirySchema.safeParse(v);
    setErrors(fieldErrors(parsed));
    if (!parsed.success) return;
    setError(null);
    const guardians: EnquiryGuardian[] = [];
    if (v.fatherName.trim() || v.fatherPhone.trim()) guardians.push({ relation: "father", name: v.fatherName.trim(), phone: v.fatherPhone.trim() });
    if (v.motherName.trim() || v.motherPhone.trim()) guardians.push({ relation: "mother", name: v.motherName.trim(), phone: v.motherPhone.trim() });
    const body: EnquiryInput = {
      firstName: v.firstName.trim(),
      middleName: v.middleName.trim() || undefined,
      lastName: v.lastName.trim() || undefined,
      gender: (v.gender || undefined) as EnquiryInput["gender"],
      dateOfBirth: v.dateOfBirth.trim() || undefined,
      schoolName: v.schoolName.trim() || undefined,
      standardId: v.standardId || undefined,
      guardians,
      source: v.source as EnquirySource,
      sourceNote: v.sourceNote.trim() || undefined,
      stage: v.stage as EnquiryStage,
      assigneeId: seeAll && v.assigneeId ? v.assigneeId : undefined,
      followUp: v.followUpTitle.trim()
        ? { title: v.followUpTitle.trim(), dueAt: followUpInstant(v.followUpDate, v.followUpTime) }
        : undefined,
    };
    try {
      const lead = await act.create.mutateAsync(body);
      navigation.replace("EnquiryDetail", { id: lead.id });
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save the enquiry"));
    }
  }

  const col = { flex: 1, minWidth: isWide ? 220 : 160 };
  const openStudent = (id: string) => (navigation as unknown as { navigate: (n: string, p?: object) => void }).navigate("Students", { screen: "StudentDetail", params: { id } });

  return (
    <Screen title="New enquiry" subtitle="Only the first name and one mobile are needed." testID="enquiry-form">
      <VStack gap={16} style={{ maxWidth: isWide ? 860 : undefined }}>
        {error ? <Banner tone="danger" message={error} onDismiss={() => setError(null)} /> : null}

        <Card>
          <VStack gap={12}>
            <SectionHeader title="Student" />
            <HStack gap={12} wrap>
              <TextField label="First name" value={v.firstName} onChangeText={set("firstName")} required error={errors.firstName} maxLength={60} containerStyle={col} testID="enquiry-first" />
              <TextField label="Middle name" value={v.middleName} onChangeText={set("middleName")} maxLength={60} containerStyle={col} testID="enquiry-middle" />
              <TextField label="Last name" value={v.lastName} onChangeText={set("lastName")} maxLength={60} containerStyle={col} testID="enquiry-last" />
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
              <TextField label="Date of birth" value={v.dateOfBirth} onChangeText={set("dateOfBirth")} placeholder="YYYY-MM-DD" error={errors.dateOfBirth} containerStyle={col} testID="enquiry-dob" />
              <View style={col} testID="enquiry-standard">
                <Select
                  label="Standard interested in"
                  value={v.standardId || null}
                  options={(standards.data ?? []).filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name }))}
                  onChange={set("standardId")}
                  placeholder="Choose the standard"
                />
              </View>
            </HStack>
            <HStack gap={12} wrap>
              <View style={col}>
                <Select
                  label="School / college"
                  value={v.schoolName || null}
                  options={(schools.data ?? []).map((s) => ({ value: s.name, label: s.name }))}
                  onChange={set("schoolName")}
                  placeholder="Choose, or type"
                />
              </View>
              <TextField label="Not on the list? Type the school" value={v.schoolName} onChangeText={set("schoolName")} maxLength={120} containerStyle={col} testID="enquiry-school" />
            </HStack>
          </VStack>
        </Card>

        <Card>
          <VStack gap={12}>
            <SectionHeader title="Parents" subtitle="At least one mobile — that is how the lead is followed up." />
            <HStack gap={12} wrap>
              <TextField label="Father's name" value={v.fatherName} onChangeText={set("fatherName")} maxLength={80} containerStyle={col} testID="enquiry-father" />
              <TextField
                label="Father's mobile"
                value={v.fatherPhone}
                onChangeText={set("fatherPhone")}
                keyboardType="phone-pad"
                error={errors.fatherPhone}
                containerStyle={col}
                testID="enquiry-father-phone"
              />
            </HStack>
            <HStack gap={12} wrap>
              <TextField label="Mother's name" value={v.motherName} onChangeText={set("motherName")} maxLength={80} containerStyle={col} testID="enquiry-mother" />
              <TextField
                label="Mother's mobile"
                value={v.motherPhone}
                onChangeText={set("motherPhone")}
                keyboardType="phone-pad"
                error={errors.motherPhone}
                containerStyle={col}
                testID="enquiry-mother-phone"
              />
            </HStack>
            {found ? (
              <View testID="enquiry-matches">
                <Banner
                  tone="warning"
                  title="This number is already known"
                  message="Check before entering the family twice."
                  action={
                    <VStack gap={4}>
                      {found.leads.map((m) => (
                        <Button
                          key={m.id}
                          label={`Enquiry #${m.number} ${m.name} — ${STAGE_LABELS[m.stage]}`}
                          size="xs"
                          variant="ghost"
                          fullWidth={false}
                          onPress={() => navigation.push("EnquiryDetail", { id: m.id })}
                        />
                      ))}
                      {found.students.map((s) => (
                        <Button
                          key={s.id}
                          label={`Student ${s.name} — GR ${s.grNumber} (${s.status})`}
                          size="xs"
                          variant="ghost"
                          fullWidth={false}
                          onPress={() => openStudent(s.id)}
                        />
                      ))}
                    </VStack>
                  }
                />
              </View>
            ) : null}
          </VStack>
        </Card>

        <Card>
          <VStack gap={12}>
            <SectionHeader title="Lead" />
            <HStack gap={12} wrap>
              <View style={col} testID="enquiry-source">
                <Select label="Source" value={v.source} options={SOURCE_OPTIONS} onChange={set("source")} placeholder="Choose the source" />
              </View>
              <TextField label="Source note" value={v.sourceNote} onChangeText={set("sourceNote")} placeholder="Which banner, who referred them" maxLength={120} containerStyle={col} />
            </HStack>
            <HStack gap={12} wrap>
              <View style={col} testID="enquiry-stage-new">
                <Select label="Stage" value={v.stage} options={NEW_STAGE_CHOICES} onChange={set("stage")} />
              </View>
              {seeAll ? (
                <View style={col} testID="enquiry-assignee">
                  <Select
                    label="Followed up by"
                    value={v.assigneeId || myId || null}
                    options={(assignees.data ?? []).map((a) => ({ value: a.id, label: a.id === myId ? `${a.name} (me)` : a.name, sublabel: a.role.replace(/_/g, " ") }))}
                    onChange={set("assigneeId")}
                    placeholder={assignees.isLoading ? "Loading staff…" : "Me"}
                  />
                </View>
              ) : null}
            </HStack>
          </VStack>
        </Card>

        <Card>
          <VStack gap={12}>
            <SectionHeader title="First follow-up" subtitle="Optional. It goes on the weekly board." />
            <TextField
              label="What to do"
              value={v.followUpTitle}
              onChangeText={set("followUpTitle")}
              placeholder="Call back about the batch timing"
              maxLength={140}
              error={errors.followUpTitle}
              testID="enquiry-followup-title"
            />
            <HStack gap={12} wrap>
              <TextField label="Date" value={v.followUpDate} onChangeText={set("followUpDate")} placeholder="YYYY-MM-DD" error={errors.followUpDate} containerStyle={col} testID="enquiry-followup-date" />
              <TextField label="Time" value={v.followUpTime} onChangeText={set("followUpTime")} placeholder="HH:MM" error={errors.followUpTime} containerStyle={col} testID="enquiry-followup-time" />
            </HStack>
            <Text variant="caption" tone="tertiary">
              Academy time (India), 24-hour clock — 17:30 is 5:30 pm.
            </Text>
          </VStack>
        </Card>

        <HStack gap={8}>
          <Button label="Save enquiry" onPress={submit} loading={act.create.isPending} size="lg" fullWidth={false} testID="enquiry-save" />
          <Button label="Cancel" variant="ghost" fullWidth={false} onPress={() => navigation.goBack()} />
        </HStack>
      </VStack>
    </Screen>
  );
}

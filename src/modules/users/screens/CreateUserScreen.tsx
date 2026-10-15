import React, { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Screen, Card, VStack, HStack, Button, TextField, Select, Banner, useBreakpoint } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { ROLE_LABELS, type Role } from "@shared/permissions";
import { fieldErrors, type FieldErrors } from "@modules/auth/auth.validation";
import { useCreateUser } from "../hooks/useUsers";
import { useTeachers } from "@modules/teachers/hooks/useTeachers";
import { createUserSchema } from "../users.validation";
import { TemporaryPasswordPanel } from "../components/TemporaryPasswordPanel";
import type { UsersParamList } from "../UsersNavigator";

type Props = NativeStackScreenProps<UsersParamList, "CreateUser">;

const ROLE_HINTS: Record<Role, string> = {
  owner: "Everything, including logins and settings",
  manager: "Runs the branch; cannot create logins or change settings",
  front_desk: "Admissions, the register, the gate",
  counselor: "Enquiries and follow-ups",
  teacher: "Their batches' register and test marks",
};

export default function CreateUserScreen({ navigation }: Props) {
  const { isWide } = useBreakpoint();
  const create = useCreateUser();
  const [form, setForm] = useState({ name: "", username: "", phone: "", role: "", teacherId: "" });
  const teachers = useTeachers({ active: true });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; username: string; password: string } | null>(null);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    const parsed = createUserSchema.safeParse(form);
    setErrors(fieldErrors(parsed));
    if (!parsed.success) return;
    setError(null);
    try {
      const r = await create.mutateAsync({
        ...parsed.data,
        phone: parsed.data.phone || undefined,
        teacherId: parsed.data.role === "teacher" && form.teacherId ? form.teacherId : undefined,
      });
      setCreated({ id: r.user.id, username: r.user.username, password: r.temporaryPassword });
    } catch (err) {
      setError(apiErrorMessage(err, "Could not create the login"));
    }
  }

  return (
    <Screen title="New login" testID="create-user-screen">
      <Card style={{ maxWidth: isWide ? 560 : undefined }}>
        {created ? (
          <VStack gap={16}>
            <TemporaryPasswordPanel username={created.username} password={created.password} />
            <HStack gap={8} wrap>
              <Button label="Open their login" onPress={() => navigation.replace("UserDetail", { id: created.id })} />
              <Button label="Back to all logins" variant="secondary" onPress={() => navigation.navigate("UsersList")} />
            </HStack>
          </VStack>
        ) : (
          <VStack gap={14}>
            {error ? <Banner tone="danger" message={error} /> : null}
            <TextField label="Full name" value={form.name} onChangeText={set("name")} error={errors.name} required testID="cu-name" />
            <TextField
              label="Username"
              value={form.username}
              onChangeText={set("username")}
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.username}
              hint="What they type to sign in, e.g. ayesha or ali.sir"
              required
              testID="cu-username"
            />
            <TextField label="Mobile" value={form.phone} onChangeText={set("phone")} keyboardType="phone-pad" error={errors.phone} testID="cu-phone" />
            <Select
              label="Role"
              value={form.role || null}
              options={(Object.keys(ROLE_LABELS) as Role[]).map((r) => ({ value: r, label: ROLE_LABELS[r], sublabel: ROLE_HINTS[r] }))}
              onChange={set("role")}
              error={errors.role}
              required
              placeholder="Choose a role"
            />
            {form.role === "teacher" ? (
              <Select
                label="Faculty member"
                value={form.teacherId || null}
                options={(teachers.data ?? []).map((t) => ({
                  value: t.id,
                  label: t.displayName,
                  sublabel: t.userId ? "Already has a login" : `Fingerprint ID ${t.biometricId}`,
                  disabled: Boolean(t.userId),
                }))}
                onChange={set("teacherId")}
                hint="Their own lectures, punches and salary appear under My teaching."
                placeholder="Choose who this login is for"
              />
            ) : null}
            <HStack gap={8}>
              <Button label="Create login" onPress={submit} loading={create.isPending} testID="cu-submit" />
              <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
            </HStack>
          </VStack>
        )}
      </Card>
    </Screen>
  );
}

import React, { useState } from "react";
import { Card, VStack, HStack, Text, Button, Banner, SectionHeader, TextField } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { useSchools, useCreateSchool } from "../hooks/useAcademy";

/** Schools students come from. Front desk adds one by typing it at admission; this is the tidy list. */
export function SchoolsPanel() {
  const schools = useSchools();
  const create = useCreateSchool();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <VStack gap={12}>
        <SectionHeader title="Schools and colleges" subtitle={`${schools.data?.length ?? 0} on the list`} />
        {error ? <Banner tone="danger" message={error} /> : null}
        <HStack gap={8} align="flex-end" wrap>
          <TextField label="Add a school" value={name} onChangeText={setName} containerStyle={{ flex: 1, minWidth: 220 }} />
          <Button
            label="Add"
            loading={create.isPending}
            onPress={async () => {
              setError(null);
              try {
                await create.mutateAsync(name);
                setName("");
              } catch (err) {
                setError(apiErrorMessage(err));
              }
            }}
          />
        </HStack>
        <Text variant="body-sm" tone="secondary">
          {(schools.data ?? []).map((s) => s.name).join(" · ") || "None yet."}
        </Text>
      </VStack>
    </Card>
  );
}

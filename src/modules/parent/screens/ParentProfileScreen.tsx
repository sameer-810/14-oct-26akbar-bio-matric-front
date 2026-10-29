import React from "react";
import { View, StyleSheet } from "react-native";

import { Screen, Card, VStack, HStack, Text, Avatar, Skeleton, ErrorState, useBreakpoint } from "@shared/ui";
import { formatDay, formatWallTime } from "@shared/format";
import { useSelectedChild, useChildProfile } from "../hooks/useParent";
import { ChildPicker } from "../components/ChildPicker";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <HStack gap={12} align="flex-start">
      <Text variant="body-sm" tone="tertiary" style={styles.label}>
        {label}
      </Text>
      <Text variant="body-sm" style={{ flex: 1 }}>
        {value}
      </Text>
    </HStack>
  );
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** What the academy holds about the child and the family — the old app's Profile screen. Ask the desk to change anything. */
export default function ParentProfileScreen() {
  const { isWide } = useBreakpoint();
  const { child } = useSelectedChild();
  const profile = useChildProfile(child?.id);
  const p = profile.data;
  const address = p ? [p.address.line1, p.address.landmark, p.address.city, p.address.state, p.address.pincode].filter(Boolean).join(", ") : "";

  return (
    <Screen title="Profile" subtitle="To change anything here, ask the academy's front desk." testID="parent-profile">
      <View style={[styles.wrap, isWide && styles.wrapWide]}>
        <VStack gap={12}>
          <ChildPicker />
          {profile.isLoading ? <Skeleton height={200} /> : null}
          {profile.error ? <ErrorState error={profile.error} onRetry={() => void profile.refetch()} /> : null}
          {p ? (
            <>
              <Card>
                <VStack gap={10}>
                  <HStack gap={12} align="center">
                    <Avatar name={p.name} uri={p.photoUrl || undefined} size={56} />
                    <VStack gap={2} flex={1}>
                      <Text variant="h3">{p.name}</Text>
                      <Text variant="caption" tone="tertiary">
                        GR {p.grNumber}
                      </Text>
                    </VStack>
                  </HStack>
                  <Row label="Batch" value={p.batch ? `${p.batch.name} · ${formatWallTime(p.batch.startTime)}–${formatWallTime(p.batch.endTime)}` : "Not in a batch yet"} />
                  {p.otherBatches?.length ? <Row label="Also in" value={p.otherBatches.join(", ")} /> : null}
                  <Row label="Admitted" value={formatDay(p.admissionDate)} />
                  <Row label="Gender" value={p.gender ? capital(p.gender) : ""} />
                  <Row label="Birth date" value={p.dateOfBirth ? formatDay(p.dateOfBirth) : ""} />
                  <Row label="School" value={p.schoolName} />
                  <Row label="Phone" value={p.phone} />
                  <Row label="Email" value={p.email} />
                  <Row label="Address" value={address} />
                </VStack>
              </Card>
              {p.guardians.map((g, i) => (
                <Card key={`${g.relation}-${i}`} testID={`profile-guardian-${g.relation}`}>
                  <VStack gap={8}>
                    <Text variant="h3">{capital(g.relation)}</Text>
                    <Row label="Name" value={g.name} />
                    <Row label="Phone" value={g.phone} />
                    <Row label="Email" value={g.email} />
                  </VStack>
                </Card>
              ))}
            </>
          ) : null}
        </VStack>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignSelf: "center" },
  wrapWide: { maxWidth: 640 },
  label: { width: 92 },
});

import React from "react";
import { Screen, Card, VStack, Text, SectionHeader, Button, useBreakpoint, HStack } from "@shared/ui";
import { useAuthStore } from "@shared/store/useAuthStore";
import { formatDateTime } from "@shared/format";
import ChangePasswordScreen from "./ChangePasswordScreen";
import { SessionsCard } from "../components/SessionsCard";

/** My account: who I am, my password, where I am signed in. */
export default function ProfileScreen() {
  const { isWide } = useBreakpoint();
  const staff = useAuthStore((s) => s.staff);
  const logout = useAuthStore((s) => s.logout);

  return (
    <Screen title="My account" testID="profile-screen">
      <VStack gap={16}>
        <Card>
          <VStack gap={6}>
            <Text variant="h2">{staff?.name}</Text>
            <Text tone="secondary">
              {staff?.roleLabel} · username {staff?.username}
            </Text>
            <Text variant="caption" tone="tertiary">
              Last sign-in {formatDateTime(staff?.lastLoginAt)}
            </Text>
          </VStack>
        </Card>
        <HStack gap={16} align="flex-start" wrap={!isWide} style={{ flexDirection: isWide ? "row" : "column" }}>
          <VStack gap={8} flex={isWide ? 1 : undefined} style={{ width: isWide ? undefined : "100%" }}>
            <SectionHeader title="Change password" />
            <ChangePasswordScreen />
          </VStack>
          <VStack gap={8} flex={isWide ? 1 : undefined} style={{ width: isWide ? undefined : "100%" }}>
            <SessionsCard />
            <Button label="Sign out" variant="secondary" onPress={() => void logout()} />
          </VStack>
        </HStack>
      </VStack>
    </Screen>
  );
}

import React from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Fingerprint } from "lucide-react-native";

import { Screen, Card, VStack, HStack, Text, StatusChip, Banner, EmptyState, ErrorState, Skeleton } from "@shared/ui";
import { formatRelative, formatDateTime } from "@shared/format";
import { useDevices } from "../hooks/useDevices";
import type { Device } from "../types";
import type { DevicesParamList } from "../DevicesNavigator";

/**
 * Every machine that has ever called the server. A new one appears here as
 * "pending" the first time it connects; nothing it sends is used until it is
 * approved.
 */
export default function DevicesScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DevicesParamList>>();
  const devices = useDevices();
  const pending = (devices.data ?? []).filter((d) => d.status === "pending");

  return (
    <Screen
      title="Fingerprint machines"
      subtitle="Point a machine at this server and it appears here."
      testID="devices-screen"
      refreshing={devices.isRefetching}
      onRefresh={() => void devices.refetch()}
    >
      <VStack gap={12}>
        {pending.length ? (
          <Banner
            tone="warning"
            title={`${pending.length} machine${pending.length === 1 ? "" : "s"} waiting for approval`}
            message="Its punches are being held. Approve it only if it is the academy's machine — check the serial on the label under the device."
          />
        ) : null}
        {devices.isLoading ? <Skeleton height={96} /> : null}
        {devices.error ? <ErrorState error={devices.error} onRetry={() => void devices.refetch()} /> : null}
        {devices.data && devices.data.length === 0 ? (
          <EmptyState
            icon={Fingerprint}
            title="No machine has connected yet"
            message="On the machine: Menu → Comm → Cloud Server. Set the server address to this server's public IP and the port to the device port (8099)."
          />
        ) : null}
        {(devices.data ?? []).map((d) => (
          <DeviceCard key={d.id} device={d} onPress={() => nav.navigate("DeviceDetail", { id: d.id })} />
        ))}
      </VStack>
    </Screen>
  );
}

function DeviceCard({ device: d, onPress }: { device: Device; onPress: () => void }) {
  return (
    <Card onPress={onPress} accessibilityLabel={`Machine ${d.name || d.serial}`} testID={`device-${d.serial}`}>
      <VStack gap={8}>
        <HStack gap={8} align="center" wrap>
          <Text variant="h3" style={{ flexShrink: 1 }}>
            {d.name || d.serial}
          </Text>
          <StatusChip status={d.status} size="sm" />
          {d.status === "approved" ? <StatusChip status={d.online ? "online" : "offline"} size="sm" /> : null}
        </HStack>
        <Text variant="body-sm" tone="secondary">
          Serial {d.serial}
          {d.location ? ` · ${d.location}` : ""} · firmware {d.dialect === "v3" ? "3.x" : "2.x"}
        </Text>
        <Text variant="body-sm" tone="secondary">
          Last seen {formatRelative(d.lastSeenAt)} · last punch {d.lastPunchAt ? formatDateTime(d.lastPunchAt) : "none yet"} ·{" "}
          {d.punchCount} punches
        </Text>
        {d.quarantined ? (
          <Text variant="body-sm" tone="warning">
            {d.quarantined} upload{d.quarantined === 1 ? "" : "s"} held until approval
          </Text>
        ) : null}
        {d.failedCommands ? (
          <Text variant="body-sm" tone="danger">
            {d.failedCommands} command{d.failedCommands === 1 ? "" : "s"} failed
          </Text>
        ) : null}
        {d.clockAheadSeconds && d.clockAheadSeconds > 300 ? (
          <Text variant="body-sm" tone="danger">
            The machine&apos;s clock looks {Math.round(d.clockAheadSeconds / 60)} minutes fast
          </Text>
        ) : null}
      </VStack>
    </Card>
  );
}

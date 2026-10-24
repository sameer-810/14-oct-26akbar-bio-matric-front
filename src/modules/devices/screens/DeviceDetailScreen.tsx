import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  Screen,
  Card,
  VStack,
  HStack,
  Text,
  Button,
  Banner,
  StatusChip,
  TextField,
  Select,
  SectionHeader,
  ConfirmDialog,
  ErrorState,
  Skeleton,
  useBreakpoint,
} from "@shared/ui";
import { palette, radius } from "@shared/designSystem";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { apiErrorMessage } from "@api/apiClient";
import { formatDateTime, formatRelative } from "@shared/format";
import {
  useDevice,
  useDeviceCommands,
  useDeviceTraffic,
  useUpdateDevice,
  useApproveDevice,
  useBlockDevice,
  useRemoveDevice,
  useQueueCommand,
  useRetryCommand,
  useCancelCommand,
  useLoadEveryone,
} from "../hooks/useDevices";
import type { DeviceCommand, StaffCommandKind } from "../types";
import type { DevicesParamList } from "../DevicesNavigator";

type Props = NativeStackScreenProps<DevicesParamList, "DeviceDetail">;

export default function DeviceDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { isWide } = useBreakpoint();
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.DEVICES_MANAGE));
  const canDanger = useAuthStore((s) => s.hasPermission(PERMISSIONS.DEVICES_DANGEROUS));
  const device = useDevice(id);
  const commands = useDeviceCommands(id);
  const [showTraffic, setShowTraffic] = useState(false);
  const traffic = useDeviceTraffic(id, showTraffic && canManage);

  const update = useUpdateDevice(id);
  const approve = useApproveDevice(id);
  const block = useBlockDevice(id);
  const remove = useRemoveDevice(id);
  const queue = useQueueCommand(id);
  const retry = useRetryCommand(id);
  const cancel = useCancelCommand(id);
  const loadEveryone = useLoadEveryone(id);

  // null until edited: the fields show the server's values without copying them into state
  const [draft, setDraft] = useState<{ name: string; location: string } | null>(null);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [danger, setDanger] = useState<StaffCommandKind | null>(null);
  const [typed, setTyped] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const d = device.data;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setMessage(null);
    try {
      await fn();
      setMessage({ tone: "success", text: ok });
    } catch (err) {
      setMessage({ tone: "danger", text: apiErrorMessage(err) });
    }
  };

  if (device.isLoading) return <Screen title="Machine"><Skeleton height={200} /></Screen>;
  if (device.error || !d) {
    return (
      <Screen title="Machine">
        <ErrorState error={device.error} onRetry={() => void device.refetch()} />
      </Screen>
    );
  }

  const form = draft ?? { name: d.name, location: d.location };
  const setForm = (patch: Partial<typeof form>) => setDraft({ ...form, ...patch });

  return (
    <Screen
      title={d.name || d.serial}
      overline="Fingerprint machine"
      testID="device-detail"
      right={<Button label="All machines" variant="ghost" size="sm" onPress={() => navigation.navigate("DevicesList")} />}
    >
      <VStack gap={16}>
        {message ? <Banner tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} /> : null}

        {d.status === "pending" ? (
          <Banner
            tone="warning"
            title="Waiting for approval"
            message={`This machine (serial ${d.serial}) connected from ${d.remoteIp || "an unknown address"}. ${d.quarantined} upload(s) are held. Approve only if the serial matches the label on the academy's machine.`}
            action={
              canManage ? (
                <Button
                  label="Approve this machine"
                  loading={approve.isPending}
                  onPress={() => run(() => approve.mutateAsync(), "Approved. Held punches were processed.")}
                  testID="device-approve"
                />
              ) : undefined
            }
          />
        ) : null}

        <View style={[styles.grid, isWide && styles.gridWide]}>
          <Card style={styles.cell}>
            <VStack gap={8}>
              <HStack gap={8} align="center" wrap>
                <StatusChip status={d.status} />
                {d.status === "approved" ? <StatusChip status={d.online ? "online" : "offline"} /> : null}
              </HStack>
              <Fact label="Serial" value={d.serial} />
              <Fact label="Firmware" value={`${d.dialect === "v3" ? "3.x" : "2.x"} (${d.dialectSource})${d.firmware ? ` · ${d.firmware}` : ""}`} />
              <Fact label="Last seen" value={`${formatRelative(d.lastSeenAt)} from ${d.remoteIp || "—"}`} />
              <Fact label="Last punch" value={formatDateTime(d.lastPunchAt)} />
              <Fact label="Punches received" value={String(d.punchCount)} />
              <Fact
                label="On the machine"
                value={d.userCount === null ? "Not reported yet — use Refresh details" : `${d.userCount} users · ${d.fpCount ?? 0} fingerprints`}
              />
              {d.clockAheadSeconds && d.clockAheadSeconds > 300 ? (
                <Banner
                  tone="danger"
                  message={`Its clock was ${Math.round(d.clockAheadSeconds / 60)} minutes fast on ${formatDateTime(d.lastFuturePunchAt)}. Set the time on the machine: Menu → System → Date/Time.`}
                />
              ) : null}
            </VStack>
          </Card>

          {canManage ? (
            <Card style={styles.cell}>
              <VStack gap={12}>
                <SectionHeader title="Details" />
                <TextField label="Name" value={form.name} onChangeText={(v) => setForm({ name: v })} placeholder="Main gate" />
                <TextField
                  label="Where it is"
                  value={form.location}
                  onChangeText={(v) => setForm({ location: v })}
                  placeholder="Ground floor, entrance"
                />
                <Select
                  label="Firmware dialect"
                  value={d.dialect}
                  options={[
                    { value: "v2", label: "2.x (older)", sublabel: "DATA USER / DEL_USER" },
                    { value: "v3", label: "3.x (newer)", sublabel: "DATA UPDATE USERINFO" },
                  ]}
                  onChange={(v) => run(() => update.mutateAsync({ dialect: v as "v2" | "v3" }), "Dialect set. Queued commands will use it.")}
                  hint="Detected automatically. Change it only if commands fail with 'syntax refused'."
                />
                <HStack gap={8} wrap>
                  <Button
                    label="Save"
                    loading={update.isPending}
                    onPress={() => run(async () => { await update.mutateAsync(form); setDraft(null); }, "Saved.")}
                  />
                  {d.status !== "blocked" ? (
                    <Button label="Block machine" variant="destructive" onPress={() => setConfirmBlock(true)} />
                  ) : (
                    <Button label="Approve again" onPress={() => run(() => approve.mutateAsync(), "Approved.")} />
                  )}
                  {d.status !== "approved" ? (
                    <Button label="Remove machine" variant="critical" onPress={() => setConfirmRemove(true)} testID="device-remove" />
                  ) : null}
                </HStack>
              </VStack>
            </Card>
          ) : null}
        </View>

        {canManage && d.status === "approved" ? (
          <Card>
            <VStack gap={12}>
              <SectionHeader title="Ask the machine" subtitle="It picks the request up on its next check-in, within a few seconds." />
              <HStack gap={8} wrap>
                <Button label="Refresh details" variant="secondary" size="sm" onPress={() => run(() => queue.mutateAsync({ kind: "info" }), "Sent.")} />
                <Button label="Upload anything new" variant="secondary" size="sm" onPress={() => run(() => queue.mutateAsync({ kind: "check" }), "Sent.")} />
                <Button
                  label="Load everyone onto this machine"
                  variant="secondary"
                  size="sm"
                  onPress={() =>
                    run(async () => {
                      const r = await loadEveryone.mutateAsync(true);
                      setMessage({ tone: "success", text: `${r.people} people and ${r.fingerprints} stored fingerprints queued. The machine works through them a few seconds at a time.` });
                    }, "Queued.")
                  }
                  testID="device-load-everyone"
                />
                {d.dialect === "v3" ? (
                  <Button label="Send its user list" variant="secondary" size="sm" onPress={() => run(() => queue.mutateAsync({ kind: "query_users" }), "Sent.")} />
                ) : null}
                {canDanger ? (
                  <>
                    <Button label="Restart" variant="destructive" size="sm" onPress={() => setDanger("reboot")} />
                    <Button label="Clear attendance log" variant="critical" size="sm" onPress={() => setDanger("clear_log")} />
                  </>
                ) : null}
              </HStack>
              {danger ? (
                <View style={styles.dangerBox}>
                  <VStack gap={10}>
                    <Text weight="600" tone="danger">
                      {danger === "clear_log"
                        ? "Clearing the log deletes every punch stored on the machine, including any not yet received here."
                        : "Restarting interrupts anyone punching right now."}
                    </Text>
                    <TextField label={`Type the serial ${d.serial} to confirm`} value={typed} onChangeText={setTyped} autoCapitalize="characters" />
                    <HStack gap={8}>
                      <Button
                        label={danger === "clear_log" ? "Clear the log" : "Restart"}
                        variant="critical"
                        disabled={typed !== d.serial}
                        onPress={() =>
                          run(async () => {
                            await queue.mutateAsync({ kind: danger, confirm: typed });
                            setDanger(null);
                            setTyped("");
                          }, "Sent.")
                        }
                      />
                      <Button label="Cancel" variant="ghost" onPress={() => { setDanger(null); setTyped(""); }} />
                    </HStack>
                  </VStack>
                </View>
              ) : null}
            </VStack>
          </Card>
        ) : null}

        <Card>
          <VStack gap={8}>
            <SectionHeader title="Commands" subtitle="Adding and removing students happens here automatically after admission." />
            {commands.isLoading ? <Skeleton height={60} /> : null}
            {(commands.data ?? []).length === 0 && !commands.isLoading ? (
              <Text tone="tertiary">Nothing sent to this machine yet.</Text>
            ) : null}
            {(commands.data ?? []).map((c) => (
              <CommandRow
                key={c.commandId}
                c={c}
                canManage={canManage}
                onRetry={() => run(() => retry.mutateAsync(c.commandId), "Queued again.")}
                onCancel={() => run(() => cancel.mutateAsync(c.commandId), "Cancelled.")}
              />
            ))}
          </VStack>
        </Card>

        {canManage ? (
          <Card>
            <VStack gap={8}>
              <SectionHeader
                title="Raw requests"
                subtitle="Exactly what the machine sent and what it was told. For checking a new machine; fingerprints are never shown."
                right={<Button label={showTraffic ? "Hide" : "Show"} size="sm" variant="ghost" onPress={() => setShowTraffic((v) => !v)} />}
              />
              {showTraffic ? (
                <ScrollView horizontal>
                  <VStack gap={6}>
                    {(traffic.data ?? []).map((t, i) => (
                      <Text key={`${t.at}-${i}`} variant="caption" style={styles.mono} selectable>
                        {`${formatDateTime(t.at)}  ${t.method} ${t.path}?${t.query} → ${t.status} (${t.ms} ms)${t.body ? `\n  ⇢ ${t.body.slice(0, 300)}` : ""}${t.response ? `\n  ⇠ ${t.response.slice(0, 300)}` : ""}`}
                      </Text>
                    ))}
                    {traffic.data && traffic.data.length === 0 ? <Text tone="tertiary">No requests recorded.</Text> : null}
                  </VStack>
                </ScrollView>
              ) : null}
            </VStack>
          </Card>
        ) : null}
      </VStack>

      <ConfirmDialog
        visible={confirmBlock}
        title="Block this machine?"
        message="Its punches will be ignored and anything it is holding here is discarded. Use this for a machine that is not the academy's."
        confirmLabel="Block"
        destructive
        loading={block.isPending}
        onConfirm={() => run(async () => { await block.mutateAsync(); setConfirmBlock(false); }, "Blocked.")}
        onCancel={() => setConfirmBlock(false)}
      />
      <ConfirmDialog
        visible={confirmRemove}
        title="Remove this machine?"
        message="It disappears from the list and its queued commands are dropped. The punches it already sent stay in attendance. If it connects again it comes back as waiting for approval."
        confirmLabel="Remove"
        destructive
        loading={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync();
            setConfirmRemove(false);
            navigation.navigate("DevicesList");
          } catch (e) {
            setConfirmRemove(false);
            setMessage({ tone: "danger", text: apiErrorMessage(e) });
          }
        }}
        onCancel={() => setConfirmRemove(false)}
      />
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <HStack gap={8} align="flex-start">
      <Text variant="body-sm" tone="tertiary" style={{ width: 130 }}>
        {label}
      </Text>
      <Text variant="body-sm" style={{ flex: 1 }}>
        {value}
      </Text>
    </HStack>
  );
}

function CommandRow({ c, canManage, onRetry, onCancel }: { c: DeviceCommand; canManage: boolean; onRetry: () => void; onCancel: () => void }) {
  return (
    <View style={styles.cmdRow}>
      <HStack gap={8} align="center" wrap>
        <Text variant="label" style={{ flexShrink: 1 }}>
          #{c.commandId} {c.description || c.kind}
        </Text>
        <StatusChip status={c.status} size="sm" />
        {canManage && (c.status === "failed" || c.status === "cancelled") ? (
          <Button label="Retry" size="xs" variant="secondary" onPress={onRetry} />
        ) : null}
        {canManage && c.status === "pending" ? <Button label="Cancel" size="xs" variant="ghost" onPress={onCancel} /> : null}
      </HStack>
      <Text variant="caption" tone="tertiary">
        Queued {formatDateTime(c.createdAt)} · tries {c.attempts}
        {c.resultAt ? ` · answered ${formatDateTime(c.resultAt)}` : ""}
      </Text>
      {c.error ? (
        <Text variant="caption" tone="danger">
          {c.error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 16 },
  gridWide: { flexDirection: "row", alignItems: "flex-start" },
  cell: { flex: 1 },
  dangerBox: {
    borderWidth: 1,
    borderColor: palette.danger.border,
    backgroundColor: palette.danger.bg,
    borderRadius: radius.md,
    padding: 12,
  },
  cmdRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border.subtle, gap: 2 },
  mono: { fontFamily: "monospace" },
});

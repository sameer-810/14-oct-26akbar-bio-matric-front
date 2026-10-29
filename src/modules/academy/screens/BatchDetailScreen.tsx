import React from "react";
import { useNavigation, type NavigationProp, type ParamListBase } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen, Card, VStack, HStack, Text, Button, StatusChip, Skeleton, ErrorState } from "@shared/ui";
import { formatDay } from "@shared/format";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { useBatch, useStandards } from "../hooks/useAcademy";
import { BatchStudentsTable } from "../components/BatchStudentsTable";
import { dayLabels } from "../components/DaysPicker";
import { to12h } from "../components/batchTime";
import type { BatchesParamList } from "../BatchesNavigator";

type Props = NativeStackScreenProps<BatchesParamList, "BatchDetail">;

/** One batch: its details and everyone in it, home or extra batch. */
export default function BatchDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const batch = useBatch(id);
  const standards = useStandards();
  const root = useNavigation<NavigationProp<ParamListBase>>();
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.BATCHES_MANAGE) || s.hasPermission(PERMISSIONS.STUDENTS_MANAGE));

  if (batch.isLoading) return <Screen title="Batch"><Skeleton height={240} /></Screen>;
  const b = batch.data;
  if (batch.error || !b) return <Screen title="Batch"><ErrorState error={batch.error} onRetry={() => void batch.refetch()} /></Screen>;

  return (
    <Screen
      title={b.name}
      overline={standards.data?.find((s) => s.id === b.standardId)?.name}
      right={canManage ? <Button label="Edit" variant="secondary" onPress={() => navigation.navigate("BatchEdit", { id })} testID="batch-detail-edit" /> : undefined}
      testID="batch-detail"
    >
      <VStack gap={16}>
        <Card>
          <HStack gap={24} wrap>
            <Fact label="Time" value={`${to12h(b.startTime)} – ${to12h(b.endTime)}`} />
            <Fact label="Meets on" value={dayLabels(b.workingDays)} />
            {b.room ? <Fact label="Room" value={b.room} /> : null}
            <Fact label="Created" value={b.createdAt ? formatDay(b.createdAt.slice(0, 10)) : "—"} />
            <VStack gap={2}>
              <Text variant="caption" tone="tertiary">
                Status
              </Text>
              <StatusChip status={b.isActive ? "active" : "inactive"} size="sm" />
            </VStack>
          </HStack>
        </Card>
        <BatchStudentsTable
          batch={b}
          onOpenStudent={(s) => root.navigate("Students", { screen: "StudentDetail", params: { id: s.id } })}
          testID="batch-detail-students"
        />
      </VStack>
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <VStack gap={2}>
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
      <Text variant="body-sm">{value}</Text>
    </VStack>
  );
}

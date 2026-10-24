import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { Screen, Card, VStack, HStack, Text, Button, Skeleton, ErrorState, ChipsRow, useBreakpoint, PunchDaysCard } from "@shared/ui";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { academyToday, formatMonth, shiftMonth } from "@shared/format";
import { LectureCard } from "@modules/lectures/components/LectureCard";
import { PayRatesCard } from "@modules/payroll/components/PayRatesCard";
import { MonthPayCard } from "@modules/payroll/components/MonthPayCard";
import { useTeacherMonth } from "@modules/payroll/hooks/usePayroll";
import { useTeacher, useTeacherLectures, useTeacherDays } from "../hooks/useTeachers";

const monthRange = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return { from: `${ym}-01`, to: `${ym}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}` };
};

/**
 * A faculty member: their lectures scheduled against what their punches say,
 * their days at the academy, and — for those allowed — their pay.
 */
export default function TeacherDetailScreen() {
  const { isWide } = useBreakpoint();
  const { id } = useRoute().params as { id: string };
  const nav = useNavigation<{ navigate: (name: string, params?: object) => void; goBack: () => void }>();
  const canPay = useAuthStore((s) => s.hasPermission(PERMISSIONS.PAYROLL_VIEW) || s.hasPermission(PERMISSIONS.PAYROLL_MANAGE));
  const canSetPay = useAuthStore((s) => s.hasPermission(PERMISSIONS.PAYROLL_MANAGE));
  const canManageLectures = useAuthStore((s) => s.hasPermission(PERMISSIONS.LECTURES_MANAGE));
  const [month, setMonth] = useState(academyToday().slice(0, 7));
  const [tab, setTab] = useState<"lectures" | "days">("lectures");
  const { from, to } = monthRange(month);

  const teacher = useTeacher(id);
  const lectures = useTeacherLectures(id, from, to);
  const days = useTeacherDays(id, from, to);
  const pay = useTeacherMonth(id, month, { enabled: canPay });
  const t = teacher.data;

  return (
    <Screen
      title={t?.displayName ?? "Faculty"}
      subtitle={t ? `Fingerprint ID ${t.biometricId}${t.subjects.length ? ` · ${t.subjects.join(", ")}` : ""}` : undefined}
      right={<Button label="All faculty" variant="ghost" onPress={() => nav.navigate("TeachersList")} />}
      testID="teacher-detail"
    >
      <VStack gap={16}>
        {teacher.isLoading ? <Skeleton height={80} /> : null}
        {teacher.error ? <ErrorState error={teacher.error} onRetry={() => void teacher.refetch()} /> : null}

        <HStack gap={8} align="center">
          <Button label="‹" size="sm" variant="ghost" onPress={() => setMonth(shiftMonth(month, -1))} accessibilityHint="Previous month" />
          <Text variant="h3" style={{ flex: 1 }} center>
            {formatMonth(month)}
          </Text>
          <Button label="›" size="sm" variant="ghost" onPress={() => setMonth(shiftMonth(month, 1))} accessibilityHint="Next month" />
        </HStack>

        <View style={[styles.cols, isWide && styles.colsWide]}>
          <VStack gap={12} style={isWide ? { flex: 3 } : undefined}>
            <ChipsRow
              chips={[
                { key: "lectures", label: "Lectures", count: lectures.data?.filter((l) => l.status === "scheduled").length },
                { key: "days", label: "Days and punches", count: days.data?.days.length },
              ]}
              active={tab}
              onChange={(k) => setTab(k as typeof tab)}
            />
            {tab === "lectures" ? (
              <>
                {lectures.isLoading ? <Skeleton height={120} /> : null}
                {lectures.data?.length === 0 ? (
                  <Card>
                    <Text tone="tertiary">No lectures this month.</Text>
                  </Card>
                ) : null}
                {(lectures.data ?? []).map((l) => (
                  <LectureCard
                    key={l.id}
                    lecture={l}
                    canManage={canManageLectures}
                    showDate
                    showTeacher={false}
                    onOpen={() => nav.navigate("Registers", { screen: "LectureRegister", params: { id: l.id } })}
                  />
                ))}
              </>
            ) : days.data ? (
              <PunchDaysCard data={days.data} testID="teacher-days" />
            ) : (
              <Skeleton height={120} />
            )}
          </VStack>

          {canPay ? (
            <VStack gap={12} style={isWide ? { flex: 2 } : undefined}>
              {pay.data ? <MonthPayCard month={pay.data} title={`Pay · ${formatMonth(month)}`} /> : <Skeleton height={120} />}
              <PayRatesCard teacherId={id} canManage={canSetPay} />
            </VStack>
          ) : null}
        </View>
      </VStack>
    </Screen>
  );
}


const styles = StyleSheet.create({
  cols: { gap: 16 },
  colsWide: { flexDirection: "row", alignItems: "flex-start" },
});

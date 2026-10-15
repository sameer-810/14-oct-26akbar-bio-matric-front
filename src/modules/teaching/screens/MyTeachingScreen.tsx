import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Screen, Card, VStack, HStack, Text, ChipsRow, SectionHeader, Skeleton, ErrorState, useBreakpoint } from "@shared/ui";
import { academyToday, addDaysTo, formatDay, formatMonth, formatTime } from "@shared/format";
import { LectureCard } from "@modules/lectures/components/LectureCard";
import { MonthPayCard } from "@modules/payroll/components/MonthPayCard";
import { teachingApi } from "../api/teachingApi";

/**
 * The old "Faculty login": my lectures, cancelling one of mine, my punches
 * and my salary — as far as the owner allows.
 */
export default function MyTeachingScreen() {
  const { isWide } = useBreakpoint();
  const nav = useNavigation<{ navigate: (name: string, params?: object) => void }>();
  const qc = useQueryClient();
  const today = academyToday();
  const month = today.slice(0, 7);
  const [tab, setTab] = useState<"next" | "past">("next");
  const range = tab === "next" ? { from: today, to: addDaysTo(today, 13) } : { from: addDaysTo(today, -30), to: addDaysTo(today, -1) };

  const me = useQuery({ queryKey: ["teaching", "me"], queryFn: teachingApi.me });
  const lectures = useQuery({ queryKey: ["teaching", "lectures", range.from, range.to], queryFn: () => teachingApi.lectures(range.from, range.to) });
  const days = useQuery({ queryKey: ["teaching", "days", month], queryFn: () => teachingApi.days(`${month}-01`, today) });
  const salary = useQuery({
    queryKey: ["teaching", "salary", month],
    queryFn: () => teachingApi.salary(month),
    enabled: Boolean(me.data?.allowed.salary),
  });
  const cancel = useMutation({
    mutationFn: (v: { id: string; reason: string }) => teachingApi.cancel(v.id, v.reason),
    onSuccess: () => {
      for (const k of ["teaching", "lectures", "lectureCalendar"]) void qc.invalidateQueries({ queryKey: [k] });
    },
  });
  const list = tab === "past" ? [...(lectures.data ?? [])].reverse() : (lectures.data ?? []);

  return (
    <Screen title="My teaching" subtitle={me.data?.teacher.displayName} testID="my-teaching">
      <View style={[styles.cols, isWide && styles.colsWide]}>
        <VStack gap={12} style={isWide ? { flex: 3 } : undefined}>
          {me.error ? <ErrorState error={me.error} /> : null}
          <ChipsRow
            chips={[
              { key: "next", label: "Next two weeks" },
              { key: "past", label: "Last 30 days" },
            ]}
            active={tab}
            onChange={(k) => setTab(k as typeof tab)}
          />
          {lectures.isLoading ? <Skeleton height={140} /> : null}
          {lectures.data && list.length === 0 ? (
            <Card>
              <Text tone="tertiary">No lectures.</Text>
            </Card>
          ) : null}
          {list.map((l) => (
            <LectureCard
              key={l.id}
              lecture={l}
              canManage={false}
              showDate
              showTeacher={false}
              onOpen={() => nav.navigate("Registers", { screen: "LectureRegister", params: { id: l.id } })}
              onCancelOverride={me.data?.allowed.cancelLecture ? (reason) => cancel.mutateAsync({ id: l.id, reason }) : undefined}
            />
          ))}
        </VStack>

        <VStack gap={12} style={isWide ? { flex: 2 } : undefined}>
          {me.data?.allowed.salary && salary.data ? <MonthPayCard month={salary.data} title={`My pay · ${formatMonth(month)}`} /> : null}
          <Card testID="my-days">
            <VStack gap={6}>
              <SectionHeader title="My punches this month" />
              {days.data?.days.length === 0 ? <Text tone="tertiary">None yet.</Text> : null}
              {(days.data?.days ?? []).map((d) => (
                <HStack key={d.date} gap={8}>
                  <Text variant="body-sm" style={{ width: 110 }}>
                    {formatDay(d.date)}
                  </Text>
                  <Text variant="body-sm" tone="secondary">
                    {formatTime(d.inAt)} – {d.outAt ? formatTime(d.outAt) : "no exit punch"}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </Card>
        </VStack>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cols: { gap: 16 },
  colsWide: { flexDirection: "row", alignItems: "flex-start" },
});

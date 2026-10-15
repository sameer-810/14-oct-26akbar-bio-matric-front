import React, { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react-native";

import { Screen, VStack, HStack, Text, Button, ChipsRow, Select, Skeleton, ErrorState, EmptyState, Card, Banner } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { academyToday, addDaysTo, formatDay, formatMonth, shiftMonth } from "@shared/format";
import { useBatches } from "@modules/academy/hooks/useAcademy";
import { useTeachers } from "@modules/teachers/hooks/useTeachers";
import { useLectureList, useLectureCalendar } from "../hooks/useLectures";
import { LectureCard } from "../components/LectureCard";
import { LectureForm } from "../components/LectureForm";
import { MonthCounts } from "../components/MonthCounts";

type Nav = { navigate: (name: string, params?: object) => void };

/**
 * Every lecture of a day across the academy, or a month at a glance. The
 * old system had 99 of 128 lectures on "Lecturer Sir/Madam"; here each shows
 * its real teacher and whether they were there.
 */
export default function LecturesScreen() {
  const nav = useNavigation<Nav>();
  const canManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.LECTURES_MANAGE));
  const [view, setView] = useState<"day" | "month">("day");
  const [date, setDate] = useState(academyToday());
  const [month, setMonth] = useState(academyToday().slice(0, 7));
  const [batchId, setBatchId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [adding, setAdding] = useState(false);

  const batches = useBatches();
  const teachers = useTeachers();
  const filter = { batchId: batchId || undefined, teacherId: teacherId || undefined };
  const list = useLectureList({ date, ...filter }, { enabled: view === "day" });
  const calendar = useLectureCalendar({ month, ...filter });
  const lectures = list.data ?? [];
  const toConfirm = lectures.filter((l) => l.state === "overdue").length;

  const openRegister = (id: string) => nav.navigate("Registers", { screen: "LectureRegister", params: { id } });

  return (
    <Screen
      title="Lectures"
      subtitle={view === "day" ? formatDay(date) : formatMonth(month)}
      right={
        canManage ? (
          <HStack gap={8}>
            <Button label="Plan timetable" variant="secondary" onPress={() => nav.navigate("PlanLectures")} testID="lectures-plan" />
            {!adding ? <Button label="Add lecture" onPress={() => setAdding(true)} testID="lectures-add" /> : null}
          </HStack>
        ) : undefined
      }
      testID="lectures-screen"
    >
      <VStack gap={12}>
        <HStack gap={12} wrap align="flex-end">
          <ChipsRow
            chips={[
              { key: "day", label: "Day" },
              { key: "month", label: "Month" },
            ]}
            active={view}
            onChange={(k) => setView(k as "day" | "month")}
          />
          <VStack style={{ minWidth: 200, flex: 1 }}>
            <Select
              value={batchId || null}
              options={[{ value: "", label: "All batches" }, ...(batches.data ?? []).filter((b) => b.isActive).map((b) => ({ value: b.id, label: b.name }))]}
              onChange={setBatchId}
              placeholder="All batches"
            />
          </VStack>
          <VStack style={{ minWidth: 200, flex: 1 }}>
            <Select
              value={teacherId || null}
              options={[{ value: "", label: "All teachers" }, ...(teachers.data ?? []).map((t) => ({ value: t.id, label: t.displayName }))]}
              onChange={setTeacherId}
              placeholder="All teachers"
            />
          </VStack>
        </HStack>

        <HStack align="center" gap={8}>
          <Pressable
            onPress={() => (view === "day" ? setDate(addDaysTo(date, -1)) : setMonth(shiftMonth(month, -1)))}
            accessibilityRole="button"
            accessibilityLabel={view === "day" ? "Previous day" : "Previous month"}
            style={styles.nav}
          >
            <ChevronLeft size={20} color={palette.text.primary} />
          </Pressable>
          <Text variant="h3" style={{ flex: 1 }} center>
            {view === "day" ? formatDay(date) : formatMonth(month)}
          </Text>
          <Pressable
            onPress={() => (view === "day" ? setDate(addDaysTo(date, 1)) : setMonth(shiftMonth(month, 1)))}
            accessibilityRole="button"
            accessibilityLabel={view === "day" ? "Next day" : "Next month"}
            style={styles.nav}
          >
            <ChevronRight size={20} color={palette.text.primary} />
          </Pressable>
          {view === "day" && date !== academyToday() ? <Button label="Today" size="xs" variant="ghost" onPress={() => setDate(academyToday())} /> : null}
        </HStack>

        {adding ? <LectureForm date={date} batchId={batchId || undefined} onDone={() => setAdding(false)} /> : null}

        {view === "day" ? (
          <>
            {toConfirm > 0 ? (
              <Banner
                tone="warning"
                title={`${toConfirm} lecture${toConfirm === 1 ? "" : "s"} to confirm`}
                message="The teacher's punch does not show them in during the lecture. Confirm whether it was taken — it decides their pay."
              />
            ) : null}
            {list.isLoading ? <Skeleton height={160} /> : null}
            {list.error ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
            {list.data && lectures.length === 0 ? (
              <EmptyState icon={BookOpen} title="No lectures this day" message={canManage ? "Add one, or plan the timetable for the coming weeks." : undefined} />
            ) : null}
            {lectures.map((l) => (
              <LectureCard key={l.id} lecture={l} canManage={canManage} onOpen={() => openRegister(l.id)} showBatch={!batchId} showTeacher={!teacherId} />
            ))}
          </>
        ) : (
          <Card>
            {calendar.error ? <ErrorState error={calendar.error} onRetry={() => void calendar.refetch()} /> : null}
            <MonthCounts
              month={month}
              days={calendar.data ?? []}
              onPick={(d) => {
                setDate(d);
                setView("day");
              }}
            />
          </Card>
        )}
      </VStack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
});

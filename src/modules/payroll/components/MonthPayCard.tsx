import React from "react";
import { Card, VStack, HStack, Text, SectionHeader, Banner } from "@shared/ui";
import { formatRupees, formatDay } from "@shared/format";
import { PAY_KIND_LABELS, type TeacherMonth } from "../types";

const hours = (m: number) => (m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`);

/** A teacher's month: what they are owed and the lectures it is made of. */
export function MonthPayCard({ month: m, title = "This month's pay" }: { month: TeacherMonth; title?: string }) {
  return (
    <Card testID="month-pay">
      <VStack gap={10}>
        <SectionHeader
          title={title}
          subtitle={m.rate ? `${PAY_KIND_LABELS[m.rate.kind]} · ${formatRupees(m.rate.rate)}` : "No pay rate set"}
        />
        <HStack gap={16} wrap align="center">
          <Text variant="metric" testID="month-pay-amount">
            {formatRupees(m.amount)}
          </Text>
          <Text variant="body-sm" tone="secondary">
            {m.counts.conducted} taken · {m.counts.toConfirm} to confirm · {m.counts.cancelled} cancelled · {m.counts.upcoming} to come
          </Text>
        </HStack>
        <Text variant="caption" tone="tertiary">
          {hours(m.lectureMinutes)} of lectures · {m.daysAtAcademy} day{m.daysAtAcademy === 1 ? "" : "s"} at the academy ({hours(m.minutesAtAcademy)} by punches)
        </Text>
        {m.unpriced ? <Banner tone="warning" message="Lectures were taken but no pay rate is set, so nothing is counted yet." /> : null}
        {m.counts.toConfirm ? (
          <Banner tone="info" message="Lectures to confirm are not paid until the office confirms them (the teacher's punch did not show them in)." />
        ) : null}
        {m.lines.filter((l) => l.date).length ? (
          <VStack gap={2}>
            {m.lines
              .filter((l) => l.date)
              .map((l, i) => (
                <HStack key={`${l.date}-${i}`} gap={8}>
                  <Text variant="body-sm" style={{ flex: 1 }}>
                    {formatDay(l.date)} · {l.subject || "Lecture"} · {l.minutes} min
                  </Text>
                  <Text variant="body-sm" tabular>
                    {formatRupees(l.amount)}
                  </Text>
                </HStack>
              ))}
          </VStack>
        ) : null}
      </VStack>
    </Card>
  );
}

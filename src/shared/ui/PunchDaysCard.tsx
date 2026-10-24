import React from "react";
import { Card } from "./Card";
import { HStack, VStack } from "./Stack";
import { SectionHeader } from "./SectionHeader";
import { Text } from "./Text";
import { formatDay, formatTime } from "../format";

export interface PunchDays {
  days: {
    date: string;
    inAt: string | null;
    outAt: string | null;
    minutes: number;
    punchCount: number;
    sessions?: { inAt: string; outAt: string | null }[];
  }[];
  punches: { at: string; kind: string | null; source: string; deviceSerial: string }[];
}

const hours = (m: number) => (m ? `${Math.floor(m / 60)} h ${m % 60} min` : "");

/**
 * A teacher's or staff member's days from the machines: every IN with its
 * OUT (out for lunch and back is two lines), and the time inside.
 */
export function PunchDaysCard({ data, testID }: { data: PunchDays; testID?: string }) {
  return (
    <Card testID={testID}>
      <VStack gap={8}>
        <SectionHeader title="At the academy" subtitle="Every punch in with its punch out, on any machine." />
        {data.days.length === 0 ? <Text tone="tertiary">No punches in this period.</Text> : null}
        {data.days.map((d) => {
          const pairs = d.sessions?.length ? d.sessions : [{ inAt: d.inAt ?? "", outAt: d.outAt }];
          return (
            <HStack key={d.date} gap={8} align="flex-start">
              <Text variant="body-sm" style={{ width: 110 }}>
                {formatDay(d.date)}
              </Text>
              <VStack gap={2} flex={1}>
                {pairs.map((p, i) => (
                  <Text key={i} variant="body-sm">
                    {formatTime(p.inAt)} – {p.outAt ? formatTime(p.outAt) : "still in / no exit punch"}
                  </Text>
                ))}
              </VStack>
              <Text variant="body-sm" tone="secondary" tabular>
                {hours(d.minutes)}
              </Text>
            </HStack>
          );
        })}
        {data.punches.length ? (
          <Text variant="caption" tone="tertiary">
            {data.punches.length} punch{data.punches.length === 1 ? "" : "es"} in all, repeats included
          </Text>
        ) : null}
      </VStack>
    </Card>
  );
}

import React from "react";
import { StyleSheet, View } from "react-native";
import { Check } from "lucide-react-native";
import { Card, VStack, HStack, Text, StatusChip } from "@shared/ui";
import { palette, radius } from "@shared/designSystem";
import { formatDateTime } from "@shared/format";
import { SOURCE_LABELS, STAGE_LABELS, phoneOf, type Enquiry } from "../types";

interface Props {
  lead: Enquiry;
  now: number;
  onOpen: () => void;
  /** in select mode the card toggles its tick instead of opening */
  selecting?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}

/** A lead in the list: who, how to reach them, how warm, and when the next call is due. */
export function LeadCard({ lead: l, now, onOpen, selecting, selected, onToggle }: Props) {
  const phone = phoneOf(l);
  const late = l.nextFollowUpAt ? Date.parse(l.nextFollowUpAt) < now : false;

  return (
    <Card onPress={selecting ? onToggle : onOpen} accessibilityLabel={`Enquiry ${l.number}: ${l.name}`} testID={`enquiry-card-${l.number}`}>
      <HStack gap={12} align="flex-start">
        {selecting ? (
          // not a pressable of its own: a tap anywhere on the card toggles it,
          // and a nested pressable would toggle twice on the web
          <View
            accessibilityRole="checkbox"
            accessibilityState={{ checked: Boolean(selected) }}
            accessibilityLabel={`Select ${l.name}`}
            style={[styles.box, selected && styles.boxOn]}
            testID={`enquiry-select-${l.number}`}
          >
            {selected ? <Check size={14} color={palette.text.inverse} strokeWidth={3} /> : null}
          </View>
        ) : null}
        <VStack gap={6} flex={1}>
          <HStack gap={8} align="center" wrap>
            <Text variant="h3" style={{ flex: 1, minWidth: 160 }}>
              #{l.number} {l.name}
            </Text>
            <StatusChip status={STAGE_LABELS[l.stage]} size="sm" />
          </HStack>
          <Text variant="body-sm" tone="secondary">
            {[phone || "No phone", l.standardName, SOURCE_LABELS[l.source]].filter(Boolean).join(" · ")}
          </Text>
          <Text variant="caption" tone="tertiary">
            {l.assigneeName ? `With ${l.assigneeName}` : "Not assigned"}
            {l.nextFollowUpAt ? null : " · no follow-up planned"}
          </Text>
          {l.nextFollowUpAt ? (
            <Text variant="caption" tone={late ? "danger" : "secondary"} weight={late ? "600" : undefined}>
              Next follow-up {formatDateTime(l.nextFollowUpAt)}
              {late ? " · overdue" : ""}
            </Text>
          ) : null}
        </VStack>
      </HStack>
    </Card>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    marginTop: 2,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: palette.border.strong,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { backgroundColor: palette.primary[600], borderColor: palette.primary[600] },
});

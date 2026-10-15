import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { HStack, Text } from "@shared/ui";
import { palette, radius, layout } from "@shared/designSystem";

interface Tab {
  key: string;
  label: string;
  testID?: string;
}

/**
 * The look of ChipsRow, with a testID on each tab — the browser tests switch
 * between the fee views by it.
 */
export function FeeTabs({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (key: string) => void }) {
  return (
    <HStack gap={8} wrap role="tablist">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t.label}
            style={[styles.chip, on && styles.chipOn]}
            testID={t.testID}
          >
            <Text variant="label" weight={on ? "600" : "500"} style={{ color: on ? palette.primary[700] : palette.text.secondary }}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </HStack>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: layout.chipHeight + 4,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.border.default,
    backgroundColor: palette.surface.primary,
  },
  chipOn: { borderColor: palette.primary[400], backgroundColor: palette.primary[50] },
});

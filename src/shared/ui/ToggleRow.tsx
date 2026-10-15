import React from "react";
import { View, Switch, StyleSheet } from "react-native";
import { Text } from "./Text";
import { palette } from "../designSystem";

interface Props {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  testID?: string;
}

/** A labelled on/off switch; the whole row explains what turning it on does. */
export function ToggleRow({ label, hint, value, onChange, disabled, testID }: Props) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label">{label}</Text>
        {hint ? (
          <Text variant="caption" tone="tertiary">
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ true: palette.primary[500], false: palette.border.strong }}
        thumbColor={palette.surface.primary}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
});

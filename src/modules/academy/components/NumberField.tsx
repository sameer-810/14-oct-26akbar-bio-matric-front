import React from "react";
import { TextField } from "@shared/ui";

interface Props {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
  suffix?: string;
  max?: number;
  testID?: string;
}

/** Whole minutes or days. Non-digits are dropped as typed; the server checks the range. */
export function NumberField({ label, value, onChange, hint, suffix = "min", max = 600, testID }: Props) {
  return (
    <TextField
      label={label}
      value={String(value)}
      onChangeText={(t) => {
        const n = Number(t.replace(/\D/g, "") || 0);
        onChange(Math.min(n, max));
      }}
      keyboardType="number-pad"
      numericField
      suffix={suffix}
      hint={hint}
      testID={testID}
    />
  );
}

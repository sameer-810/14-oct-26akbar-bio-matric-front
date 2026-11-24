import React, { useState } from "react";
import { Copy, Check } from "lucide-react-native";
import { Button } from "./Button";
import { VStack } from "./Stack";
import { Text } from "./Text";
import { palette } from "../designSystem";
import { copyText } from "../copyText";

interface Props {
  text: string;
  /** What is copied, for screen readers: "the temporary password". */
  what: string;
  /** Shown once the text is on the clipboard. */
  successMessage?: string;
  testID?: string;
}

/** Copies the whole text in one tap and says so; on failure, says to write it down. */
export function CopyButton({ text, what, successMessage = "Copied.", testID }: Props) {
  // remembered with the text it was for, so a new text (another reset) starts over
  const [result, setResult] = useState<{ text: string; state: "copied" | "failed" } | null>(null);
  const state = result?.text === text ? result.state : "idle";
  const setState = (st: "copied" | "failed") => setResult({ text, state: st });
  const copied = state === "copied";
  const Icon = copied ? Check : Copy;
  return (
    <VStack gap={4}>
      <Button
        label={copied ? "Copied" : "Copy"}
        variant="secondary"
        size="sm"
        fullWidth={false}
        icon={<Icon size={16} color={copied ? palette.success.text : palette.text.primary} />}
        accessibilityHint={`Copies ${what}`}
        onPress={async () => setState((await copyText(text)) ? "copied" : "failed")}
        testID={testID}
      />
      {state === "copied" ? (
        <Text variant="caption" tone="success" accessibilityLiveRegion="polite">
          {successMessage}
        </Text>
      ) : state === "failed" ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          Could not copy here. Select it and copy, or write it down.
        </Text>
      ) : null}
    </VStack>
  );
}

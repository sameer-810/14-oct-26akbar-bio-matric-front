import React from "react";
import { View, StyleSheet } from "react-native";
import { VStack, HStack, Text, Button, Banner } from "@shared/ui";
import { palette, radius } from "@shared/designSystem";
import { canPrint, printHtml, escapeHtml } from "@shared/print/printHtml";

interface Props {
  academy: string;
  studentName: string;
  grNumber: string;
  biometricId: string;
  batchName: string;
  username: string;
  temporaryPassword: string | null;
}

/**
 * What the family takes home. The temporary password is on it exactly once —
 * the server keeps only a hash — so print it, or write it down, now.
 */
export function AdmissionSlip(p: Props) {
  const rows: [string, string][] = [
    ["Student", p.studentName],
    ["GR number", p.grNumber],
    ["Fingerprint ID", p.biometricId],
    ["Batch", p.batchName],
    ["Parent app username", p.username],
    ...(p.temporaryPassword ? ([["Temporary password", p.temporaryPassword]] as [string, string][]) : []),
  ];

  function print() {
    const tr = rows.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join("");
    printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>Admission slip</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;margin:32px;color:#0B1220}
  h1{font-size:20px;margin:0 0 4px} p{margin:4px 0 16px;color:#3A4657;font-size:13px}
  table{border-collapse:collapse;width:100%;max-width:520px}
  th,td{border:1px solid #BFC6D0;padding:10px;text-align:left;font-size:15px}
  th{background:#F6F8FA;width:45%;font-weight:600}
  td{font-family:Consolas,monospace;font-size:16px;letter-spacing:1px}
  .note{max-width:520px;font-size:13px;color:#3A4657;margin-top:16px;line-height:1.5}
</style></head><body>
<h1>${escapeHtml(p.academy)} — admission slip</h1>
<p>Keep this safe. It is printed once.</p>
<table>${tr}</table>
<div class="note">
  ${
    p.temporaryPassword
      ? "Install the Akbars Academy app, choose <b>Parent</b>, and sign in with the username and temporary password above. You will be asked to set your own password straight away."
      : "This child has been added to your existing parent login. Sign in as before; both children appear in the app."
  }
  You will then get a message when your child reaches class and when they leave.
</div>
</body></html>`);
  }

  return (
    <VStack gap={12} testID="admission-slip">
      {p.temporaryPassword ? (
        <Banner tone="warning" title="Print or write this down now" message="The temporary password is shown once. Nobody can look it up later." />
      ) : (
        <Banner tone="info" message="Added to the family's existing parent login — no new password." />
      )}
      <View style={styles.slip}>
        {rows.map(([k, v]) => (
          <HStack key={k} gap={12} align="center" style={styles.row}>
            <Text variant="body-sm" tone="secondary" style={{ width: 170 }}>
              {k}
            </Text>
            <Text variant="h3" selectable style={styles.mono} testID={`slip-${k.toLowerCase().replace(/\s+/g, "-")}`}>
              {v}
            </Text>
          </HStack>
        ))}
      </View>
      {canPrint ? <Button label="Print slip" variant="secondary" onPress={print} testID="slip-print" /> : null}
    </VStack>
  );
}

const styles = StyleSheet.create({
  slip: {
    borderWidth: 1,
    borderColor: palette.border.strong,
    borderStyle: "dashed",
    borderRadius: radius.md,
    padding: 16,
    backgroundColor: palette.surface.primary,
    gap: 6,
  },
  row: { minHeight: 32, flexWrap: "wrap" },
  mono: { fontFamily: "monospace" },
});

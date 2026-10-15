import React, { useState } from "react";
import { Card, VStack, HStack, Button, TextField, Banner, SectionHeader } from "@shared/ui";
import { apiErrorCode, apiErrorMessage } from "@api/apiClient";
import { useEnquiryActions } from "../hooks/useEnquiries";
import type { MessageResult } from "../types";

const MIN = 5;
const MAX = 320;

/**
 * One SMS to the chosen leads — they have no app yet. The server sends only to
 * open leads the sender can see, and says how many it skipped.
 */
export function SmsPanel({ ids, onClose, onSent }: { ids: string[]; onClose: () => void; onSent: () => void }) {
  const act = useEnquiryActions();
  const [text, setText] = useState("");
  const [result, setResult] = useState<MessageResult | null>(null);
  const [msg, setMsg] = useState<{ tone: "warning" | "danger"; text: string } | null>(null);
  const len = text.trim().length;

  async function send() {
    setMsg(null);
    setResult(null);
    try {
      setResult(await act.message.mutateAsync({ ids, message: text.trim() }));
      setText("");
      onSent();
    } catch (err) {
      // SMS not set up is the academy's configuration, not this person's mistake
      setMsg({ tone: apiErrorCode(err) === "SMS_NOT_CONFIGURED" ? "warning" : "danger", text: apiErrorMessage(err) });
    }
  }

  return (
    <Card testID="enquiries-sms-panel">
      <VStack gap={12}>
        <SectionHeader title={`SMS to ${ids.length} lead${ids.length === 1 ? "" : "s"}`} subtitle="Each lead keeps a note of what was sent." />
        {msg ? <Banner tone={msg.tone} message={msg.text} onDismiss={() => setMsg(null)} /> : null}
        {result ? (
          <Banner
            tone={result.failed ? "warning" : "success"}
            message={`Sent ${result.sent} · failed ${result.failed} · no phone ${result.noPhone} · skipped ${result.skipped}`}
            onDismiss={() => setResult(null)}
          />
        ) : null}
        <TextField
          label="Message"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={MAX}
          placeholder="Admissions for the new batch are open. Call us on…"
          hint={`${len}/${MAX} characters${len > 0 && len < MIN ? ` — at least ${MIN}` : ""}`}
          testID="enquiries-sms-text"
        />
        <HStack gap={8} wrap>
          <Button
            label="Send SMS"
            fullWidth={false}
            onPress={send}
            loading={act.message.isPending}
            disabled={len < MIN || ids.length === 0}
            testID="enquiries-sms-send"
          />
          <Button label="Close" variant="ghost" fullWidth={false} onPress={onClose} />
        </HStack>
      </VStack>
    </Card>
  );
}

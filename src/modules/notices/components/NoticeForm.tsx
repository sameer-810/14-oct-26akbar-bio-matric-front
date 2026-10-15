import React, { useState } from "react";
import { Card, VStack, HStack, Button, Banner, SectionHeader, TextField, ToggleRow } from "@shared/ui";
import { apiErrorMessage } from "@api/apiClient";
import { useNoticeActions } from "../hooks/useNotices";
import type { Notice } from "../types";
import { AudiencePicker } from "./AudiencePicker";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Post a notice, or change one in place. Sending to phones is only offered
 * when posting; a posted notice is sent from its card, which reaches only the
 * families not told yet.
 */
export function NoticeForm({ notice, onDone }: { notice?: Notice; onDone: (message?: string) => void }) {
  const act = useNoticeActions();
  const editing = Boolean(notice);
  const id = (name: string) => (editing ? `notice-edit-${name}` : `notice-${name}`);
  const [v, setV] = useState({
    title: notice?.title ?? "",
    body: notice?.body ?? "",
    batchIds: notice?.batchIds ?? [],
    pinned: notice?.pinned ?? false,
    expiresOn: notice?.expiresOn ?? "",
    notify: true,
  });
  const [error, setError] = useState<string | null>(null);
  const pending = act.create.isPending || act.update.isPending;

  async function submit() {
    setError(null);
    const expires = v.expiresOn.trim();
    if (expires && !YMD.test(expires)) {
      setError("Write the last day as YYYY-MM-DD, for example 2026-11-14, or leave it empty.");
      return;
    }
    try {
      if (notice) {
        await act.update.mutateAsync({
          id: notice.id,
          patch: { title: v.title.trim(), body: v.body.trim(), batchIds: v.batchIds, pinned: v.pinned, expiresOn: expires || null },
        });
        onDone("Saved.");
      } else {
        const n = await act.create.mutateAsync({
          title: v.title.trim(),
          body: v.body.trim() || undefined,
          batchIds: v.batchIds,
          pinned: v.pinned,
          expiresOn: expires || null,
          notify: v.notify,
        });
        onDone(n.notifiedAt ? `Posted and sent to ${n.familiesTold} famil${n.familiesTold === 1 ? "y" : "ies"}.` : "Posted.");
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card testID={editing ? "notice-edit-form" : "notice-form"}>
      <VStack gap={12}>
        <SectionHeader title={editing ? "Change the notice" : "Post a notice"} />
        {error ? <Banner tone="danger" message={error} onDismiss={() => setError(null)} /> : null}
        <TextField label="Title" value={v.title} onChangeText={(t) => setV({ ...v, title: t })} placeholder="Diwali holidays" maxLength={120} testID={id("title")} />
        <TextField
          label="Notice"
          value={v.body}
          onChangeText={(t) => setV({ ...v, body: t })}
          placeholder="The academy is closed from 1 to 5 November."
          multiline
          maxLength={2000}
          testID={id("body")}
        />
        <AudiencePicker value={{ batchIds: v.batchIds }} onChange={(a) => setV({ ...v, batchIds: a.batchIds })} />
        <ToggleRow label="Pin to the top" value={v.pinned} onChange={(p) => setV({ ...v, pinned: p })} testID={id("pinned")} />
        <TextField
          label="Last day it shows"
          value={v.expiresOn}
          onChangeText={(t) => setV({ ...v, expiresOn: t })}
          placeholder="YYYY-MM-DD (optional)"
          hint="Leave empty to keep it until it is removed."
          containerStyle={{ maxWidth: 260 }}
          testID={id("expires")}
        />
        {!editing ? (
          <ToggleRow
            label="Send to families' phones"
            hint="Each family it is for gets it as an alert in the app."
            value={v.notify}
            onChange={(n) => setV({ ...v, notify: n })}
            testID="notice-notify"
          />
        ) : null}
        <HStack gap={8}>
          <Button label={editing ? "Save" : "Post notice"} onPress={submit} loading={pending} disabled={v.title.trim().length < 2} testID={id("save")} />
          <Button label="Cancel" variant="ghost" onPress={() => onDone()} />
        </HStack>
      </VStack>
    </Card>
  );
}

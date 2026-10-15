import React, { useState } from "react";
import { Screen, VStack, ChipsRow, Skeleton, ErrorState } from "@shared/ui";
import { useSettings } from "../hooks/useAcademy";
import { RulesPanel } from "../components/RulesPanel";
import { YearsPanel } from "../components/YearsPanel";
import { StandardsPanel } from "../components/StandardsPanel";
import { SchoolsPanel } from "../components/SchoolsPanel";
import { ParentAppPanel } from "../components/ParentAppPanel";
import { FeeSettingsPanel } from "../components/FeeSettingsPanel";

const TABS = [
  { key: "rules", label: "Academy & rules" },
  { key: "parents", label: "Parent app & alerts" },
  { key: "fees", label: "Fees & GST" },
  { key: "years", label: "Academic years" },
  { key: "standards", label: "Standards" },
  { key: "schools", label: "Schools" },
];

export default function SettingsScreen() {
  const [tab, setTab] = useState("rules");
  const settings = useSettings();

  return (
    <Screen title="Settings" subtitle="The owner's controls. Every change is in the audit trail." testID="settings-screen">
      <VStack gap={16}>
        <ChipsRow chips={TABS} active={tab} onChange={setTab} />
        {tab === "rules" ? (
          settings.isLoading ? (
            <Skeleton height={300} />
          ) : settings.data ? (
            <RulesPanel settings={settings.data} />
          ) : (
            <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />
          )
        ) : null}
        {tab === "parents" && settings.data ? <ParentAppPanel settings={settings.data} /> : null}
        {tab === "fees" && settings.data ? <FeeSettingsPanel settings={settings.data} /> : null}
        {tab === "years" ? <YearsPanel /> : null}
        {tab === "standards" ? <StandardsPanel /> : null}
        {tab === "schools" ? <SchoolsPanel /> : null}
      </VStack>
    </Screen>
  );
}

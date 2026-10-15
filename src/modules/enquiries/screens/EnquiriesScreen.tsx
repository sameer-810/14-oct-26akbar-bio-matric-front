import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { PhoneCall } from "lucide-react-native";

import { Screen, VStack, HStack, Text, Button, Select, SearchInput, ChipsRow, Skeleton, ErrorState, EmptyState } from "@shared/ui";
import { useEnquiryList } from "../hooks/useEnquiries";
import { LeadCard } from "../components/LeadCard";
import { SmsPanel } from "../components/SmsPanel";
import { TabChips } from "../components/TabChips";
import { FollowUpBoard } from "../components/FollowUpBoard";
import { SOURCE_OPTIONS, STAGE_LABELS, type EnquiryFilter, type EnquirySource, type EnquiryStage } from "../types";

type Nav = { navigate: (name: string, params?: object) => void };

const STAGE_CHIPS = [
  { key: "open", label: "Open" },
  ...(["hot", "warm", "cold", "interested", "in_process", "joined", "not_joined"] as EnquiryStage[]).map((s) => ({ key: s, label: STAGE_LABELS[s] })),
  { key: "all", label: "All" },
];

/**
 * Leads and their follow-ups — the old system's Enquiry and Task screens in
 * one place. Who sees which leads (own or all) is the server's decision.
 */
export default function EnquiriesScreen() {
  const nav = useNavigation<Nav>();
  const [tab, setTab] = useState<"leads" | "board">("leads");
  const openLead = (id: string) => nav.navigate("EnquiryDetail", { id });

  return (
    <Screen
      title="Enquiries"
      subtitle={tab === "leads" ? "Who to call next comes first." : "This week's calls, and what is overdue."}
      right={<Button label="New enquiry" fullWidth={false} onPress={() => nav.navigate("EnquiryNew")} testID="enquiry-new" />}
      testID="enquiries-screen"
    >
      <VStack gap={12}>
        <TabChips
          tabs={[
            { key: "leads", label: "Leads", testID: "enquiries-tab-leads" },
            { key: "board", label: "Follow-ups this week", testID: "enquiries-tab-board" },
          ]}
          active={tab}
          onChange={(k) => setTab(k as "leads" | "board")}
        />
        {tab === "leads" ? <LeadsTab onOpenLead={openLead} /> : <FollowUpBoard onOpenLead={openLead} />}
      </VStack>
    </Screen>
  );
}

function LeadsTab({ onOpenLead }: { onOpenLead: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("open");
  const [source, setSource] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [sms, setSms] = useState(false);
  // "overdue" is measured from when the list opened, not re-read on every render
  const [now] = useState(() => Date.now());

  // ask the server once typing pauses, not on every key
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filter: EnquiryFilter = {
    search: query || undefined,
    source: (source || undefined) as EnquirySource | undefined,
    ...(stage === "open" ? { open: true } : stage === "all" ? {} : { stage: stage as EnquiryStage }),
  };
  const list = useEnquiryList(filter);
  const leads = list.data ?? [];

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const stopSelecting = () => {
    setSelecting(false);
    setSelected([]);
    setSms(false);
  };

  return (
    <VStack gap={12}>
      <HStack gap={12} wrap align="center">
        <SearchInput value={search} onChangeText={setSearch} placeholder="Name, phone or number" style={{ flex: 2, minWidth: 220 }} testID="enquiries-search" />
        <View style={{ flex: 1, minWidth: 180 }} testID="enquiries-source">
          <Select value={source || null} options={[{ value: "", label: "All sources" }, ...SOURCE_OPTIONS]} onChange={setSource} placeholder="All sources" />
        </View>
      </HStack>
      <ChipsRow chips={STAGE_CHIPS} active={stage} onChange={setStage} />

      <HStack gap={8} wrap align="center">
        <Button
          label={selecting ? "Stop selecting" : "Select"}
          size="sm"
          variant={selecting ? "ghost" : "secondary"}
          fullWidth={false}
          onPress={() => (selecting ? stopSelecting() : setSelecting(true))}
          testID="enquiries-select-mode"
        />
        {selecting ? (
          <>
            <Button
              label={selected.length === leads.length && leads.length > 0 ? "Clear all" : "Select all shown"}
              size="sm"
              variant="ghost"
              fullWidth={false}
              onPress={() => setSelected(selected.length === leads.length ? [] : leads.map((l) => l.id))}
            />
            <Button label={`Send SMS (${selected.length})`} size="sm" fullWidth={false} disabled={selected.length === 0} onPress={() => setSms(true)} testID="enquiries-sms" />
          </>
        ) : null}
        {list.data ? (
          <Text variant="caption" tone="tertiary" style={{ marginLeft: "auto" }}>
            {leads.length === 500 ? "First 500 shown — search to narrow" : `${leads.length} lead${leads.length === 1 ? "" : "s"}`}
          </Text>
        ) : null}
      </HStack>

      {sms && selecting ? <SmsPanel ids={selected} onClose={() => setSms(false)} onSent={() => setSelected([])} /> : null}

      {list.isLoading ? <Skeleton height={140} /> : null}
      {list.error ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
      {list.data && leads.length === 0 ? (
        <EmptyState icon={PhoneCall} title={query ? "No lead matches" : "No leads here"} message={stage === "open" ? "Every lead still being worked shows here." : undefined} />
      ) : null}
      {leads.map((l) => (
        <LeadCard
          key={l.id}
          lead={l}
          now={now}
          onOpen={() => onOpenLead(l.id)}
          selecting={selecting}
          selected={selected.includes(l.id)}
          onToggle={() => toggle(l.id)}
        />
      ))}
    </VStack>
  );
}

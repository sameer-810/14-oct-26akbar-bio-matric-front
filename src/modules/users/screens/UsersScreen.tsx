import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { UserCog } from "lucide-react-native";

import {
  Screen,
  VStack,
  HStack,
  Text,
  Button,
  DataTable,
  SearchInput,
  ChipsRow,
  StatusChip,
  ErrorState,
  Pagination,
  type Column,
} from "@shared/ui";
import { formatRelative } from "@shared/format";
import { useUsers } from "../hooks/useUsers";
import type { StaffUser } from "../types";
import type { UsersParamList } from "../UsersNavigator";

export default function UsersScreen() {
  const nav = useNavigation<NativeStackNavigationProp<UsersParamList>>();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"active" | "inactive" | "all">("active");
  const [page, setPage] = useState(1);
  const users = useUsers({
    search: search.trim() || undefined,
    active: filter === "all" ? undefined : filter === "active",
    page,
  });

  const columns: Column<StaffUser>[] = [
    {
      key: "name",
      header: "Name",
      flex: 2,
      render: (u) => (
        <VStack gap={1}>
          <Text variant="label">{u.name}</Text>
          <Text variant="caption" tone="tertiary">
            {u.username}
          </Text>
        </VStack>
      ),
    },
    { key: "role", header: "Role", flex: 1, render: (u) => <Text variant="body-sm">{u.roleLabel}</Text> },
    {
      key: "status",
      header: "Status",
      flex: 1,
      render: (u) => <StatusChip status={u.isActive ? (u.mustChangePassword ? "pending" : "active") : "inactive"} size="sm" />,
    },
    { key: "last", header: "Last sign-in", flex: 1, render: (u) => <Text variant="body-sm">{formatRelative(u.lastLoginAt)}</Text> },
  ];

  return (
    <Screen
      title="Staff logins"
      subtitle="Everyone gets their own login, so the audit trail says who did what."
      right={<Button label="New login" onPress={() => nav.navigate("CreateUser")} testID="users-new" />}
      testID="users-screen"
    >
      <VStack gap={12}>
        <HStack gap={12} align="center" wrap>
          <SearchInput
            value={search}
            onChangeText={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search name, username or phone"
            style={{ flex: 1, minWidth: 220 }}
          />
          <ChipsRow
            chips={[
              { key: "active", label: "Active" },
              { key: "inactive", label: "Deactivated" },
              { key: "all", label: "All" },
            ]}
            active={filter}
            onChange={(k) => {
              setFilter(k as typeof filter);
              setPage(1);
            }}
          />
        </HStack>
        {users.error ? <ErrorState error={users.error} onRetry={() => void users.refetch()} /> : null}
        <DataTable
          columns={columns}
          rows={users.data?.data ?? []}
          keyExtractor={(u) => u.id}
          onRowPress={(u) => nav.navigate("UserDetail", { id: u.id })}
          emptyIcon={UserCog}
          emptyTitle={users.isLoading ? "Loading…" : "No logins match"}
          testID="users-table"
        />
        {users.data && users.data.meta.pages > 1 ? (
          <Pagination
            page={page}
            totalPages={users.data.meta.pages}
            total={users.data.meta.total}
            limit={50}
            onPageChange={setPage}
          />
        ) : null}
      </VStack>
    </Screen>
  );
}

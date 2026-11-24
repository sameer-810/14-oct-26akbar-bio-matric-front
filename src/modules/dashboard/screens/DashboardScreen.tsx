import React from "react";
import { View, StyleSheet } from "react-native";

import { Screen, VStack, Text, StatTile, Banner, Card, useBreakpoint } from "@shared/ui";
import { useAuthStore } from "@shared/store/useAuthStore";
import { DashboardTabs } from "../components/DashboardTabs";
import { useDashboardTiles, type TileSpec } from "../hooks/useDashboardTiles";
import { sortEmptyLast, inRows } from "../tileOrder";

const COLUMNS = 4;

/**
 * Built from what the signed-in person may see: a card appears only when the
 * permission behind it is held, so a teacher's dashboard and the owner's are
 * different screens. Cards with a figure come first; those showing nothing
 * (0, ₹0) follow, still visible, and move up the moment a figure appears.
 */
export default function DashboardScreen() {
  const { isWide } = useBreakpoint();
  const name = useAuthStore((s) => s.staff?.name ?? "");
  const roleLabel = useAuthStore((s) => s.staff?.roleLabel ?? "");
  const { tiles, machineOffline, moneyError, hasAny } = useDashboardTiles();
  const ordered = sortEmptyLast(tiles);

  return (
    <Screen title={`Hello, ${name.split(" ")[0] || "there"}`} subtitle={roleLabel} testID="dashboard-screen">
      <VStack gap={16}>
        <DashboardTabs active="Dashboard" />
        {machineOffline ? (
          <Banner
            tone="danger"
            title="A fingerprint machine is offline"
            message="Punches are stored on the machine and arrive when it reconnects. Check its power and internet."
          />
        ) : null}
        {isWide ? (
          <View style={styles.grid}>
            {inRows(ordered, COLUMNS).map((row, i) => (
              <View key={i} style={styles.row}>
                {row.map((t, j) => (t ? <Tile key={t.key} tile={t} /> : <View key={`gap-${j}`} style={styles.spacer} />))}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.grid}>
            {ordered.map((t) => (
              <Tile key={t.key} tile={t} />
            ))}
          </View>
        )}
        {moneyError ? (
          <Text variant="caption" tone="danger">
            The money figures could not be loaded. They will try again shortly.
          </Text>
        ) : null}
        {!hasAny ? (
          <Card>
            <Text tone="secondary">Your attendance registers and lectures will appear here.</Text>
          </Card>
        ) : null}
      </VStack>
    </Screen>
  );
}

function Tile({ tile }: { tile: TileSpec }) {
  return (
    <StatTile
      label={tile.label}
      value={tile.value}
      sublabel={tile.sublabel}
      icon={tile.icon}
      attention={tile.attention}
      onPress={tile.onPress}
      testID={tile.testID}
    />
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  row: { flexDirection: "row", gap: 12 },
  // an empty slot in the last row, so its cards are as wide as the others
  spacer: { flex: 1, minWidth: 150 },
});

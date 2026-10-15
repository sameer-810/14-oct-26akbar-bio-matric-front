import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { IndianRupee, Receipt, Scale, FileClock } from "lucide-react-native";

import { StatTile, Text } from "@shared/ui";
import { PERMISSIONS } from "@shared/permissions";
import { useAuthStore } from "@shared/store/useAuthStore";
import { academyToday, formatPaise } from "@shared/format";
import { useMoneySummary } from "../hooks/useExpenses";

/** Money figures move as the desk works, so the dashboard looks again every minute. */
const POLL = 60_000;

/**
 * Money in against money out for the dashboard: today's collection and
 * spending, the month so far, and cheques not yet cleared. A tile opens Fees
 * or Expenses only for someone allowed to open them.
 */
export function MoneyTiles({ wide }: { wide: boolean }) {
  const nav = useNavigation<{ navigate: (name: string) => void }>();
  const canFees = useAuthStore((s) => s.hasPermission(PERMISSIONS.FEES_VIEW) || s.hasPermission(PERMISSIONS.FEES_COLLECT) || s.hasPermission(PERMISSIONS.FEES_MANAGE));
  const canExpenses = useAuthStore((s) => s.hasPermission(PERMISSIONS.EXPENSES_MANAGE));
  const [today] = useState(() => academyToday());

  const day = useMoneySummary({ from: today, to: today }, { refetchInterval: POLL });
  const month = useMoneySummary({ from: `${today.slice(0, 7)}-01`, to: today }, { refetchInterval: POLL });

  const openFees = canFees ? () => nav.navigate("Fees") : undefined;
  const openExpenses = canExpenses ? () => nav.navigate("Expenses") : undefined;
  const d = day.data;
  const m = month.data;
  const cheques = m?.openCheques;

  return (
    <View style={styles.wrap}>
      <View style={[styles.tiles, wide && styles.tilesWide]}>
        <StatTile
          label="Collected today"
          value={formatPaise(d?.collected)}
          sublabel={d ? `${d.receipts} receipt${d.receipts === 1 ? "" : "s"}${d.refunded ? ` · ${formatPaise(d.refunded)} refunded` : ""}` : undefined}
          icon={IndianRupee}
          onPress={openFees}
          testID="money-collected-today"
        />
        <StatTile label="Spent today" value={formatPaise(d?.spent)} icon={Receipt} onPress={openExpenses} testID="money-spent-today" />
        <StatTile
          label="This month: net"
          value={formatPaise(m?.net)}
          sublabel={m ? `In ${formatPaise(m.collected)} · out ${formatPaise(m.spent)}` : undefined}
          icon={Scale}
          attention={m ? m.net < 0 : false}
          onPress={openFees ?? openExpenses}
          testID="money-month-net"
        />
        <StatTile
          label="Cheques to clear"
          value={cheques ? cheques.count : "—"}
          sublabel={cheques ? `${formatPaise(cheques.amount)} received this month` : undefined}
          icon={FileClock}
          attention={(cheques?.count ?? 0) > 0}
          onPress={openFees}
          testID="money-cheques"
        />
      </View>
      {day.error || month.error ? (
        <Text variant="caption" tone="danger">
          The money figures could not be loaded. They will try again shortly.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  tiles: { gap: 12 },
  tilesWide: { flexDirection: "row", flexWrap: "wrap" },
});

import React from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Award, UserRound } from "lucide-react-native";

import { Screen, ListGroup, ListRow, useBreakpoint } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { useParentSettings } from "../hooks/useParent";

/**
 * Everything not in the tab bar: test results (when the owner allows them)
 * and the parent's own account. Fees and the notice board have tabs of their
 * own, so they are not here.
 */
export default function ParentMoreScreen() {
  const { isWide } = useBreakpoint();
  const nav = useNavigation<{ navigate: (name: string) => void }>();
  const sections = useParentSettings().data?.sections;
  // a section the owner closed must not flash up while the settings load
  const on = (k: keyof NonNullable<typeof sections>) => Boolean(sections) && sections?.[k] !== false;
  const icon = (I: typeof Award) => <I size={20} color={palette.text.secondary} />;

  return (
    <Screen title="More" testID="parent-more">
      <View style={[styles.wrap, isWide && styles.wrapWide]}>
        <ListGroup>
          {on("results") ? <ListRow title="Test results" subtitle="Marks, rank and class average" leading={icon(Award)} onPress={() => nav.navigate("ParentResults")} showChevron /> : null}
          <ListRow title="Account" subtitle="Alerts, password and signed-in phones" leading={icon(UserRound)} onPress={() => nav.navigate("ParentAccount")} showChevron />
        </ListGroup>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignSelf: "center" },
  wrapWide: { maxWidth: 640 },
});

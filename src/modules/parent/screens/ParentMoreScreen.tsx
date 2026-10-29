import React from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Award, Megaphone, FileText, CalendarPlus, MessageCircleQuestion, IndianRupee, BookOpen, IdCard } from "lucide-react-native";

import { Screen, ListGroup, ListRow, useBreakpoint } from "@shared/ui";
import { palette } from "@shared/designSystem";
import { useParentSettings } from "../hooks/useParent";

/**
 * Everything beyond today and the calendar, as the owner allows: the old
 * "Student login" sections (performance, documents, leave, feedback form).
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
          {on("lectures") ? (
            <ListRow title="Lectures" subtitle="The week's timetable, present or absent in each" leading={icon(BookOpen)} onPress={() => nav.navigate("ParentLectures")} showChevron />
          ) : null}
          <ListRow title="Profile" subtitle="Your child's details as the academy has them" leading={icon(IdCard)} onPress={() => nav.navigate("ParentProfile")} showChevron />
          {on("fees") ? <ListRow title="Fees" subtitle="What is due, and every receipt" leading={icon(IndianRupee)} onPress={() => nav.navigate("ParentFees")} showChevron /> : null}
          {on("results") ? <ListRow title="Test results" subtitle="Marks, rank and class average" leading={icon(Award)} onPress={() => nav.navigate("ParentResults")} showChevron /> : null}
          <ListRow title="Notice board" subtitle="Holidays, meetings, functions" leading={icon(Megaphone)} onPress={() => nav.navigate("ParentNotices")} showChevron />
          {on("documents") ? <ListRow title="Documents" subtitle="Worksheets and notes from the academy" leading={icon(FileText)} onPress={() => nav.navigate("ParentDocuments")} showChevron /> : null}
          {on("leaveApplication") ? <ListRow title="Leave" subtitle="Apply for leave" leading={icon(CalendarPlus)} onPress={() => nav.navigate("ParentLeave")} showChevron /> : null}
          {on("issues") ? (
            <ListRow title="Questions and issues" subtitle="Write to the academy, see their reply" leading={icon(MessageCircleQuestion)} onPress={() => nav.navigate("ParentIssues")} showChevron />
          ) : null}
        </ListGroup>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignSelf: "center" },
  wrapWide: { maxWidth: 640 },
});

import React from "react";
import { ScrollView } from "react-native";
import { Table } from "lucide-react-native";

import { DataTable, Text, VStack, useBreakpoint, type Column } from "@shared/ui";
import { breakpoints } from "@shared/designSystem";
import { cellText } from "../export";
import type { Report, ReportRow } from "../types";

/** On screen a long report shows its first rows; Excel and print always carry all of them. */
const SHOWN = 500;
const MANY_COLUMNS = 7;

type Line = { i: number; row: ReportRow };

/**
 * Any report as a table, columns as the server sent them. With many columns
 * (a term of tests) each gets a fixed width and the table scrolls sideways
 * instead of squeezing every column to nothing.
 */
export function ReportTable({ report, testID }: { report: Report; testID?: string }) {
  const { width } = useBreakpoint();
  const many = report.columns.length > MANY_COLUMNS;
  const narrow = width < breakpoints.md;
  const shown: Line[] = report.rows.slice(0, SHOWN).map((row, i) => ({ i, row }));

  const columns: Column<Line>[] = report.columns.map((c) => ({
    key: c.key,
    header: c.label,
    align: c.numeric ? "right" : "left",
    ...(many ? { width: c.numeric ? 110 : 170 } : { flex: c.numeric ? 1 : c.key === "name" || c.key === "topics" ? 2 : 1 }),
    render: (l: Line) => (
      <Text variant="body-sm" tabular={c.numeric}>
        {cellText(l.row[c.key]) || (c.numeric ? "—" : "")}
      </Text>
    ),
  }));

  const table = (
    <DataTable columns={columns} rows={shown} keyExtractor={(l) => String(l.i)} emptyIcon={Table} emptyTitle="Nothing in this report" />
  );

  return (
    <VStack gap={8} testID={testID}>
      {/* DataTable already scrolls sideways on a phone; on a wide screen only a many-column report needs to */}
      {many && !narrow ? (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          {table}
        </ScrollView>
      ) : (
        table
      )}
      {report.rows.length > SHOWN ? (
        <Text variant="caption" tone="tertiary">
          Showing the first {SHOWN} of {report.rows.length} rows. Excel and print include them all.
        </Text>
      ) : null}
    </VStack>
  );
}

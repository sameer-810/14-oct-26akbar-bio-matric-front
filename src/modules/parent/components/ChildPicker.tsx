import React from "react";
import { ChipsRow } from "@shared/ui";
import { useSelectedChild } from "../hooks/useParent";

/** Siblings share one sign-in; a family with one child never sees this. */
export function ChildPicker() {
  const { child, children, select } = useSelectedChild();
  if (children.length < 2 || !child) return null;
  return <ChipsRow chips={children.map((c) => ({ key: c.id, label: c.firstName }))} active={child.id} onChange={select} />;
}

import test from "node:test";
import assert from "node:assert/strict";
import { isEmptyFigure, sortEmptyLast, inRows } from "../src/modules/dashboard/tileOrder";

const t = (key: string, empty: boolean) => ({ key, empty });

test("cards with figures come first, empty ones last, each group in its own order", () => {
  const sorted = sortEmptyLast([t("a", true), t("b", false), t("c", true), t("d", false), t("e", false)]);
  assert.deepEqual(
    sorted.map((x) => x.key),
    ["b", "d", "e", "a", "c"],
  );
});

test("nothing is dropped, and sorting again gives the same order", () => {
  const input = [t("a", true), t("b", false), t("c", true)];
  const once = sortEmptyLast(input);
  assert.equal(once.length, input.length);
  assert.deepEqual(sortEmptyLast(once), once);
  // the input is not changed
  assert.deepEqual(input.map((x) => x.key), ["a", "b", "c"]);
});

test("a card moves up the moment its figure becomes non-zero", () => {
  const before = sortEmptyLast([t("late", false), t("absent", true), t("left", true)]);
  assert.deepEqual(before.map((x) => x.key), ["late", "absent", "left"]);
  const after = sortEmptyLast([t("late", false), t("absent", false), t("left", true)]);
  assert.deepEqual(after.map((x) => x.key), ["late", "absent", "left"]);
  const swapped = sortEmptyLast([t("late", true), t("absent", false), t("left", true)]);
  assert.deepEqual(swapped.map((x) => x.key), ["absent", "late", "left"]);
});

test("only a loaded zero is empty: a figure still loading keeps its place", () => {
  assert.equal(isEmptyFigure(0), true);
  assert.equal(isEmptyFigure(0, false), false);
  assert.equal(isEmptyFigure(12), false);
  assert.equal(isEmptyFigure(undefined), false);
  assert.equal(isEmptyFigure(null), false);
});

test("rows are padded so the last card keeps the same width", () => {
  assert.deepEqual(inRows([1, 2, 3, 4, 5], 4), [
    [1, 2, 3, 4],
    [5, null, null, null],
  ]);
  assert.deepEqual(inRows([], 4), []);
  assert.deepEqual(inRows([1, 2], 1), [[1], [2]]);
});

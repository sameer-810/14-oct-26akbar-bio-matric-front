/**
 * The dashboard shows its cards with figures first and the empty ones (0,
 * ₹0, 0/633) last. Pure, so the rule is tested without a screen.
 */

/** A card is empty when its figure is nothing. Never while it is still loading: it keeps its place. */
export function isEmptyFigure(figure: number | null | undefined, loaded = true): boolean {
  return loaded && figure === 0;
}

/**
 * Cards with something to show first, empty ones after, each group in the
 * order given: nothing is hidden or removed, and the order is the same on
 * every refresh until a figure changes.
 */
export function sortEmptyLast<T extends { empty: boolean }>(tiles: T[]): T[] {
  return [...tiles.filter((t) => !t.empty), ...tiles.filter((t) => t.empty)];
}

/** Rows of `columns` cards each, for a grid whose last row keeps the same card width. */
export function inRows<T>(items: T[], columns: number): (T | null)[][] {
  const rows: (T | null)[][] = [];
  for (let i = 0; i < items.length; i += columns) {
    const row: (T | null)[] = items.slice(i, i + columns);
    while (row.length < columns) row.push(null);
    rows.push(row);
  }
  return rows;
}

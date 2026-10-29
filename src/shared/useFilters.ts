import { useCallback, useState } from "react";

// ponytail: kept in memory for the session only; move to storage if staff ask for filters to survive a reload
const remembered = new Map<string, unknown>();

/**
 * A screen's filters, remembered while staff move between screens, so going
 * to a student and back does not lose "Std. 10, missing finger".
 */
export function useFilters<T extends object>(key: string, defaults: T) {
  const [initial] = useState(defaults);
  const [filters, setState] = useState<T>(() => ({ ...initial, ...(remembered.get(key) as Partial<T> | undefined) }));
  const set = useCallback(
    (patch: Partial<T>) =>
      setState((prev) => {
        const next = { ...prev, ...patch };
        remembered.set(key, next);
        return next;
      }),
    [key],
  );
  const reset = useCallback(() => {
    remembered.delete(key);
    setState(initial);
  }, [key, initial]);
  const isFiltered = (Object.keys(initial) as (keyof T)[]).some((k) => k !== "page" && filters[k] !== initial[k]);
  return { filters, set, reset, isFiltered };
}

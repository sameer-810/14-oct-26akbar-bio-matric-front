import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../api/reportsApi";
import type { ReportRun } from "../types";

/** A report runs only when asked ("Run"), never as the filters are being typed. */
export function useReport(run: ReportRun | null) {
  return useQuery({
    queryKey: ["reports", run?.key ?? "", run?.params ?? {}],
    queryFn: () => reportsApi.run(run!.key, run!.params),
    enabled: run !== null,
    // a bad range is the user's to fix, not something to retry
    retry: false,
  });
}

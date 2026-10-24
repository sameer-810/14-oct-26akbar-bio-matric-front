import { useQuery, useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { academyApi } from "../api/academyApi";
import type { InstituteSettings, AcademicYear, Standard, Batch, Holiday } from "../types";

// masters change rarely; every screen reads them, so cache them for a while
const MASTER = { staleTime: 5 * 60_000 };

export const useSettings = () => useQuery({ queryKey: ["settings"], queryFn: academyApi.settings, ...MASTER });
export const useYears = () => useQuery({ queryKey: ["academicYears"], queryFn: academyApi.years, ...MASTER });
export const useStandards = () => useQuery({ queryKey: ["standards"], queryFn: academyApi.standards, ...MASTER });
export const useSchools = () => useQuery({ queryKey: ["schools"], queryFn: academyApi.schools, ...MASTER });
export const useBatches = (params: { academicYearId?: string; standardId?: string } = {}, { enabled = true } = {}) =>
  useQuery({ queryKey: ["batches", params], queryFn: () => academyApi.batches(params), enabled });
export const useHolidays = (params: { from?: string; to?: string } = {}) =>
  useQuery({ queryKey: ["holidays", params], queryFn: () => academyApi.holidays(params) });

/** The current academic year, if one is set. */
export function useCurrentYear(): AcademicYear | undefined {
  return useYears().data?.find((y) => y.isCurrent);
}

function useSave<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>, invalidate: QueryKey[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidate.forEach((key) => void qc.invalidateQueries({ queryKey: key })),
  });
}

export const useUpdateSettings = () => useSave((p: Partial<InstituteSettings>) => academyApi.updateSettings(p), [["settings"]]);
export const useCreateYear = () =>
  useSave((y: Omit<AcademicYear, "id" | "isCurrent">) => academyApi.createYear(y), [["academicYears"]]);
export const useMakeYearCurrent = () => useSave((id: string) => academyApi.makeYearCurrent(id), [["academicYears"]]);
export const useCreateStandard = () => useSave((s: Partial<Standard>) => academyApi.createStandard(s), [["standards"]]);
export const useUpdateStandard = () =>
  useSave(({ id, ...s }: Partial<Standard> & { id: string }) => academyApi.updateStandard(id, s), [["standards"]]);
export const useCreateSchool = () => useSave((name: string) => academyApi.createSchool(name), [["schools"]]);
export const useCreateBatch = () => useSave((b: Partial<Batch>) => academyApi.createBatch(b), [["batches"]]);
export const useUpdateBatch = () =>
  useSave(({ id, ...b }: Partial<Batch> & { id: string }) => academyApi.updateBatch(id, b), [["batches"]]);
export const useRemoveBatch = () => useSave((id: string) => academyApi.removeBatch(id), [["batches"]]);
export const useCreateHoliday = () => useSave((h: Omit<Holiday, "id">) => academyApi.createHoliday(h), [["holidays"]]);
export const useRemoveHoliday = () => useSave((id: string) => academyApi.removeHoliday(id), [["holidays"]]);

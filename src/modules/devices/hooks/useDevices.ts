import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { devicesApi } from "../api/devicesApi";
import type { Device, StaffCommandKind } from "../types";

// a machine's state changes on its own (punches, polls); keep the screens near live
const LIVE = { refetchInterval: 15_000 };

export function useDevices({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: ["devices"], queryFn: devicesApi.list, enabled, ...LIVE });
}

export function useDevice(id: string) {
  return useQuery({ queryKey: ["device", id], queryFn: () => devicesApi.get(id), ...LIVE });
}

export function useDeviceCommands(id: string) {
  return useQuery({ queryKey: ["deviceCommands", id], queryFn: () => devicesApi.commands(id), ...LIVE });
}

export function useDeviceTraffic(id: string, enabled: boolean) {
  return useQuery({ queryKey: ["deviceTraffic", id], queryFn: () => devicesApi.traffic(id), enabled, ...LIVE });
}

function useInvalidateDevice(id: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["devices"] });
    void qc.invalidateQueries({ queryKey: ["device", id] });
    void qc.invalidateQueries({ queryKey: ["deviceCommands", id] });
  };
}

export function useUpdateDevice(id: string) {
  const invalidate = useInvalidateDevice(id);
  return useMutation({
    mutationFn: (patch: Partial<Pick<Device, "name" | "location" | "dialect">>) => devicesApi.update(id, patch),
    onSuccess: invalidate,
  });
}

export function useApproveDevice(id: string) {
  const invalidate = useInvalidateDevice(id);
  return useMutation({ mutationFn: () => devicesApi.approve(id), onSuccess: invalidate });
}

export function useBlockDevice(id: string) {
  const invalidate = useInvalidateDevice(id);
  return useMutation({ mutationFn: () => devicesApi.block(id), onSuccess: invalidate });
}

export function useRemoveDevice(id: string) {
  const invalidate = useInvalidateDevice(id);
  return useMutation({ mutationFn: () => devicesApi.remove(id), onSuccess: invalidate });
}

export function useQueueCommand(id: string) {
  const invalidate = useInvalidateDevice(id);
  return useMutation({
    mutationFn: ({ kind, confirm }: { kind: StaffCommandKind; confirm?: string }) =>
      devicesApi.queueCommand(id, kind, confirm),
    onSuccess: invalidate,
  });
}

export function useRetryCommand(id: string) {
  const invalidate = useInvalidateDevice(id);
  return useMutation({ mutationFn: (commandId: number) => devicesApi.retryCommand(commandId), onSuccess: invalidate });
}

export function useCancelCommand(id: string) {
  const invalidate = useInvalidateDevice(id);
  return useMutation({ mutationFn: (commandId: number) => devicesApi.cancelCommand(commandId), onSuccess: invalidate });
}

export function useLoadEveryone(id: string) {
  const invalidate = useInvalidateDevice(id);
  return useMutation({ mutationFn: (withFingerprints: boolean) => devicesApi.loadEveryone(id, withFingerprints), onSuccess: invalidate });
}

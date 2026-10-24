import { apiClient } from "@api/apiClient";
import type { Device, DeviceCommand, StaffCommandKind, TrafficRow } from "../types";

export const devicesApi = Object.freeze({
  async list(): Promise<Device[]> {
    return (await apiClient.get("/devices")).data.data;
  },
  async get(id: string): Promise<Device> {
    return (await apiClient.get(`/devices/${id}`)).data.data;
  },
  async update(id: string, patch: Partial<Pick<Device, "name" | "location" | "dialect">>): Promise<Device> {
    return (await apiClient.patch(`/devices/${id}`, patch)).data.data;
  },
  async approve(id: string): Promise<Device> {
    return (await apiClient.post(`/devices/${id}/approve`)).data.data;
  },
  async block(id: string): Promise<Device> {
    return (await apiClient.post(`/devices/${id}/block`)).data.data;
  },
  /** Only a blocked or never-approved machine; its punches stay. */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/devices/${id}`);
  },
  async commands(id: string): Promise<DeviceCommand[]> {
    return (await apiClient.get(`/devices/${id}/commands`, { params: { limit: 50 } })).data.data;
  },
  async queueCommand(id: string, kind: StaffCommandKind, confirm?: string): Promise<DeviceCommand> {
    return (await apiClient.post(`/devices/${id}/commands`, { kind, confirm })).data.data;
  },
  async retryCommand(commandId: number): Promise<DeviceCommand> {
    return (await apiClient.post(`/devices/commands/${commandId}/retry`)).data.data;
  },
  async cancelCommand(commandId: number): Promise<DeviceCommand> {
    return (await apiClient.post(`/devices/commands/${commandId}/cancel`)).data.data;
  },
  async loadEveryone(id: string, withFingerprints: boolean): Promise<{ people: number; fingerprints: number }> {
    return (await apiClient.post(`/devices/${id}/load-everyone`, { withFingerprints })).data.data;
  },
  async traffic(id: string, limit = 100): Promise<TrafficRow[]> {
    return (await apiClient.get(`/devices/${id}/traffic`, { params: { limit } })).data.data;
  },
});

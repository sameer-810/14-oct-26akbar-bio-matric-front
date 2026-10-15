import type { StaffAccount } from "@shared/store/useAuthStore";
import type { Role } from "@shared/permissions";

export type StaffUser = StaffAccount;

export interface RoleCatalogue {
  roles: { role: Role; label: string; defaultPermissions: string[] }[];
  assignablePermissions: string[];
}

export interface CreateUserInput {
  username: string;
  name: string;
  phone?: string;
  email?: string;
  role: Role;
  /** the faculty member this login belongs to */
  teacherId?: string;
}

export interface UpdateUserInput {
  name?: string;
  phone?: string;
  email?: string;
  role?: Role;
  permissions?: string[];
  isActive?: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; pages: number };
}

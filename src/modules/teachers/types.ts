export interface Teacher {
  id: string;
  title: string;
  name: string;
  displayName: string;
  gender: string;
  phone: string;
  email: string;
  dateOfBirth: string | null;
  address: string;
  subjects: string[];
  batchIds: string[];
  biometricId: string;
  joinedOn: string | null;
  isActive: boolean;
  userId: string | null;
  fingerprintEnrolled?: boolean;
}

/** Days at the academy (every IN with its OUT) and every punch, from the machines. */
export type { PunchDays as TeacherDays } from "@shared/ui";

export interface TeacherInput {
  title?: string;
  name: string;
  phone?: string;
  subjects?: string[];
  batchIds?: string[];
  biometricId?: string;
  isActive?: boolean;
}

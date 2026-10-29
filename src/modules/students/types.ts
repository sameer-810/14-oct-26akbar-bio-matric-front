export type StudentStatus = "active" | "expired" | "left";

export interface Guardian {
  relation: "father" | "mother" | "guardian";
  name?: string;
  phone?: string;
  email?: string;
  occupation?: string;
}

export interface StudentListItem {
  id: string;
  grNumber: string;
  biometricId: string;
  name: string;
  firstName: string;
  lastName: string;
  /** null: brought over without a batch, still to be placed */
  batchId: string | null;
  /** batches attended besides the home batch, now (an extra maths group) */
  extraBatchIds: string[];
  standardId: string;
  status: StudentStatus;
  validTill: string;
  phone: string;
  fingerprintEnrolled: boolean;
  /** "" when there is no photo; the Avatar then shows initials */
  photoUrl: string;
}

export interface Student extends StudentListItem {
  rollNumber: string;
  middleName: string;
  gender: string;
  dateOfBirth: string | null;
  studentPhone: string;
  email: string;
  schoolName: string;
  address: { line1?: string; landmark?: string; city?: string; state?: string; pincode?: string };
  guardians: Guardian[];
  notes: string;
  academicYearId: string;
  batchHistory: { batchId: string; from: string }[];
  /** `to` is the last day, inclusive; null while the student is still in it */
  extraBatches: { batchId: string; from: string; to: string | null }[];
  admissionDate: string;
  leftOn: string | null;
  leftReason: string;
  parentAccountId: string | null;
  messaging: { sms: boolean; push: boolean };
  parentLogin: { username: string; lastLoginAt: string | null; children: number } | null;
  enrolment: {
    fingerprints: { fingerIndex: number; capturedAt: string }[];
    devices: { deviceId: string; commandId: number; status: string; error: string | null }[];
  };
}

export interface AdmitInput {
  firstName: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string | null;
  phone?: string;
  schoolName?: string;
  address?: Student["address"];
  guardians: Guardian[];
  standardId: string;
  batchId: string;
  grNumber?: string;
  parent?: { mode: "new" } | { mode: "existing"; parentAccountId: string };
}

export interface AdmitResult {
  student: Student;
  parentLogin: { username: string; temporaryPassword: string | null; linkedToExisting: boolean };
}

export interface ParentMatch {
  id: string;
  username: string;
  name: string;
  children: number;
}

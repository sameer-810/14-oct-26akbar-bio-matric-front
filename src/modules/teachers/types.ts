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
  biometricId: string;
  joinedOn: string | null;
  isActive: boolean;
  userId: string | null;
  fingerprintEnrolled?: boolean;
}

/** Days at the academy (first in, last out) and every punch, from the machine. */
export interface TeacherDays {
  days: { date: string; inAt: string | null; outAt: string | null; minutes: number; punchCount: number }[];
  punches: { at: string; kind: string | null; source: string; deviceSerial: string }[];
}

export interface TeacherInput {
  title?: string;
  name: string;
  phone?: string;
  subjects?: string[];
  biometricId?: string;
  isActive?: boolean;
}

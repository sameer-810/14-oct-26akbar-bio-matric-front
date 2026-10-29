export type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export interface InstituteSettings {
  name: string;
  branchName: string;
  address: string;
  phone: string;
  email: string;
  biometricIdPrefix: string;
  parentUsernamePrefix: string;
  lateGraceMinutes: number;
  defaultEarlyWindowMinutes: number;
  exitGraceMinutes: number;
  doubleTapMinutes: number;
  lectureAutoMark: {
    enabled: boolean;
    graceBeforeMinutes: number;
    graceAfterMinutes: number;
    repunchGapMinutes: number;
    markAfterMinutes: number;
  };
  backdateDays: number;
  /** the parent alert wording; {name} {gr} {time} {date} {academy} */
  messageTemplates: { entry: string; exit: string; absent: string };
  /** what the parent app shows */
  parentApp: { punches: boolean; lectures: boolean; leaveApplication: boolean; results: boolean; documents: boolean; issues: boolean; fees: boolean };
  /** receipts, GST and reminders */
  fees: {
    gstin: string;
    /** basis points, 1800 = 18% */
    taxRates: { rateBps: number; effectiveFrom: string }[];
    backdateDays: number;
    receiptNote: string;
    reminders: { enabled: boolean; everyDays: number };
  };
  /** a push to the batch's families before each lecture */
  lectureReminders: { enabled: boolean; minutesBefore: number };
  /** what a teacher's own login shows */
  facultyApp: { salary: boolean; cancelLecture: boolean };
}

export interface AcademicYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface Subject {
  id?: string;
  name: string;
  shortName: string;
}

export interface Standard {
  id: string;
  name: string;
  code: string;
  stream: string;
  grPrefix: string;
  grStartAt: number;
  grPadding: number;
  subjects: Subject[];
  sortOrder: number;
  isActive: boolean;
}

export interface School {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Batch {
  id: string;
  name: string;
  standardId: string;
  academicYearId: string;
  startTime: string;
  endTime: string;
  workingDays: DayKey[];
  earlyWindowMinutes: number | null;
  room: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  studentCount?: number;
  createdAt: string | null;
}

/** A student as the batch page lists them: read from the student record, nothing made up. */
export interface BatchStudent {
  id: string;
  grNumber: string;
  name: string;
  photoUrl: string;
  /** home: the batch that judges their day; extra: an added group such as maths */
  membership: "home" | "extra";
  /** the day they joined this batch; null for an old record without that day */
  joinedOn: string | null;
  validTill: string;
  schoolName: string;
  phone: string;
  status: "active" | "expired" | "left";
}

export interface BatchStudentQuery {
  search?: string;
  status?: "active" | "expired" | "left" | "all";
  page?: number;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  batchIds: string[];
}

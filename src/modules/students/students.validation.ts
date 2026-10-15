import { z } from "zod";

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => v === "" || /^(\+?91|0)?[6-9]\d{9}$/.test(v), "Enter a 10-digit mobile number");

/** Mirrors the server's admission rules (student.validation.js) for instant feedback. */
export const admissionSchema = z
  .object({
    standardId: z.string().min(1, "Choose the standard"),
    batchId: z.string().min(1, "Choose the batch"),
    firstName: z.string().trim().min(1, "Enter the first name").max(60),
    lastName: z.string().trim().max(60),
    fatherName: z.string().trim().max(80),
    fatherPhone: phone,
    motherName: z.string().trim().max(80),
    motherPhone: phone,
    studentPhone: phone,
    grNumber: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{2,8}$/.test(v), "A GR number is 2–8 digits"),
    dateOfBirth: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Write it as YYYY-MM-DD"),
  })
  .refine((v) => v.fatherPhone || v.motherPhone || v.studentPhone, {
    message: "Give at least one mobile number — the parent's alerts go to it",
    path: ["fatherPhone"],
  });

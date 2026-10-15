import { z } from "zod";
import { HHMM, YMD } from "./enquiryDates";

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => v === "" || /^(\+?91|0)?[6-9]\d{9}$/.test(v), "Enter a 10-digit mobile number");

/**
 * Mirrors the server's enquiry rules (enquiry.validation.js) for instant
 * feedback: a first name and at least one mobile; a first follow-up, when
 * given at all, needs its title, day and time.
 */
export const enquirySchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter the first name").max(60),
    middleName: z.string().trim().max(60),
    lastName: z.string().trim().max(60),
    dateOfBirth: z
      .string()
      .trim()
      .refine((v) => v === "" || YMD.test(v), "Write it as YYYY-MM-DD"),
    schoolName: z.string().trim().max(120),
    fatherName: z.string().trim().max(80),
    fatherPhone: phone,
    motherName: z.string().trim().max(80),
    motherPhone: phone,
    sourceNote: z.string().trim().max(120),
    followUpTitle: z.string().trim().max(140),
    followUpDate: z.string().trim(),
    followUpTime: z.string().trim(),
  })
  .refine((v) => v.fatherPhone || v.motherPhone, {
    message: "Give a mobile number — that is how the lead is followed up",
    path: ["fatherPhone"],
  })
  .superRefine((v, ctx) => {
    const any = v.followUpTitle || v.followUpDate || v.followUpTime;
    if (!any) return;
    if (v.followUpTitle.length < 2) ctx.addIssue({ code: "custom", path: ["followUpTitle"], message: "Say what the follow-up is" });
    if (!YMD.test(v.followUpDate)) ctx.addIssue({ code: "custom", path: ["followUpDate"], message: "Write it as YYYY-MM-DD" });
    if (!HHMM.test(v.followUpTime)) ctx.addIssue({ code: "custom", path: ["followUpTime"], message: "Write it as HH:MM, e.g. 17:30" });
  });

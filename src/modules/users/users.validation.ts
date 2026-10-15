import { z } from "zod";

/** Mirrors the server's rules (user.validation.js) for instant feedback; the server decides. */
export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Enter their full name").max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9._-]{2,39}$/, "3–40 letters or digits, starting with a letter, no spaces")
    .refine((v) => !/^p\d+$/.test(v), "Usernames like P12012 are reserved for parents"),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .refine((v) => v === "" || /^(\+?91|0)?[6-9]\d{9}$/.test(v), "Enter a 10-digit mobile number")
    .optional(),
  role: z.enum(["owner", "manager", "front_desk", "counselor", "teacher"], {
    errorMap: () => ({ message: "Choose a role" }),
  }),
});

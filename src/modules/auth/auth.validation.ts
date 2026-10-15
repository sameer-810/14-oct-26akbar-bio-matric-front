import { z } from "zod";

/**
 * Mirrors the server's rule so the person hears about a weak password before
 * pressing the button; the server still has the final word.
 */
export const newPasswordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "That is too long")
  .refine((v) => new Set(v.toLowerCase()).size >= 4, "Use a mix of at least four different characters");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: newPasswordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { message: "The two new passwords do not match", path: ["confirm"] })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "Choose a new password, not the current one",
    path: ["newPassword"],
  });

export type FieldErrors = Partial<Record<string, string>>;

/** Zod issues → { field: first message }. */
export function fieldErrors(result: z.SafeParseReturnType<unknown, unknown>): FieldErrors {
  if (result.success) return {};
  const out: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

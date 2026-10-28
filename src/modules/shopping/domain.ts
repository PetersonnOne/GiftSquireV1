import { z } from "zod";
export const setupSchema = z.object({
  journey: z.enum(["self", "gift"]),
  title: z.string().trim().min(2).max(80),
  occasion: z.string().trim().max(80),
  relationship: z.string().trim().max(60),
  currency: z.string().regex(/^[A-Z]{3}$/),
  budget: z.number().positive().max(1000000).nullable(),
  preferences: z.string().trim().max(600),
});
export type Setup = z.infer<typeof setupSchema>;
export const SHADES = [
  { id: "rose", name: "Soft rose", hex: "#B75B71" },
  { id: "berry", name: "Berry", hex: "#8D365C" },
  { id: "coral", name: "Coral", hex: "#DB6D61" },
] as const;
export function validApproval(
  look: { approved: boolean; sourceVersion: number; status: string },
  version: number,
) {
  return (
    look.approved &&
    look.status === "complete" &&
    look.sourceVersion === version
  );
}

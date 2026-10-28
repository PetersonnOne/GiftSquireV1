import { v } from "convex/values";
export const partnerSnapshot = v.object({
  relationship: v.string(),
  preferences: v.string(),
  currency: v.string(),
  budget: v.optional(v.number()),
  sourceVersion: v.number(),
  selectedId: v.optional(v.id("looks")),
  shortlist: v.array(
    v.object({
      id: v.id("looks"),
      name: v.string(),
      version: v.number(),
      sourceVersion: v.number(),
      renderVersion: v.optional(v.number()),
      status: v.string(),
      shade: v.optional(v.string()),
      approved: v.boolean(),
      feedbackVersion: v.number(),
    }),
  ),
});

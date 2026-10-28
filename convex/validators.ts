import { v } from "convex/values";
export const theme = v.union(
  v.literal("garden"),
  v.literal("midnight"),
  v.literal("dark"),
  v.literal("white"),
);
export const permission = v.union(
  v.literal("members.manage"),
  v.literal("audit.read"),
  v.literal("themes.manage"),
  v.literal("catalog.manage"),
  v.literal("spaces.read"),
);
export const viewer = v.union(
  v.null(),
  v.object({
    id: v.id("users"),
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("member"),
      v.literal("admin"),
      v.literal("superadmin"),
    ),
    permissions: v.array(permission),
    isAnonymous: v.boolean(),
  }),
);
export const auditEvent = v.object({
  _id: v.id("auditEvents"),
  _creationTime: v.number(),
  actorId: v.optional(v.id("users")),
  action: v.string(),
  module: v.string(),
  outcome: v.union(v.literal("success"), v.literal("failure")),
  target: v.optional(v.string()),
  requestId: v.string(),
  summary: v.string(),
});

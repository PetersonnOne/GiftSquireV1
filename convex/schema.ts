import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { permission, theme } from "./validators";

export default defineSchema({
  ...authTables,
  staffGrants: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("superadmin"), v.literal("admin")),
    permissions: v.array(permission),
    grantedBy: v.optional(v.id("users")),
  }).index("by_userId", ["userId"]),
  siteSettings: defineTable({
    key: v.literal("appearance"),
    theme,
    version: v.number(),
    updatedBy: v.optional(v.id("users")),
  }).index("by_key", ["key"]),
  userPreferences: defineTable({
    userId: v.id("users"),
    theme: v.union(theme, v.literal("site")),
    locale: v.string(),
  }).index("by_userId", ["userId"]),
  auditEvents: defineTable({
    actorId: v.optional(v.id("users")),
    action: v.string(),
    module: v.string(),
    outcome: v.union(v.literal("success"), v.literal("failure")),
    target: v.optional(v.string()),
    requestId: v.string(),
    summary: v.string(),
  })
    .index("by_module", ["module"])
    .index("by_actorId", ["actorId"]),
  usageBuckets: defineTable({ key: v.string(), count: v.number() }).index(
    "by_key",
    ["key"],
  ),
  spaces: defineTable({
    photoPath: v.optional(v.union(v.literal("invite"), v.literal("shared"))),
    photoOwnerId: v.optional(v.id("users")),
    ownerId: v.id("users"),
    recipientId: v.optional(v.id("users")),
    journey: v.union(v.literal("self"), v.literal("gift")),
    title: v.string(),
    occasion: v.string(),
    relationship: v.string(),
    budget: v.optional(v.number()),
    currency: v.string(),
    preferences: v.string(),
    version: v.number(),
    preferenceVersion: v.optional(v.number()),
    inviteHash: v.optional(v.string()),
    inviteExpiresAt: v.optional(v.number()),
    photoId: v.optional(v.id("_storage")),
    demoPhoto: v.optional(v.boolean()),
    consentAt: v.optional(v.number()),
    sharePreviews: v.boolean(),
    selectionId: v.optional(v.id("looks")),
    closed: v.boolean(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_recipient", ["recipientId"])
    .index("by_invite", ["inviteHash"]),
  looks: defineTable({
    spaceId: v.id("spaces"),
    productId: v.string(),
    version: v.number(),
    sourceVersion: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("queued"),
      v.literal("running"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    taskId: v.optional(v.string()),
    taskPath: v.optional(v.string()),
    resultId: v.optional(v.id("_storage")),
    detailId: v.optional(v.id("_storage")),
    cropId: v.optional(v.id("_storage")),
    lipstick: v.optional(v.string()),
    approved: v.boolean(),
    rejected: v.boolean(),
    approvedBy: v.optional(v.id("users")),
    feedback: v.string(),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    outputExpiresAt: v.optional(v.number()),
  })
    .index("by_space", ["spaceId"])
    .index("by_result", ["resultId"])
    .index("by_detail", ["detailId"])
    .index("by_crop", ["cropId"]),
  briefs: defineTable({
    spaceId: v.id("spaces"),
    ownerId: v.id("users"),
    kind: v.union(v.literal("partner"), v.literal("gift")),
    sourceVersion: v.number(),
    preferenceVersion: v.number(),
    lookRefs: v.array(
      v.object({
        id: v.id("looks"),
        version: v.number(),
        approved: v.boolean(),
      }),
    ),
    subject: v.string(),
    message: v.string(),
    recipientEmail: v.optional(v.string()),
    inviteToken: v.optional(v.string()),
    sendStartedAt: v.optional(v.number()),
    firstSendStartedAt: v.optional(v.number()),
    status: v.union(
      v.literal("draft"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    providerId: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    error: v.optional(v.string()),
  }).index("by_space", ["spaceId"]),
  media: defineTable({
    ownerId: v.id("users"),
    storageId: v.id("_storage"),
    spaceId: v.id("spaces"),
  })
    .index("by_storage", ["storageId"])
    .index("by_space", ["spaceId"]),
  feedback: defineTable({
    spaceId: v.id("spaces"),
    actorId: v.id("users"),
    text: v.string(),
    lookId: v.optional(v.id("looks")),
  }).index("by_space", ["spaceId"]),
  voiceConnections: defineTable({
    ownerId: v.id("users"),
    requestId: v.string(),
    mode: v.union(v.literal("interactive"), v.literal("discussion")),
    spaceId: v.optional(v.id("spaces")),
    context: v.string(),
    status: v.union(
      v.literal("starting"),
      v.literal("active"),
      v.literal("closing"),
      v.literal("closed"),
      v.literal("uncertain"),
    ),
    providerId: v.optional(v.string()),
    expiresAt: v.number(),
    closedAt: v.optional(v.number()),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_ownerId_and_requestId", ["ownerId", "requestId"]),
});

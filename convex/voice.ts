import { discussionArgs, discussionContext } from "./model/discussion";
import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser } from "./model/access";
import schema from "./schema";
import { access } from "./spaces";
import { LIVE_SECONDS } from "../src/modules/shopping/voice/voice-contracts";

export const reserve = internalMutation({
  args: {
    requestId: v.string(),
    mode: v.union(v.literal("interactive"), v.literal("discussion")),
    context: v.string(),
    spaceId: v.optional(v.id("spaces")),
    ...discussionArgs,
  },
  returns: v.id("voiceConnections"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (
      !/^[a-zA-Z0-9-]{10,70}$/.test(args.requestId) ||
      args.context.length > 20000
    )
      throw new ConvexError("Invalid voice request.");
    const duplicate = await ctx.db
      .query("voiceConnections")
      .withIndex("by_ownerId_and_requestId", (q) =>
        q.eq("ownerId", user._id).eq("requestId", args.requestId),
      )
      .unique();
    if (duplicate)
      throw new ConvexError(
        "Connection request already used. Stop it before reconnecting.",
      );
    const latest = await ctx.db
      .query("voiceConnections")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .first();
    if (latest && latest.status !== "closed")
      throw new ConvexError(
        "Another voice session is active or awaiting server cleanup.",
      );
    if (latest && Date.now() - latest._creationTime < 60000)
      throw new ConvexError("Wait one minute between voice starts.");
    let context = args.context;
    if (args.mode === "discussion") {
      if (!args.spaceId)
        throw new ConvexError("Choose a shopping space first.");
      context = JSON.stringify(
        await discussionContext(ctx, args.spaceId, args),
      );
    }
    for (const [key, limit] of [
      [`voice:${user._id}:${new Date().toISOString().slice(0, 10)}`, 6],
      [`voice:global:${new Date().toISOString().slice(0, 10)}`, 24],
    ] as const) {
      const bucket = await ctx.db
        .query("usageBuckets")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if ((bucket?.count || 0) >= limit)
        throw new ConvexError("Daily voice start allowance reached.");
      if (bucket) await ctx.db.patch(bucket._id, { count: bucket.count + 1 });
      else await ctx.db.insert("usageBuckets", { key, count: 1 });
    }
    const expiresAt = Date.now() + LIVE_SECONDS * 1000;
    const id = await ctx.db.insert("voiceConnections", {
      ownerId: user._id,
      requestId: args.requestId,
      mode: args.mode,
      spaceId: args.spaceId,
      context,
      status: "starting",
      expiresAt,
    });
    await ctx.scheduler.runAt(expiresAt, internal.voiceActions.hangup, {
      id,
      attempt: 0,
    });
    await ctx.scheduler.runAt(
      expiresAt + 86400000,
      internal.voice.expireContext,
      { id },
    );
    return id;
  },
});
export const connection = internalQuery({
  args: { id: v.id("voiceConnections") },
  returns: v.union(v.null(), schema.doc("voiceConnections")),
  handler: async (ctx, { id }) => ctx.db.get(id),
});
export const owned = internalQuery({
  args: { id: v.id("voiceConnections") },
  returns: schema.doc("voiceConnections"),
  handler: async (ctx, { id }) => {
    const u = await requireUser(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.ownerId !== u._id)
      throw new ConvexError("Voice session not found.");
    return row;
  },
});
export const attach = internalMutation({
  args: { id: v.id("voiceConnections"), providerId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) return false;
    const active = row.status === "starting" && row.expiresAt > Date.now();
    await ctx.db.patch(row._id, {
      providerId: args.providerId,
      status: active ? "active" : "closing",
    });
    if (!active)
      await ctx.scheduler.runAfter(0, internal.voiceActions.hangup, {
        id: row._id,
        attempt: 0,
      });
    return active;
  },
});
export const finish = internalMutation({
  args: { id: v.id("voiceConnections"), certain: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (row && row.status !== "closed")
      await ctx.db.patch(row._id, {
        status: args.certain ? "closed" : "uncertain",
      });
    return null;
  },
});
export const stop = mutation({
  args: { id: v.id("voiceConnections") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const u = await requireUser(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.ownerId !== u._id)
      throw new ConvexError("Voice session not found.");
    if (row.status !== "closed") {
      await ctx.db.patch(id, { status: "closing" });
      await ctx.scheduler.runAfter(0, internal.voiceActions.hangup, {
        id,
        attempt: 0,
      });
    }
    return null;
  },
});
export const state = query({
  args: { id: v.id("voiceConnections") },
  returns: v.union(
    v.null(),
    v.object({
      status: schema.tables.voiceConnections.validator.fields.status,
      expiresAt: v.number(),
    }),
  ),
  handler: async (ctx, { id }) => {
    const u = await requireUser(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.ownerId !== u._id) return null;
    return { status: row.status, expiresAt: row.expiresAt };
  },
});
export const expireContext = internalMutation({
  args: { id: v.id("voiceConnections") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (row) await ctx.db.patch(id, { context: "" });
    return null;
  },
});

import { v, ConvexError } from "convex/values";
import { internalMutation } from "./_generated/server";
import { requireUser } from "./model/access";
import { recordAudit } from "./model/audit";
export const reserve = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    for (const [key, limit] of [
      [`onboarding:${user._id}:${Math.floor(Date.now() / 3600000)}`, 12],
      [`onboarding:global:${new Date().toISOString().slice(0, 10)}`, 200],
    ] as const) {
      const row = await ctx.db
        .query("usageBuckets")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if ((row?.count || 0) >= limit)
        throw new ConvexError("ASSISTANT_RATE_LIMIT");
      if (row) await ctx.db.patch(row._id, { count: row.count + 1 });
      else await ctx.db.insert("usageBuckets", { key, count: 1 });
    }
    return null;
  },
});
export const record = internalMutation({
  args: { success: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await recordAudit(ctx, {
      actorId: user._id,
      action: "onboarding.interpreted",
      module: "planning",
      outcome: args.success ? "success" : "failure",
      summary: args.success
        ? "Interpreted user-entered preferences for review. Input text excluded."
        : "Preference interpretation could not finish. Input text excluded.",
    });
    return null;
  },
});

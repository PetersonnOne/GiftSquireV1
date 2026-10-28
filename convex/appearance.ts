import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { theme } from "./validators";
import { requireSuperadmin, requireUser } from "./model/access";
import { recordAudit } from "./model/audit";
export const site = query({
  args: {},
  returns: v.object({ theme, version: v.number() }),
  handler: async (ctx) => {
    // Intentionally public: only the default palette and revision, no personal data.
    const row = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "appearance"))
      .unique();
    return { theme: row?.theme || "midnight", version: row?.version || 0 };
  },
});
export const mine = query({
  args: {},
  returns: v.union(theme, v.literal("site")),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const row = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    return row?.theme || "site";
  },
});
export const setMine = mutation({
  args: { theme: v.union(theme, v.literal("site")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const row = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (row) {
      if (row.theme === args.theme) return null;
      await ctx.db.patch(row._id, { theme: args.theme });
    } else
      await ctx.db.insert("userPreferences", {
        userId: user._id,
        theme: args.theme,
        locale: "en",
      });
    await recordAudit(ctx, {
      actorId: user._id,
      action: "appearance.personal.updated",
      module: "appearance",
      outcome: "success",
      summary: `Personal theme set to ${args.theme}.`,
    });
    return null;
  },
});
export const setSite = mutation({
  args: { theme },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireSuperadmin(ctx);
    const row = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "appearance"))
      .unique();
    if (row?.theme === args.theme) return null;
    if (row)
      await ctx.db.patch(row._id, {
        theme: args.theme,
        version: row.version + 1,
        updatedBy: actor.user._id,
      });
    else
      await ctx.db.insert("siteSettings", {
        key: "appearance",
        theme: args.theme,
        version: 1,
        updatedBy: actor.user._id,
      });
    await recordAudit(ctx, {
      actorId: actor.user._id,
      action: "appearance.site.updated",
      module: "appearance",
      outcome: "success",
      summary: `Site default changed to ${args.theme}.`,
    });
    return null;
  },
});

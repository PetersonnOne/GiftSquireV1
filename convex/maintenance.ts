import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
// Clear abandoned uploads only. Current photos/results remain until explicit deletion.
export const sweepUploads = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db.system
      .query("_storage")
      .paginate({ cursor: cursor ?? null, numItems: 40 });
    let removed = 0;
    for (const file of page.page) {
      if (file._creationTime > Date.now() - 86400000) continue;
      const source = await ctx.db
        .query("media")
        .withIndex("by_storage", (q) => q.eq("storageId", file._id))
        .first();
      const result = await ctx.db
        .query("looks")
        .withIndex("by_result", (q) => q.eq("resultId", file._id))
        .first();
      const detail = await ctx.db
        .query("looks")
        .withIndex("by_detail", (q) => q.eq("detailId", file._id))
        .first();
      const crop = await ctx.db
        .query("looks")
        .withIndex("by_crop", (q) => q.eq("cropId", file._id))
        .first();
      const variant = await ctx.db
        .query("shadePreviews")
        .withIndex("by_result", (q) => q.eq("resultId", file._id))
        .first();
      if (!source && !result && !detail && !crop && !variant) {
        await ctx.storage.delete(file._id);
        removed++;
      }
    }
    if (!page.isDone)
      await ctx.scheduler.runAfter(1000, internal.maintenance.sweepUploads, {
        cursor: page.continueCursor,
      });
    return removed;
  },
});

import { mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { discussionArgs, discussionContext } from "./model/discussion";
import { requireUser } from "./model/access";
export const save = mutation({
  args: {
    spaceId: v.id("spaces"),
    ...discussionArgs,
    version: v.number(),
    renderVersion: v.optional(v.number()),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const topic = await discussionContext(ctx, args.spaceId, args),
      user = await requireUser(ctx),
      text = args.text.trim();
    if (!text || text.length > 600)
      throw new ConvexError("Write a reviewed note of 1–600 characters.");
    if (
      topic.preferenceVersion !== args.version ||
      (topic.target && topic.target.renderVersion !== args.renderVersion)
    )
      throw new ConvexError(
        "This item or its feedback changed. Review the current version before saving; your draft is kept.",
      );
    if (topic.scope === "decision" && topic.target) {
      const existing = await ctx.db
        .query("decisionNotes")
        .withIndex("by_target", (q) =>
          q
            .eq("spaceId", args.spaceId)
            .eq("lookId", topic.target!.id)
            .eq("stage", topic.stage),
        )
        .unique();
      const fields = {
        text,
        version: topic.preferenceVersion + 1,
        renderVersion: topic.target.renderVersion,
      };
      if (existing) await ctx.db.patch(existing._id, fields);
      else
        await ctx.db.insert("decisionNotes", {
          spaceId: args.spaceId,
          ownerId: user._id,
          lookId: topic.target.id,
          stage: topic.stage,
          ...fields,
        });
    } else if (topic.target)
      await ctx.db.patch(topic.target.id, {
        feedback: text,
        feedbackVersion: topic.preferenceVersion + 1,
        feedbackStage: topic.stage,
      });
    else
      await ctx.db.patch(args.spaceId, {
        preferences: text,
        preferenceVersion: topic.preferenceVersion + 1,
      });
    await ctx.db.insert("feedback", {
      spaceId: args.spaceId,
      actorId: user._id,
      text,
      lookId: topic.target?.id,
      scope: topic.scope,
      stage: topic.stage,
      purchaseReported: topic.purchaseReported,
      renderVersion: topic.target?.renderVersion,
    });
    // Notes do not change a rendered image or the approval of an unrelated choice.
  },
});

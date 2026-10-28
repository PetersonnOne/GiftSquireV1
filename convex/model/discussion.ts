import { ConvexError, v } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { access } from "../spaces";
import { readLookNote } from "./lookNotes";
import { PRODUCTS } from "../catalog";
export const discussionArgs = {
  scope: v.optional(
    v.union(v.literal("space"), v.literal("look"), v.literal("decision")),
  ),
  lookId: v.optional(v.id("looks")),
  stage: v.optional(v.union(v.literal("planning"), v.literal("post_purchase"))),
  purchaseConfirmed: v.optional(v.boolean()),
};
export type Topic = {
  scope?: "space" | "look" | "decision";
  lookId?: Id<"looks">;
  stage?: "planning" | "post_purchase";
  purchaseConfirmed?: boolean;
};
export async function discussionContext(
  ctx: QueryCtx | MutationCtx,
  spaceId: Id<"spaces">,
  args: Topic,
) {
  const { space, user } = await access(ctx, spaceId),
    scope = args.scope ?? "space",
    stage = args.stage ?? "planning";
  if (
    stage === "post_purchase" &&
    (!args.purchaseConfirmed || scope === "space")
  )
    throw new ConvexError(
      "Choose the item and explicitly confirm your purchase report before discussing post-purchase feedback.",
    );
  const look =
    scope !== "space" && args.lookId ? await ctx.db.get(args.lookId) : null;
  if (scope !== "space" && (!look || look.spaceId !== spaceId))
    throw new ConvexError("Choose a look from this shopping space.");
  if (
    scope === "decision" &&
    (space.ownerId !== user._id || space.selectionId !== look?._id)
  )
    throw new ConvexError(
      "The saved choice changed or is private to its owner. Review the current choice first.",
    );
  const decision =
    scope === "decision" && look
      ? await ctx.db
          .query("decisionNotes")
          .withIndex("by_target", (q) =>
            q.eq("spaceId", spaceId).eq("lookId", look._id).eq("stage", stage),
          )
          .unique()
      : null;
  const previous =
    scope !== "decision" && look
      ? await readLookNote(ctx, look._id, stage)
      : null;
  return {
    mode: "discussion" as const,
    scope,
    stage,
    purchaseReported:
      stage === "post_purchase" && args.purchaseConfirmed === true,
    title: space.title,
    journey: space.journey,
    occasion: space.occasion,
    spacePreferences: space.preferences,
    preferences:
      scope === "decision"
        ? (decision?.text ?? "")
        : look
          ? (previous?.text ??
            ((look.feedbackStage ?? "planning") === stage ? look.feedback : ""))
          : space.preferences,
    preferenceVersion:
      scope === "decision"
        ? (decision?.version ?? 1)
        : look
          ? (look.feedbackVersion ?? 1)
          : (space.preferenceVersion ?? 1),
    target: look
      ? {
          id: look._id,
          name: PRODUCTS.find((p) => p.id === look.productId)?.name ?? "Outfit",
          renderVersion: look.version,
          sourceVersion: look.sourceVersion,
          status: look.status,
        }
      : null,
  };
}

import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
export async function readLookNote(
  ctx: QueryCtx | MutationCtx,
  lookId: Id<"looks">,
  stage: "planning" | "post_purchase",
) {
  return ctx.db
    .query("feedback")
    .withIndex("by_look_stage", (q) =>
      q.eq("lookId", lookId).eq("stage", stage),
    )
    .order("desc")
    .filter((q) => q.neq(q.field("scope"), "decision"))
    .first();
}

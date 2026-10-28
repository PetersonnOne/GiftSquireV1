import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
export async function clearShadeCache(ctx: MutationCtx, lookId: Id<"looks">) {
  const rows = await ctx.db
      .query("shadePreviews")
      .withIndex("by_look", (q) => q.eq("lookId", lookId))
      .collect(),
    removed = new Set<Id<"_storage">>();
  for (const row of rows) {
    if (!removed.has(row.resultId)) {
      await ctx.storage.delete(row.resultId);
      removed.add(row.resultId);
    }
    await ctx.db.delete(row._id);
  }
  return removed;
}

import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { discussionArgs, discussionContext } from "./model/discussion";
export const read = internalQuery({
  args: { spaceId: v.id("spaces"), ...discussionArgs },
  handler: async (ctx, { spaceId, ...topic }) =>
    discussionContext(ctx, spaceId, topic),
});

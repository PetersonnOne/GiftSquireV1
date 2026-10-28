import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { access } from "./spaces";
export const read = internalQuery({
  args: { spaceId: v.id("spaces") },
  handler: async (ctx, { spaceId }) => {
    const { space } = await access(ctx, spaceId);
    return {
      title: space.title,
      journey: space.journey,
      occasion: space.occasion,
      preferences: space.preferences,
    };
  },
});

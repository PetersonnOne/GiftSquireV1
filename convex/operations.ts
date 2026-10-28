import { query } from "./_generated/server";
import { requirePermission } from "./model/access";
export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "spaces.read");
    const spaces = await ctx.db.query("spaces").order("desc").take(200),
      looks = await ctx.db.query("looks").order("desc").take(600),
      voice = await ctx.db.query("voiceConnections").order("desc").take(200),
      briefs = await ctx.db.query("briefs").order("desc").take(200);
    return {
      sample: true,
      spaces: spaces.filter((s) => !s.closed).length,
      previews: looks.filter((l) => l.status === "complete").length,
      running: looks.filter(
        (l) => l.status === "running" || l.status === "queued",
      ).length,
      failed: looks.filter((l) => l.status === "failed").length,
      voiceActive: voice.filter((v) => !["closed"].includes(v.status)).length,
      emailsAccepted: briefs.filter((b) => b.status === "sent").length,
    };
  },
});

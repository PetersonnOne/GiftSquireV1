import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { can, type Permission } from "../../src/modules/identity/permissions";
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const id = await getAuthUserId(ctx);
  if (!id) throw new ConvexError("AUTH_REQUIRED");
  const user = await ctx.db.get(id);
  if (!user) throw new ConvexError("AUTH_REQUIRED");
  return user;
}
export async function membership(ctx: QueryCtx | MutationCtx) {
  const user = await requireUser(ctx);
  const grant = await ctx.db
    .query("staffGrants")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique();
  return {
    user,
    role: grant?.role || ("member" as const),
    permissions: grant?.permissions || [],
  };
}
export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  p: Permission,
) {
  const actor = await membership(ctx);
  if (!can(actor.role, actor.permissions, p))
    throw new ConvexError("FORBIDDEN");
  return actor;
}
export async function requireSuperadmin(ctx: QueryCtx | MutationCtx) {
  const actor = await membership(ctx);
  if (actor.role !== "superadmin") throw new ConvexError("FORBIDDEN");
  return actor;
}

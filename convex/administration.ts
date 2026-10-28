import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requirePermission } from "./model/access";
import { recordAudit } from "./model/audit";
import { canDelegate } from "../src/modules/identity/permissions";
import { auditEvent, permission } from "./validators";
export const members = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(
      v.object({
        id: v.id("users"),
        name: v.string(),
        email: v.string(),
        role: v.string(),
        permissions: v.array(permission),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    await requirePermission(ctx, "members.manage");
    const opts = {
      ...args.paginationOpts,
      numItems: Math.min(30, Math.max(1, args.paginationOpts.numItems)),
    };
    const page = await ctx.db.query("users").order("desc").paginate(opts);
    return {
      isDone: page.isDone,
      continueCursor: page.continueCursor,
      page: await Promise.all(
        page.page.map(async (u) => {
          const grant = await ctx.db
            .query("staffGrants")
            .withIndex("by_userId", (q) => q.eq("userId", u._id))
            .unique();
          return {
            id: u._id,
            name: u.name || "Member",
            email: u.email || "",
            role: grant?.role || "member",
            permissions: grant?.permissions || [],
          };
        }),
      ),
    };
  },
});
export const setAdmin = mutation({
  args: {
    userId: v.id("users"),
    permissions: v.array(permission),
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "members.manage");
    if (!canDelegate(actor.role, actor.permissions, args.permissions))
      throw new ConvexError("CANNOT_DELEGATE_PERMISSION");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("USER_NOT_FOUND");
    const grant = await ctx.db
      .query("staffGrants")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (grant?.role === "superadmin" || args.userId === actor.user._id)
      throw new ConvexError("PROTECTED_ROLE");
    if (grant && !canDelegate(actor.role, actor.permissions, grant.permissions))
      throw new ConvexError("CANNOT_MANAGE_HIGHER_SCOPE");
    const permissions = [...new Set(args.permissions)];
    if (args.enabled) {
      if (grant)
        await ctx.db.patch(grant._id, {
          role: "admin",
          permissions,
          grantedBy: actor.user._id,
        });
      else
        await ctx.db.insert("staffGrants", {
          userId: args.userId,
          role: "admin",
          permissions,
          grantedBy: actor.user._id,
        });
    } else if (grant) await ctx.db.delete(grant._id);
    await recordAudit(ctx, {
      actorId: actor.user._id,
      action: args.enabled ? "staff.granted" : "staff.revoked",
      module: "administration",
      target: args.userId,
      outcome: "success",
      summary: args.enabled
        ? `Admin permissions: ${permissions.join(", ")}.`
        : "Admin access revoked.",
    });
    return null;
  },
});
export const audits = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(auditEvent),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    await requirePermission(ctx, "audit.read");
    const page = await ctx.db
      .query("auditEvents")
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(40, Math.max(1, args.paginationOpts.numItems)),
      });
    return {
      page: page.page,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});
export const bootstrapOwner = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Operator-only bootstrap: never exposed to the browser; never auto-promote first signup.
    const existing = await ctx.db.query("staffGrants").take(1);
    if (existing.length) throw new ConvexError("OWNER_ALREADY_BOOTSTRAPPED");
    if (!(await ctx.db.get(args.userId)))
      throw new ConvexError("USER_NOT_FOUND");
    await ctx.db.insert("staffGrants", {
      userId: args.userId,
      role: "superadmin",
      permissions: [],
    });
    await recordAudit(ctx, {
      actorId: args.userId,
      action: "owner.bootstrapped",
      module: "administration",
      outcome: "success",
      summary:
        "Initial owner provisioned through the operator-only internal function.",
    });
    return null;
  },
});

import { ConvexError, v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { access } from "./spaces";
import { PRODUCTS } from "./catalog";
import { validApproval } from "../src/modules/shopping/domain";
async function resolve(ctx: QueryCtx | MutationCtx, id: Id<"briefs">) {
  const brief = await ctx.db.get(id);
  if (!brief) throw new ConvexError("Brief not found.");
  const { space, user, operator } = await access(ctx, brief.spaceId);
  if (brief.ownerId !== user._id || space.ownerId !== user._id)
    throw new ConvexError("This brief is private to its owner.");
  const looks = await Promise.all(brief.lookRefs.map((r) => ctx.db.get(r.id)));
  const tokenHash = brief.inviteToken
    ? Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(brief.inviteToken),
          ),
        ),
      )
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("")
    : null;
  const shortlist =
    brief.kind === "partner"
      ? await ctx.db
          .query("looks")
          .withIndex("by_space", (q) => q.eq("spaceId", space._id))
          .collect()
      : [];
  const snapshot = brief.partnerSnapshot;
  const partnerChanged =
    (brief.kind === "partner" && !snapshot) ||
    (!!snapshot &&
      (snapshot.selectedId !== space.selectionId ||
        snapshot.shortlist.length !== shortlist.length ||
        snapshot.shortlist.some((item) => {
          const l = shortlist.find((l) => l._id === item.id);
          return (
            !l ||
            l.version !== item.version ||
            (l.feedbackVersion ?? 1) !== item.feedbackVersion ||
            validApproval(l, space.version) !== item.approved
          );
        })));
  const stale =
    partnerChanged ||
    (!!tokenHash &&
      (tokenHash !== space.inviteHash ||
        (space.inviteExpiresAt ?? 0) < Date.now())) ||
    brief.sourceVersion !== space.version ||
    brief.preferenceVersion !== (space.preferenceVersion ?? 1) ||
    looks.some(
      (l, i) =>
        !l ||
        l.status !== "complete" ||
        !l.resultId ||
        l.version !== brief.lookRefs[i].version ||
        validApproval(l, space.version) !== brief.lookRefs[i].approved,
    ) ||
    (!operator && !space.sharePreviews && looks.length > 0);
  return { brief, space, stale, looks };
}
export const list = query({
  args: { spaceId: v.id("spaces") },
  handler: async (ctx, { spaceId }) => {
    const { space, user } = await access(ctx, spaceId);
    if (space.ownerId !== user._id) return [];
    return (
      await ctx.db
        .query("briefs")
        .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
        .order("desc")
        .take(20)
    ).map((b) => ({
      id: b._id,
      kind: b.kind,
      status: b.status,
      createdAt: b._creationTime,
    }));
  },
});
export const create = mutation({
  args: {
    spaceId: v.id("spaces"),
    kind: v.union(v.literal("partner"), v.literal("gift")),
    lookIds: v.array(v.id("looks")),
    subject: v.string(),
    message: v.string(),
    recipientEmail: v.optional(v.string()),
    inviteToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { space, user, operator } = await access(ctx, args.spaceId);
    if (space.ownerId !== user._id)
      throw new ConvexError(
        "Only the shopping space owner can prepare a brief.",
      );
    if (
      args.subject.trim().length < 3 ||
      args.subject.length > 120 ||
      /[\r\n]/.test(args.subject) ||
      args.message.length > 1500
    )
      throw new ConvexError(
        "Use a subject of 3–120 characters and a message under 1,500 characters.",
      );
    if (
      args.kind === "gift" &&
      (space.journey !== "gift" ||
        !args.recipientEmail ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.recipientEmail) ||
        args.recipientEmail.length > 254)
    )
      throw new ConvexError(
        "Enter the recipient’s email address for this gift.",
      );
    const ids = [...new Set(args.lookIds)];
    if (ids.length > 3 || (args.kind === "gift" && !ids.length))
      throw new ConvexError(
        "Choose one to three completed previews for the Gift Brief.",
      );
    if (ids.length && !operator && !space.sharePreviews)
      throw new ConvexError(
        "The recipient must share generated previews before you can include them.",
      );
    const refs: { id: Id<"looks">; version: number; approved: boolean }[] = [];
    for (const id of ids) {
      const l = await ctx.db.get(id);
      if (
        !l ||
        l.spaceId !== space._id ||
        l.sourceVersion !== space.version ||
        l.status !== "complete" ||
        !l.resultId
      )
        throw new ConvexError("Choose current completed previews only.");
      refs.push({
        id,
        version: l.version,
        approved: validApproval(l, space.version),
      });
    }
    if (args.kind === "gift" && !space.recipientId) {
      if (!args.inviteToken)
        throw new ConvexError(
          "Create a recipient invitation before preparing the Gift Brief.",
        );
      const hash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(args.inviteToken),
          ),
        ),
      )
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("");
      if (
        space.inviteHash !== hash ||
        (space.inviteExpiresAt ?? 0) < Date.now()
      )
        throw new ConvexError(
          "Refresh the recipient invitation before preparing this brief.",
        );
    }
    if (
      (
        await ctx.db
          .query("briefs")
          .withIndex("by_space", (q) => q.eq("spaceId", args.spaceId))
          .take(30)
      ).length >= 30
    )
      throw new ConvexError(
        "This space already has 30 briefs. Start a new space for a fresh collection.",
      );
    const shortlist =
      args.kind === "partner"
        ? await ctx.db
            .query("looks")
            .withIndex("by_space", (q) => q.eq("spaceId", space._id))
            .collect()
        : [];
    const snapshot =
      args.kind === "partner"
        ? {
            relationship: space.relationship,
            preferences: space.preferences,
            currency: space.currency,
            budget: space.budget,
            sourceVersion: space.version,
            selectedId: space.selectionId,
            shortlist: shortlist.map((l) => ({
              id: l._id,
              name:
                PRODUCTS.find((p) => p.id === l.productId)?.name ?? "Outfit",
              version: l.version,
              renderVersion: l.renderVersion ?? l.version,
              sourceVersion: l.sourceVersion,
              status: l.status,
              shade: l.lipstick,
              approved: validApproval(l, space.version),
              feedbackVersion: l.feedbackVersion ?? 1,
            })),
          }
        : undefined;
    return ctx.db.insert("briefs", {
      partnerSnapshot: snapshot,
      spaceId: args.spaceId,
      ownerId: user._id,
      kind: args.kind,
      sourceVersion: space.version,
      preferenceVersion: space.preferenceVersion ?? 1,
      lookRefs: refs,
      subject: args.subject.trim(),
      message: args.message.trim(),
      recipientEmail:
        args.kind === "gift"
          ? args.recipientEmail?.trim().toLowerCase()
          : undefined,
      inviteToken:
        args.kind === "gift" && !space.recipientId
          ? args.inviteToken
          : undefined,
      status: "draft",
    });
  },
});
export const get = query({
  args: { id: v.id("briefs") },
  handler: async (ctx, { id }) => {
    const { brief: b, space: s, looks, stale } = await resolve(ctx, id);
    return {
      id: b._id,
      kind: b.kind,
      subject: b.subject,
      message: b.message,
      recipientEmail: b.recipientEmail ?? null,
      status: b.status,
      sendStartedAt: b.sendStartedAt ?? null,
      firstSendStartedAt: b.firstSendStartedAt ?? b.sendStartedAt ?? null,
      error: b.error ?? null,
      stale,
      title: s.title,
      occasion: s.occasion,
      relationship:
        b.kind === "partner"
          ? (b.partnerSnapshot?.relationship ?? s.relationship)
          : null,
      sourceRevision: b.sourceVersion,
      createdAt: b._creationTime,
      shortlist:
        b.kind === "partner" ? (b.partnerSnapshot?.shortlist ?? []) : [],
      preferences:
        b.kind === "partner"
          ? (b.partnerSnapshot?.preferences ?? s.preferences)
          : null,
      budget:
        b.kind === "partner"
          ? (b.partnerSnapshot?.budget ?? s.budget ?? null)
          : null,
      currency: s.currency,
      selectedId: b.kind === "partner" ? (s.selectionId ?? null) : null,
      reviewPath:
        b.kind === "gift"
          ? b.inviteToken
            ? `/join?token=${b.inviteToken}`
            : `/studio?space=${s._id}`
          : null,
      images: stale
        ? []
        : await Promise.all(
            looks.map(async (l) => ({
              id: l!._id,
              name:
                PRODUCTS.find((p) => p.id === l!.productId)?.name ?? "Outfit",
              approved: validApproval(l!, s.version),
              shade: l!.lipstick ?? null,
              renderRevision: l!.renderVersion ?? l!.version,
              sourceRevision: l!.sourceVersion,
              detailUrl: l!.detailId
                ? await ctx.storage.getUrl(l!.detailId)
                : null,
              url: (await ctx.storage.getUrl(l!.resultId!))!,
            })),
          ),
    };
  },
});
export const sendData = internalQuery({
  args: { id: v.id("briefs") },
  handler: async (ctx, { id }) => {
    const r = await resolve(ctx, id);
    if (r.stale)
      throw new ConvexError(
        "This brief changed or its image sharing was revoked. Prepare a fresh brief.",
      );
    if (r.brief.kind !== "gift")
      throw new ConvexError("Only Gift Briefs can be emailed to recipients.");
    if (r.brief.inviteToken && (r.space.inviteExpiresAt ?? 0) < Date.now())
      throw new ConvexError("The invitation expired. Prepare a fresh brief.");
    return {
      ...r.brief,
      occasion: r.space.occasion,
      images: r.looks.flatMap((l) => {
        const name =
            PRODUCTS.find((p) => p.id === l!.productId)?.name ?? "Outfit",
          approved = validApproval(l!, r.space.version);
        return [
          { storageId: l!.resultId!, name, approved },
          ...(l!.detailId
            ? [
                {
                  storageId: l!.detailId,
                  name: name + " — lipstick close-up",
                  approved,
                },
              ]
            : []),
        ];
      }),
    };
  },
});
export const claim = internalMutation({
  args: { id: v.id("briefs") },
  handler: async (ctx, { id }) => {
    const { brief: b, stale } = await resolve(ctx, id);
    if (stale || b.kind !== "gift")
      throw new ConvexError("Prepare a current Gift Brief before sending.");
    if (b.status === "sent") return false;
    const first = b.firstSendStartedAt ?? b.sendStartedAt;
    if (first && Date.now() - first >= 23 * 3600000)
      throw new ConvexError(
        "The safe retry window has ended. Check whether the recipient received this email before preparing a new brief.",
      );
    if (b.status === "sending" && Date.now() - (b.sendStartedAt ?? 0) < 60000)
      throw new ConvexError("This brief is already being sent. Please wait.");
    for (const [key, limit] of [
      [`email:${b.ownerId}:${new Date().toISOString().slice(0, 10)}`, 10],
      [`email:shared:${new Date().toISOString().slice(0, 10)}`, 30],
    ] as const) {
      const r = await ctx.db
        .query("usageBuckets")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if ((r?.count ?? 0) >= limit)
        throw new ConvexError(
          "Daily brief email allowance reached. Download your brief or try tomorrow.",
        );
      if (r) await ctx.db.patch(r._id, { count: r.count + 1 });
      else await ctx.db.insert("usageBuckets", { key, count: 1 });
    }
    await ctx.db.patch(id, {
      status: "sending",
      sendStartedAt: Date.now(),
      firstSendStartedAt: b.firstSendStartedAt ?? b.sendStartedAt ?? Date.now(),
      error: undefined,
    });
    return true;
  },
});
export const finish = internalMutation({
  args: {
    id: v.id("briefs"),
    providerId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { id, providerId, error }) => {
    const b = await ctx.db.get(id);
    if (b && b.status !== "sent")
      await ctx.db.patch(id, {
        status: providerId ? "sent" : "failed",
        providerId,
        error,
        sentAt: providerId ? Date.now() : undefined,
      });
  },
});

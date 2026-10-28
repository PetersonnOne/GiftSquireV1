import { v, ConvexError } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { readLookNote } from "./model/lookNotes";
import { clearShadeCache } from "./model/shadeCache";
import { requireUser } from "./model/access";
import { PRODUCTS } from "./catalog";
import {
  setupSchema,
  validApproval,
  SHADES,
} from "../src/modules/shopping/domain";
export const DEMO_PHOTO =
  "https://plugins-media.makeupar.com/strapi/assets/clothes_03_cccd5d4803.jpeg";
export async function access(ctx: QueryCtx | MutationCtx, id: Id<"spaces">) {
  const user = await requireUser(ctx),
    space = await ctx.db.get(id);
  if (
    !space ||
    space.closed ||
    (space.ownerId !== user._id && space.recipientId !== user._id)
  )
    throw new ConvexError("This shopping space is unavailable.");
  const subject =
    space.journey === "self"
      ? space.ownerId === user._id
      : space.recipientId === user._id;
  const operator =
    subject ||
    (space.photoPath === "shared" &&
      space.ownerId === user._id &&
      (!space.photoOwnerId || space.photoOwnerId === user._id));
  return { user, space, subject, operator };
}
async function digest(token: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
async function invalidate(ctx: MutationCtx, id: Id<"spaces">, version: number) {
  for (const look of await ctx.db
    .query("looks")
    .withIndex("by_space", (q) => q.eq("spaceId", id))
    .collect()) {
    const removed = await clearShadeCache(ctx, look._id);
    if (look.resultId) await ctx.storage.delete(look.resultId);
    if (look.detailId && !removed.has(look.detailId))
      await ctx.storage.delete(look.detailId);
    if (look.cropId) await ctx.storage.delete(look.cropId);
    await ctx.db.patch(look._id, {
      version: look.version + 1,
      sourceVersion: version,
      renderVersion: undefined,
      status: "draft",
      resultId: undefined,
      detailId: undefined,
      cropId: undefined,
      approved: false,
      rejected: false,
      approvedBy: undefined,
      taskId: undefined,
      error: undefined,
      lipstick: undefined,
    });
  }
}
async function clearMedia(ctx: MutationCtx, id: Id<"spaces">) {
  for (const m of await ctx.db
    .query("media")
    .withIndex("by_space", (q) => q.eq("spaceId", id))
    .collect()) {
    await ctx.storage.delete(m.storageId);
    await ctx.db.delete(m._id);
  }
}
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const a = await ctx.db
        .query("spaces")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .collect(),
      b = await ctx.db
        .query("spaces")
        .withIndex("by_recipient", (q) => q.eq("recipientId", user._id))
        .collect();
    return [...new Map([...a, ...b].map((s) => [s._id, s])).values()]
      .filter((s) => !s.closed)
      .sort((a, b) => b._creationTime - a._creationTime)
      .map((s) => ({
        id: s._id,
        title: s.title,
        journey: s.journey,
        occasion: s.occasion,
        selected: !!s.selectionId,
      }));
  },
});
export const create = mutation({
  args: {
    setup: v.string(),
    products: v.array(v.string()),
    photoPath: v.optional(v.union(v.literal("invite"), v.literal("shared"))),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx),
      s = setupSchema.parse(JSON.parse(args.setup));
    if (
      (
        await ctx.db
          .query("spaces")
          .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
          .filter((q) => q.eq(q.field("closed"), false))
          .take(20)
      ).length >= 20
    )
      throw new ConvexError(
        "Keep up to 20 active spaces. Close an older space first.",
      );
    const ids = [...new Set(args.products)];
    if (
      !ids.length ||
      ids.length > 6 ||
      ids.some((id) => !PRODUCTS.some((p) => p.id === id))
    )
      throw new ConvexError("Select one to six available outfits.");
    const id = await ctx.db.insert("spaces", {
      ...s,
      budget: s.budget ?? undefined,
      ownerId: user._id,
      photoPath: s.journey === "gift" ? (args.photoPath ?? "invite") : "invite",
      version: 1,
      sharePreviews: false,
      closed: false,
    });
    for (const productId of ids)
      await ctx.db.insert("looks", {
        spaceId: id,
        productId,
        version: 1,
        sourceVersion: 1,
        status: "draft",
        approved: false,
        rejected: false,
        feedback: "",
      });
    return id;
  },
});
export const get = query({
  args: { id: v.id("spaces") },
  handler: async (ctx, { id }) => {
    const { user, space: s, subject, operator } = await access(ctx, id),
      looks = await ctx.db
        .query("looks")
        .withIndex("by_space", (q) => q.eq("spaceId", id))
        .collect();
    const messages = await ctx.db
      .query("feedback")
      .withIndex("by_space", (q) => q.eq("spaceId", id))
      .filter((q) =>
        s.ownerId === user._id
          ? q.eq(q.field("spaceId"), id)
          : q.neq(q.field("scope"), "decision"),
      )
      .order("desc")
      .take(30);
    return {
      id: s._id,
      title: s.title,
      journey: s.journey,
      occasion: s.occasion,
      relationship: s.ownerId === user._id ? s.relationship : "",
      preferences: s.preferences,
      currency: s.currency,
      budget: s.ownerId === user._id ? (s.budget ?? null) : null,
      version: s.version,
      preferenceVersion: s.preferenceVersion ?? 1,
      photoPath: s.photoPath ?? "invite",
      canPreview: operator,
      canApprove: subject,
      role: subject ? "shopper" : "giver",
      isOwner: s.ownerId === user._id,
      recipientJoined: !!s.recipientId,
      sharePreviews: s.sharePreviews,
      hasPhoto: !!(s.photoId || s.demoPhoto),
      photoUrl: operator
        ? s.demoPhoto
          ? DEMO_PHOTO
          : s.photoId
            ? await ctx.storage.getUrl(s.photoId)
            : null
        : null,
      selectedId: s.ownerId === user._id ? (s.selectionId ?? null) : null,
      decisionNotes:
        s.ownerId === user._id
          ? (
              await ctx.db
                .query("decisionNotes")
                .withIndex("by_space", (q) => q.eq("spaceId", id))
                .collect()
            ).map((n) => ({
              lookId: n.lookId,
              stage: n.stage,
              text: n.text,
              version: n.version,
            }))
          : [],
      looks: await Promise.all(
        looks.map(async (l) => ({
          id: l._id,
          productId: l.productId,
          version: l.version,
          sourceVersion: l.sourceVersion,
          feedback: l.feedback,
          feedbackVersion: l.feedbackVersion ?? 1,
          feedbackStage: l.feedbackStage ?? "planning",
          planningFeedback:
            (await readLookNote(ctx, l._id, "planning"))?.text ??
            ((l.feedbackStage ?? "planning") === "planning" ? l.feedback : ""),
          postPurchaseFeedback:
            (await readLookNote(ctx, l._id, "post_purchase"))?.text ??
            (l.feedbackStage === "post_purchase" ? l.feedback : ""),
          status: l.status,
          approved: validApproval(l, s.version),
          rejected: l.rejected,
          lipstick: l.lipstick ?? null,
          renderRevision: l.renderVersion ?? l.version,
          shadePreviews:
            operator || s.sharePreviews
              ? await Promise.all(
                  (
                    await ctx.db
                      .query("shadePreviews")
                      .withIndex("by_look", (q) => q.eq("lookId", l._id))
                      .collect()
                  )
                    .filter(
                      (v) =>
                        v.baseResultId === l.resultId &&
                        v.sourceVersion === s.version,
                    )
                    .map(async (v) => ({
                      id: v._id,
                      shade: v.shade,
                      renderRevision: v.renderVersion,
                      url: (await ctx.storage.getUrl(v.resultId))!,
                    })),
                )
              : [],
          error: l.error ?? null,
          detailUrl:
            (operator || s.sharePreviews) && l.detailId
              ? await ctx.storage.getUrl(l.detailId)
              : null,
          resultUrl:
            (operator || s.sharePreviews) && l.resultId
              ? await ctx.storage.getUrl(l.resultId)
              : null,
        })),
      ),
      messages: messages.reverse().map((m) => ({
        id: m._id,
        text: m.text,
        own: m.actorId === user._id,
        lookId: m.lookId ?? null,
        scope: m.scope ?? "space",
        stage: m.stage ?? "planning",
        purchaseReported: m.purchaseReported ?? false,
        renderVersion: m.renderVersion ?? null,
      })),
    };
  },
});
export const invite = mutation({
  args: { id: v.id("spaces"), token: v.string() },
  handler: async (ctx, { id, token }) => {
    const { space, user } = await access(ctx, id);
    if (
      space.ownerId !== user._id ||
      space.journey !== "gift" ||
      space.recipientId ||
      !/^[-a-z0-9]{64,90}$/i.test(token)
    )
      throw new ConvexError("Invitation cannot be created.");
    await ctx.db.patch(id, {
      inviteHash: await digest(token),
      inviteExpiresAt: Date.now() + 7 * 86400000,
    });
  },
});
export const invitation = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (token.length < 64 || token.length > 90) return null;
    const hashed = await digest(token);
    const s = await ctx.db
      .query("spaces")
      .withIndex("by_invite", (q) => q.eq("inviteHash", hashed))
      .unique();
    return s && !s.closed && (s.inviteExpiresAt ?? 0) > Date.now()
      ? { title: s.title, occasion: s.occasion, joined: !!s.recipientId }
      : null;
  },
});
export const join = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx);
    if (token.length < 64 || token.length > 90)
      throw new ConvexError("Invitation unavailable.");
    const hash = await digest(token),
      s = await ctx.db
        .query("spaces")
        .withIndex("by_invite", (q) => q.eq("inviteHash", hash))
        .unique();
    if (
      !s ||
      s.closed ||
      (s.inviteExpiresAt ?? 0) < Date.now() ||
      s.ownerId === user._id ||
      (s.recipientId && s.recipientId !== user._id)
    )
      throw new ConvexError("Invitation unavailable or already accepted.");
    await ctx.db.patch(s._id, { recipientId: user._id });
    return s._id;
  },
});
export const revoke = mutation({
  args: { id: v.id("spaces") },
  handler: async (ctx, { id }) => {
    const { space, user } = await access(ctx, id);
    if (space.ownerId !== user._id || space.journey !== "gift")
      throw new ConvexError("Only the gift giver can revoke this invitation.");
    await invalidate(ctx, id, space.version + 1);
    await clearMedia(ctx, id);
    await ctx.db.patch(id, {
      inviteHash: undefined,
      inviteExpiresAt: undefined,
      recipientId: undefined,
      photoId: undefined,
      photoOwnerId: undefined,
      demoPhoto: undefined,
      consentAt: undefined,
      sharePreviews: false,
      selectionId: undefined,
      version: space.version + 1,
    });
  },
});
export const uploadUrl = mutation({
  args: { id: v.id("spaces") },
  handler: async (ctx, { id }) => {
    const { operator } = await access(ctx, id);
    if (!operator)
      throw new ConvexError("This photo is managed by the recipient.");
    return ctx.storage.generateUploadUrl();
  },
});
export const photo = mutation({
  args: {
    id: v.id("spaces"),
    storageId: v.optional(v.id("_storage")),
    demo: v.boolean(),
    consent: v.boolean(),
  },
  handler: async (ctx, { id, storageId, demo, consent }) => {
    const { operator, user, space } = await access(ctx, id);
    if (!operator || !consent)
      throw new ConvexError(
        "The person trying on must consent before cloud processing.",
      );
    if (storageId) {
      const meta = await ctx.db.system.get(storageId);
      if (
        !meta ||
        meta.size > 5 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp"].includes(
          meta.contentType ?? "",
        )
      )
        throw new ConvexError("Use a JPG, PNG or WebP image under 5 MB.");
      const claimed = await ctx.db
        .query("media")
        .withIndex("by_storage", (q) => q.eq("storageId", storageId))
        .unique();
      if (claimed) throw new ConvexError("Upload a new image for this space.");
    } else if (!demo) throw new ConvexError("Choose a photo first.");
    await invalidate(ctx, id, space.version + 1);
    await clearMedia(ctx, id);
    if (storageId)
      await ctx.db.insert("media", {
        ownerId: user._id,
        spaceId: id,
        storageId,
      });
    await ctx.db.patch(id, {
      photoId: storageId,
      photoOwnerId: user._id,
      demoPhoto: !storageId && demo,
      consentAt: Date.now(),
      version: space.version + 1,
      selectionId: undefined,
    });
  },
});
export const deletePhoto = mutation({
  args: { id: v.id("spaces") },
  handler: async (ctx, { id }) => {
    const { space, operator, subject } = await access(ctx, id);
    if (!operator)
      throw new ConvexError(
        "Only the photo owner or recipient can delete their photo.",
      );
    await invalidate(ctx, id, space.version + 1);
    await clearMedia(ctx, id);
    await ctx.db.patch(id, {
      photoPath:
        space.journey === "gift" && subject ? "invite" : space.photoPath,
      photoId: undefined,
      photoOwnerId: undefined,
      demoPhoto: undefined,
      consentAt: undefined,
      version: space.version + 1,
      selectionId: undefined,
      sharePreviews: false,
    });
  },
});
export const share = mutation({
  args: { id: v.id("spaces"), enabled: v.boolean() },
  handler: async (ctx, { id, enabled }) => {
    const { subject } = await access(ctx, id);
    if (!subject)
      throw new ConvexError("Only the recipient can share previews.");
    await ctx.db.patch(id, { sharePreviews: enabled });
  },
});
export const approve = mutation({
  args: { lookId: v.id("looks"), version: v.number(), approved: v.boolean() },
  handler: async (ctx, { lookId, version, approved }) => {
    const l = await ctx.db.get(lookId);
    if (!l) throw new ConvexError("Look unavailable.");
    const { subject, space, user } = await access(ctx, l.spaceId);
    if (
      !subject ||
      l.version !== version ||
      l.sourceVersion !== space.version ||
      l.status !== "complete"
    )
      throw new ConvexError(
        "Preview changed. Review the current result before approving.",
      );
    await ctx.db.patch(lookId, {
      approved,
      rejected: !approved,
      approvedBy: user._id,
    });
    if (!approved && space.selectionId === lookId)
      await ctx.db.patch(space._id, { selectionId: undefined });
  },
});
export const select = mutation({
  args: { lookId: v.id("looks"), version: v.number() },
  handler: async (ctx, { lookId, version }) => {
    const l = await ctx.db.get(lookId);
    if (!l) throw new ConvexError("Look unavailable.");
    const { space, user } = await access(ctx, l.spaceId);
    if (
      space.ownerId !== user._id ||
      l.version !== version ||
      !validApproval(l, space.version)
    )
      throw new ConvexError("Choose a currently approved preview.");
    await ctx.db.patch(space._id, { selectionId: lookId });
  },
});
export const message = mutation({
  args: { id: v.id("spaces"), text: v.string() },
  handler: async (ctx, { id, text }) => {
    const { user } = await access(ctx, id);
    text = text.trim();
    if (!text || text.length > 1200)
      throw new ConvexError("Write a note of up to 1,200 characters.");
    await ctx.db.insert("feedback", { spaceId: id, actorId: user._id, text });
  },
});
export const update = mutation({
  args: { id: v.id("spaces"), version: v.number(), preferences: v.string() },
  handler: async (ctx, { id, version, preferences }) => {
    const { space, user } = await access(ctx, id);
    if ((space.preferenceVersion ?? 1) !== version || preferences.length > 600)
      throw new ConvexError(
        "The space changed. Review the current preferences again.",
      );
    await ctx.db.patch(id, {
      preferences: preferences.trim(),
      preferenceVersion: (space.preferenceVersion ?? 1) + 1,
    });
    await ctx.db.insert("feedback", {
      spaceId: id,
      actorId: user._id,
      text: `Reviewed preference: ${preferences.trim()}`,
    });
  },
});
export const remove = mutation({
  args: { id: v.id("spaces") },
  handler: async (ctx, { id }) => {
    const { space, user } = await access(ctx, id);
    if (space.ownerId !== user._id)
      throw new ConvexError("Only the owner can close this space.");
    await invalidate(ctx, id, space.version + 1);
    await clearMedia(ctx, id);
    await ctx.db.patch(id, {
      closed: true,
      photoId: undefined,
      photoOwnerId: undefined,
      demoPhoto: undefined,
      inviteHash: undefined,
      recipientId: undefined,
      selectionId: undefined,
      version: space.version + 1,
    });
  },
});
export const preview = mutation({
  args: {
    lookId: v.id("looks"),
    version: v.number(),
    shade: v.optional(v.string()),
  },
  handler: async (ctx, { lookId, version, shade }) => {
    const l = await ctx.db.get(lookId);
    if (!l) throw new ConvexError("Look unavailable.");
    const { space, operator, user } = await access(ctx, l.spaceId);
    if (
      !operator ||
      !space.consentAt ||
      !(space.photoId || space.demoPhoto) ||
      l.version !== version ||
      ["queued", "running"].includes(l.status)
    )
      throw new ConvexError(
        "Add your photo and review the current preview state first.",
      );
    if (
      shade &&
      (!SHADES.some((s) => s.id === shade) ||
        l.status !== "complete" ||
        !l.resultId)
    )
      throw new ConvexError(
        "Start with a completed outfit preview before trying a lipstick shade.",
      );
    if (shade && l.resultId) {
      const variants = await ctx.db
        .query("shadePreviews")
        .withIndex("by_look", (q) => q.eq("lookId", lookId))
        .collect();
      if (
        l.detailId &&
        l.lipstick &&
        !variants.some((v) => v.resultId === l.detailId)
      )
        await ctx.db.insert("shadePreviews", {
          spaceId: l.spaceId,
          lookId,
          sourceVersion: l.sourceVersion,
          baseResultId: l.resultId,
          shade: l.lipstick,
          resultId: l.detailId,
          renderVersion: l.renderVersion ?? l.version,
        });
      if (l.detailId && l.lipstick === shade) return { cached: true };
      const cached = variants.find(
        (v) =>
          v.shade === shade &&
          v.baseResultId === l.resultId &&
          v.sourceVersion === space.version,
      );
      if (cached) {
        if (cached.resultId === l.detailId && l.lipstick === shade)
          return { cached: true };
        await ctx.db.patch(lookId, {
          version: l.version + 1,
          renderVersion: cached.renderVersion,
          detailId: cached.resultId,
          lipstick: shade,
          approved: false,
          rejected: false,
          approvedBy: undefined,
          error: undefined,
        });
        if (space.selectionId === lookId)
          await ctx.db.patch(space._id, { selectionId: undefined });
        return { cached: true };
      }
    }
    for (const [key, max] of [
      [`render:user:${user._id}:${Math.floor(Date.now() / 3600000)}`, 12],
      [`render:shared:${new Date().toISOString().slice(0, 10)}`, 90],
    ] as const) {
      const b = await ctx.db
        .query("usageBuckets")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if ((b?.count ?? 0) >= max)
        throw new ConvexError(
          "Preview allowance reached. Please try again later.",
        );
      if (b) await ctx.db.patch(b._id, { count: b.count + 1 });
      else await ctx.db.insert("usageBuckets", { key, count: 1 });
    }
    if (!shade) {
      const removed = await clearShadeCache(ctx, lookId);
      if (l.detailId && !removed.has(l.detailId))
        await ctx.storage.delete(l.detailId);
    }
    const next = l.version + 1;
    await ctx.db.patch(lookId, {
      version: next,
      status: "queued",
      detailId: undefined,
      approved: false,
      rejected: false,
      approvedBy: undefined,
      error: undefined,
      startedAt: Date.now(),
      lipstick: shade,
    });
    if (space.selectionId === lookId)
      await ctx.db.patch(space._id, { selectionId: undefined });
    await ctx.scheduler.runAfter(0, internal.youcam.run, {
      lookId,
      version: next,
      makeup: !!shade,
    });
    return { cached: false };
  },
});
export const job = internalQuery({
  args: { lookId: v.id("looks"), version: v.number() },
  handler: async (ctx, { lookId, version }) => {
    const look = await ctx.db.get(lookId);
    if (!look || look.version !== version) return null;
    const space = await ctx.db.get(look.spaceId);
    if (!space || space.closed || space.version !== look.sourceVersion)
      return null;
    return {
      look,
      photoUrl: space.demoPhoto
        ? DEMO_PHOTO
        : space.photoId
          ? await ctx.storage.getUrl(space.photoId)
          : null,
      resultUrl: look.resultId ? await ctx.storage.getUrl(look.resultId) : null,
    };
  },
});
export const jobPatch = internalMutation({
  args: {
    lookId: v.id("looks"),
    version: v.number(),
    status: v.union(
      v.literal("running"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    taskId: v.optional(v.string()),
    error: v.optional(v.string()),
    resultId: v.optional(v.id("_storage")),
    detailId: v.optional(v.id("_storage")),
    cropId: v.optional(v.id("_storage")),
    makeupFailed: v.optional(v.boolean()),
    lipstick: v.optional(v.string()),
  },
  handler: async (ctx, { lookId, version, makeupFailed, ...patch }) => {
    const l = await ctx.db.get(lookId),
      s = l ? await ctx.db.get(l.spaceId) : null;
    async function discardUnreferenced(fileId?: Id<"_storage">) {
      if (!fileId || [l?.resultId, l?.detailId, l?.cropId].includes(fileId))
        return;
      const cached = await ctx.db
        .query("shadePreviews")
        .withIndex("by_result", (q) => q.eq("resultId", fileId))
        .first();
      if (!cached) await ctx.storage.delete(fileId);
    }
    if (
      !l ||
      !s ||
      s.closed ||
      l.version !== version ||
      l.sourceVersion !== s.version
    ) {
      await discardUnreferenced(patch.resultId);
      await discardUnreferenced(patch.detailId);
      await discardUnreferenced(patch.cropId);
      return false;
    }
    if (
      patch.status === "complete" &&
      l.status === "complete" &&
      (patch.resultId || patch.detailId)
    ) {
      await discardUnreferenced(patch.resultId);
      await discardUnreferenced(patch.detailId);
      return false;
    }
    if (patch.detailId && l.resultId && l.lipstick) {
      await ctx.db.insert("shadePreviews", {
        spaceId: l.spaceId,
        lookId,
        sourceVersion: l.sourceVersion,
        baseResultId: l.resultId,
        shade: l.lipstick,
        resultId: patch.detailId,
        renderVersion: version,
      });
    }
    if (patch.resultId && l.resultId) {
      await clearShadeCache(ctx, lookId);
      await ctx.storage.delete(l.resultId);
    }
    if (patch.status !== "running" && l.cropId) {
      await ctx.storage.delete(l.cropId);
      patch.cropId = undefined;
    }
    await ctx.db.patch(lookId, {
      ...patch,
      ...(patch.resultId || patch.detailId ? { renderVersion: version } : {}),
      ...(patch.status === "complete" ? { error: undefined } : {}),
      ...(makeupFailed
        ? { status: "complete" as const, lipstick: undefined }
        : {}),
    });
    return true;
  },
});

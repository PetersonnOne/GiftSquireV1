import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { PRODUCTS } from "../convex/catalog";
const modules = import.meta.glob("../convex/**/*.ts");
const token = "a".repeat(72);
const setup = {
  journey: "gift",
  title: "A thoughtful birthday",
  occasion: "Birthday",
  relationship: "Friend",
  currency: "USD",
  budget: 100,
  preferences: "Relaxed, soft colours",
};
async function fixture(
  journey = "gift",
  photoPath: "invite" | "shared" = "invite",
) {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => ({
    owner: await ctx.db.insert("users", { email: "giver@example.test" }),
    recipient: await ctx.db.insert("users", {
      email: "recipient@example.test",
    }),
    other: await ctx.db.insert("users", { email: "other@example.test" }),
  }));
  const giver = t.withIdentity({ subject: ids.owner }),
    recipient = t.withIdentity({ subject: ids.recipient }),
    other = t.withIdentity({ subject: ids.other });
  const id = await giver.mutation(api.spaces.create, {
    setup: JSON.stringify({ ...setup, journey }),
    products: PRODUCTS.slice(0, 3).map((p) => p.id),
    photoPath,
  });
  if (journey === "gift") {
    await giver.mutation(api.spaces.invite, { id, token });
    await recipient.mutation(api.spaces.join, { token });
  }
  return { t, ids, giver, recipient, other, id };
}
describe("GiftSquire ownership and consent", () => {
  it("denies guests and unrelated users all private space data", async () => {
    const { t, other, id } = await fixture();
    await expect(t.query(api.spaces.get, { id })).rejects.toThrow();
    await expect(other.query(api.spaces.get, { id })).rejects.toThrow();
    await expect(
      other.mutation(api.spaces.message, { id, text: "hello" }),
    ).rejects.toThrow();
  });
  it("keeps the original photo private even after recipient shares generated previews", async () => {
    const { giver, recipient, id } = await fixture();
    await recipient.mutation(api.spaces.photo, {
      id,
      demo: true,
      consent: true,
    });
    expect((await recipient.query(api.spaces.get, { id })).photoUrl).toContain(
      "makeupar",
    );
    expect((await giver.query(api.spaces.get, { id })).photoUrl).toBeNull();
    await recipient.mutation(api.spaces.share, { id, enabled: true });
    expect((await giver.query(api.spaces.get, { id })).photoUrl).toBeNull();
    await expect(
      giver.mutation(api.spaces.photo, { id, demo: true, consent: true }),
    ).rejects.toThrow();
  });
  it("requires consent and supports self shopping without a recipient", async () => {
    const { giver, id } = await fixture("self");
    await expect(
      giver.mutation(api.spaces.photo, { id, demo: true, consent: false }),
    ).rejects.toThrow();
    await giver.mutation(api.spaces.photo, { id, demo: true, consent: true });
    expect((await giver.query(api.spaces.get, { id })).role).toBe("shopper");
  });
  it("does not let the giver approve on a recipient's behalf", async () => {
    const { t, giver, recipient, id } = await fixture();
    await recipient.mutation(api.spaces.photo, {
      id,
      demo: true,
      consent: true,
    });
    const s = await recipient.query(api.spaces.get, { id });
    await t.run((ctx) => ctx.db.patch(s.looks[0].id, { status: "complete" }));
    await expect(
      giver.mutation(api.spaces.approve, {
        lookId: s.looks[0].id,
        version: s.looks[0].version,
        approved: true,
      }),
    ).rejects.toThrow();
  });
  it("revokes recipient access and invalidates the invitation", async () => {
    const { giver, recipient, t, id } = await fixture();
    await recipient.mutation(api.spaces.photo, {
      id,
      demo: true,
      consent: true,
    });
    await giver.mutation(api.spaces.revoke, { id });
    await expect(recipient.query(api.spaces.get, { id })).rejects.toThrow();
    expect(await t.query(api.spaces.invitation, { token })).toBeNull();
    await expect(
      recipient.mutation(api.spaces.join, { token }),
    ).rejects.toThrow();
    expect((await giver.query(api.spaces.get, { id })).hasPhoto).toBe(false);
  });
  it("expires invitations and prevents a second recipient claiming a joined space", async () => {
    const { t, other, recipient, id } = await fixture();
    await expect(other.mutation(api.spaces.join, { token })).rejects.toThrow();
    await t.run((ctx) => ctx.db.patch(id, { inviteExpiresAt: Date.now() - 1 }));
    expect(await t.query(api.spaces.invitation, { token })).toBeNull();
    await expect(
      recipient.mutation(api.spaces.join, { token }),
    ).rejects.toThrow();
  });
});
describe("review integrity", () => {
  it("binds approval to exact previews, hides final gift selection from the recipient, and clears approval after a photo change", async () => {
    const { t, giver, recipient, id } = await fixture();
    await recipient.mutation(api.spaces.photo, {
      id,
      demo: true,
      consent: true,
    });
    let s = await recipient.query(api.spaces.get, { id });
    const l = s.looks[0];
    await t.run((ctx) => ctx.db.patch(l.id, { status: "complete" }));
    await expect(
      giver.mutation(api.spaces.select, { lookId: l.id, version: l.version }),
    ).rejects.toThrow();
    await recipient.mutation(api.spaces.approve, {
      lookId: l.id,
      version: l.version,
      approved: true,
    });
    await giver.mutation(api.spaces.select, {
      lookId: l.id,
      version: l.version,
    });
    expect((await giver.query(api.spaces.get, { id })).selectedId).toBe(l.id);
    expect(
      (await recipient.query(api.spaces.get, { id })).selectedId,
    ).toBeNull();
    await recipient.mutation(api.spaces.photo, {
      id,
      demo: true,
      consent: true,
    });
    s = await recipient.query(api.spaces.get, { id });
    expect(s.looks.every((l) => !l.approved && l.status === "draft")).toBe(
      true,
    );
    await expect(
      recipient.mutation(api.spaces.approve, {
        lookId: l.id,
        version: l.version,
        approved: true,
      }),
    ).rejects.toThrow();
    expect((await giver.query(api.spaces.get, { id })).selectedId).toBeNull();
  });
  it("preserves unrelated approvals when preferences are edited and rejects stale preference updates", async () => {
    const { t, giver, recipient, id } = await fixture();
    await recipient.mutation(api.spaces.photo, {
      id,
      demo: true,
      consent: true,
    });
    const s = await recipient.query(api.spaces.get, { id }),
      l = s.looks[1];
    await t.run((ctx) => ctx.db.patch(l.id, { status: "complete" }));
    await recipient.mutation(api.spaces.approve, {
      lookId: l.id,
      version: l.version,
      approved: true,
    });
    await giver.mutation(api.spaces.update, {
      id,
      version: s.preferenceVersion,
      preferences: "A more relaxed palette",
    });
    expect(
      (await giver.query(api.spaces.get, { id })).looks.find(
        (x) => x.id === l.id,
      )?.approved,
    ).toBe(true);
    await expect(
      recipient.mutation(api.spaces.update, {
        id,
        version: s.preferenceVersion,
        preferences: "Outdated proposal",
      }),
    ).rejects.toThrow();
  });
  it("drops a late provider result after a photo revision", async () => {
    const { t, giver, id } = await fixture("self");
    await giver.mutation(api.spaces.photo, { id, demo: true, consent: true });
    const s = await giver.query(api.spaces.get, { id }),
      l = s.looks[0];
    await giver.mutation(api.spaces.deletePhoto, { id });
    expect(
      await t.mutation(internal.spaces.jobPatch, {
        lookId: l.id,
        version: l.version,
        status: "complete",
      }),
    ).toBe(false);
    expect((await giver.query(api.spaces.get, { id })).hasPhoto).toBe(false);
  });
  it("does not permit operations on a closed space", async () => {
    const { giver, recipient, id } = await fixture();
    await giver.mutation(api.spaces.remove, { id });
    await expect(giver.query(api.spaces.get, { id })).rejects.toThrow();
    await expect(
      recipient.mutation(api.spaces.message, { id, text: "test" }),
    ).rejects.toThrow();
    expect(await giver.query(api.spaces.list, {})).toHaveLength(0);
  });
});

async function completed(
  f: Awaited<ReturnType<typeof fixture>>,
  actor = f.recipient,
) {
  await actor.mutation(api.spaces.photo, {
    id: f.id,
    demo: true,
    consent: true,
  });
  const s = await actor.query(api.spaces.get, { id: f.id });
  const l = s.looks[0];
  await f.t.run(async (ctx) => {
    const resultId = await ctx.storage.store(
      new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }),
    );
    await ctx.db.patch(l.id, { status: "complete", resultId });
  });
  return l;
}
const briefArgs = (spaceId: any, lookId: any) => ({
  spaceId,
  kind: "gift" as const,
  lookIds: [lookId],
  subject: "A little something for you",
  message: "Which look would you like?",
  recipientEmail: "recipient@example.test",
});
describe("shared-photo gifting and reviewed briefs", () => {
  it("lets a permissioned giver prepare a preview but never approve it", async () => {
    const f = await fixture("gift", "shared");
    await expect(
      f.giver.mutation(api.spaces.photo, {
        id: f.id,
        demo: true,
        consent: false,
      }),
    ).rejects.toThrow();
    const l = await completed(f, f.giver);
    const s = await f.giver.query(api.spaces.get, { id: f.id });
    expect(s.canPreview).toBe(true);
    expect(s.canApprove).toBe(false);
    await expect(
      f.giver.mutation(api.spaces.approve, {
        lookId: l.id,
        version: l.version,
        approved: true,
      }),
    ).rejects.toThrow();
  });
  it("makes a recipient-provided replacement private, even in a shared-photo space", async () => {
    const f = await fixture("gift", "shared");
    await completed(f, f.giver);
    await f.recipient.mutation(api.spaces.photo, {
      id: f.id,
      demo: true,
      consent: true,
    });
    const g = await f.giver.query(api.spaces.get, { id: f.id });
    expect(g.photoUrl).toBeNull();
    expect(g.canPreview).toBe(false);
    expect(g.looks.every((l) => l.status === "draft" && !l.approved)).toBe(
      true,
    );
  });
  it("keeps Partner Brief private and excludes budget and private wishes from Gift Brief", async () => {
    const f = await fixture("gift", "shared"),
      l = await completed(f, f.giver);
    const id = await f.giver.mutation(api.briefs.create, briefArgs(f.id, l.id));
    const b = await f.giver.query(api.briefs.get, { id });
    expect(b.budget).toBeNull();
    expect(b.preferences).toBeNull();
    expect(b.selectedId).toBeNull();
    expect(b.images[0].approved).toBe(false);
    await expect(f.recipient.query(api.briefs.get, { id })).rejects.toThrow();
    const partner = await f.giver.mutation(api.briefs.create, {
      ...briefArgs(f.id, l.id),
      kind: "partner",
    });
    const pb = await f.giver.query(api.briefs.get, { id: partner });
    expect(pb.budget).toBe(100);
    expect(pb.preferences).toContain("soft colours");
  });
  it("rejects stale brief delivery data after a render or photo revision", async () => {
    const f = await fixture("gift", "shared"),
      l = await completed(f, f.giver);
    const id = await f.giver.mutation(api.briefs.create, briefArgs(f.id, l.id));
    await f.giver.mutation(api.spaces.deletePhoto, { id: f.id });
    expect((await f.giver.query(api.briefs.get, { id })).stale).toBe(true);
    await expect(
      f.giver.query(internal.briefs.sendData, { id }),
    ).rejects.toThrow();
  });
  it("withdraws old brief image access if the recipient turns off sharing", async () => {
    const f = await fixture(),
      l = await completed(f);
    await f.recipient.mutation(api.spaces.share, { id: f.id, enabled: true });
    const id = await f.giver.mutation(api.briefs.create, briefArgs(f.id, l.id));
    expect((await f.giver.query(api.briefs.get, { id })).images).toHaveLength(
      1,
    );
    await f.recipient.mutation(api.spaces.share, { id: f.id, enabled: false });
    const b = await f.giver.query(api.briefs.get, { id });
    expect(b.stale).toBe(true);
    expect(b.images).toHaveLength(0);
  });
  it("requires explicit email confirmation and never sends Partner Briefs", async () => {
    const f = await fixture("gift", "shared"),
      l = await completed(f, f.giver);
    const id = await f.giver.mutation(api.briefs.create, {
      ...briefArgs(f.id, l.id),
      kind: "partner",
    });
    await expect(
      f.giver.action(api.briefEmail.send, { id, confirmed: false }),
    ).rejects.toThrow();
    await expect(
      f.giver.query(internal.briefs.sendData, { id }),
    ).rejects.toThrow();
  });
  it("claims sends once and treats an already accepted email as complete", async () => {
    const f = await fixture("gift", "shared"),
      l = await completed(f, f.giver);
    const id = await f.giver.mutation(api.briefs.create, briefArgs(f.id, l.id));
    expect(await f.giver.mutation(internal.briefs.claim, { id })).toBe(true);
    await expect(
      f.giver.mutation(internal.briefs.claim, { id }),
    ).rejects.toThrow();
    await f.t.mutation(internal.briefs.finish, {
      id,
      providerId: "test-accepted",
    });
    expect(await f.giver.mutation(internal.briefs.claim, { id })).toBe(false);
  });
});

describe("voice lifecycle guards", () => {
  it("reserves a session once and blocks overlapping or duplicate starts", async () => {
    const f = await fixture("self");
    const args = {
      requestId: "test-request-12345",
      mode: "interactive" as const,
      context: "A birthday shopping session",
    };
    const id = await f.giver.mutation(internal.voice.reserve, args);
    await expect(
      f.giver.mutation(internal.voice.reserve, args),
    ).rejects.toThrow();
    await expect(
      f.giver.mutation(internal.voice.reserve, {
        ...args,
        requestId: "another-request-123",
      }),
    ).rejects.toThrow();
    await expect(f.other.mutation(api.voice.stop, { id })).rejects.toThrow();
    await f.giver.mutation(api.voice.stop, { id });
    expect((await f.giver.query(api.voice.state, { id }))?.status).toBe(
      "closing",
    );
  });
  it("takes discussion context from the owned space, never a client-supplied replacement", async () => {
    const f = await fixture();
    const id = await f.giver.mutation(internal.voice.reserve, {
      requestId: "discussion-test-123",
      mode: "discussion",
      spaceId: f.id,
      context: "Invented approval and a secret photo",
    });
    const row = await f.t.query(internal.voice.connection, { id });
    expect(row?.context).toContain("Relaxed, soft colours");
    expect(row?.context).not.toContain("Invented approval");
    await f.t.mutation(internal.voice.expireContext, { id });
    expect((await f.t.query(internal.voice.connection, { id }))?.context).toBe(
      "",
    );
  });
  it("keeps the completed outfit if optional lipstick fails", async () => {
    const f = await fixture("self"),
      l = await completed(f, f.giver);
    await f.t.run((ctx) =>
      ctx.db.patch(l.id, { lipstick: "rose", status: "running" }),
    );
    await f.t.mutation(internal.spaces.jobPatch, {
      lookId: l.id,
      version: l.version,
      status: "failed",
      makeupFailed: true,
      error: "No face detected in close-up",
    });
    const s = await f.giver.query(api.spaces.get, { id: f.id });
    expect(s.looks[0].status).toBe("complete");
    expect(s.looks[0].resultUrl).toBeTruthy();
    expect(s.looks[0].lipstick).toBeNull();
    expect(s.looks[0].approved).toBe(false);
  });
});

describe("interrupted email recovery", () => {
  it("allows recovering the same send after its lock and blocks retries outside the idempotency window", async () => {
    const f = await fixture("gift", "shared"),
      l = await completed(f, f.giver);
    const id = await f.giver.mutation(api.briefs.create, briefArgs(f.id, l.id));
    await f.giver.mutation(internal.briefs.claim, { id });
    await f.t.run((ctx) =>
      ctx.db.patch(id, { sendStartedAt: Date.now() - 61000 }),
    );
    expect(await f.giver.mutation(internal.briefs.claim, { id })).toBe(true);
    await f.t.run((ctx) =>
      ctx.db.patch(id, {
        sendStartedAt: Date.now() - 24 * 3600000,
        firstSendStartedAt: Date.now() - 24 * 3600000,
        status: "failed",
      }),
    );
    await expect(
      f.giver.mutation(internal.briefs.claim, { id }),
    ).rejects.toThrow(/retry window/);
  });
  it("writes reviewed preferences and their history atomically and rejects a duplicate stale save", async () => {
    const f = await fixture("self");
    const s = await f.giver.query(api.spaces.get, { id: f.id });
    await f.giver.mutation(api.spaces.update, {
      id: f.id,
      version: s.preferenceVersion,
      preferences: "Gentle colours",
    });
    await expect(
      f.giver.mutation(api.spaces.update, {
        id: f.id,
        version: s.preferenceVersion,
        preferences: "Duplicate",
      }),
    ).rejects.toThrow();
    const next = await f.giver.query(api.spaces.get, { id: f.id });
    expect(next.preferences).toBe("Gentle colours");
    expect(
      next.messages.filter(
        (m) => m.text === "Reviewed preference: Gentle colours",
      ),
    ).toHaveLength(1);
  });
});

describe("destination administration", () => {
  it("does not grant administration to ordinary signup accounts", async () => {
    const f = await fixture();
    expect((await f.giver.query(api.identity.current, {}))?.role).toBe(
      "member",
    );
    await expect(f.giver.query(api.operations.overview, {})).rejects.toThrow();
    await expect(
      f.giver.query(api.administration.members, {
        paginationOpts: { cursor: null, numItems: 10 },
      }),
    ).rejects.toThrow();
  });
  it("requires explicit operator bootstrap and does not permit a second owner bootstrap", async () => {
    const f = await fixture();
    await f.t.mutation(internal.administration.bootstrapOwner, {
      userId: f.ids.owner,
    });
    expect((await f.giver.query(api.operations.overview, {})).spaces).toBe(1);
    await expect(
      f.t.mutation(internal.administration.bootstrapOwner, {
        userId: f.ids.other,
      }),
    ).rejects.toThrow();
  });
});

describe("recipient withdrawal", () => {
  it("does not reopen giver photo access after a recipient deletes a replacement", async () => {
    const f = await fixture("gift", "shared");
    await f.giver.mutation(api.spaces.photo, {
      id: f.id,
      demo: true,
      consent: true,
    });
    await f.recipient.mutation(api.spaces.photo, {
      id: f.id,
      demo: true,
      consent: true,
    });
    await f.recipient.mutation(api.spaces.deletePhoto, { id: f.id });
    expect((await f.giver.query(api.spaces.get, { id: f.id })).canPreview).toBe(
      false,
    );
    await expect(
      f.giver.mutation(api.spaces.uploadUrl, { id: f.id }),
    ).rejects.toThrow();
    await f.recipient.mutation(api.spaces.photo, {
      id: f.id,
      demo: true,
      consent: true,
    });
    expect(
      (await f.recipient.query(api.spaces.get, { id: f.id })).hasPhoto,
    ).toBe(true);
  });
});

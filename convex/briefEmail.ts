"use node";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
function escape(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export const send = action({
  args: { id: v.id("briefs"), confirmed: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { id, confirmed }) => {
    if (!confirmed)
      throw new ConvexError(
        "Review and confirm the recipient, message and images before sending.",
      );
    const key = process.env.RESEND_API_KEY,
      from = process.env.RESEND_FROM,
      site = process.env.SITE_URL;
    if (!key || !from || !site)
      throw new ConvexError("Gift Brief email is not configured yet.");
    if (!(await ctx.runMutation(internal.briefs.claim, { id }))) return null;
    try {
      const b = await ctx.runQuery(internal.briefs.sendData, { id });
      const attachments: {
        filename: string;
        content: string;
        content_id: string;
      }[] = [];
      let total = 0;
      for (let i = 0; i < b.images.length; i++) {
        const image = b.images[i],
          blob = await ctx.storage.get(image.storageId);
        if (!blob || blob.size > 8 * 1024 * 1024)
          throw Error(
            "A selected preview is missing or too large to email. Create a fresh brief with fewer images.",
          );
        total += blob.size;
        if (total > 20 * 1024 * 1024)
          throw Error(
            "Choose fewer previews to keep the brief email under its size allowance.",
          );
        const ext =
          blob.type === "image/png"
            ? "png"
            : blob.type === "image/webp"
              ? "webp"
              : "jpg";
        attachments.push({
          filename: `GiftSquire-look-${i + 1}.${ext}`,
          content: Buffer.from(await blob.arrayBuffer()).toString("base64"),
          content_id: `look${i}`,
        });
      }
      await ctx.runQuery(internal.briefs.sendData, { id });
      const path = b.inviteToken
          ? `/join?token=${encodeURIComponent(b.inviteToken)}`
          : `/studio?space=${b.spaceId}`,
        url = new URL(path, site).href;
      const text = `${b.subject}\n\n${b.message}\n\n${b.images.map((i) => `${i.name}: ${i.approved ? "Recipient-approved" : "Proposed look — awaiting your review"}`).join("\n")}\n\nReview your gift choices: ${url}\n\nClothing and optional lipstick previews powered by YouCam. GiftSquire.`;
      const html = `<div style="font-family:Arial,sans-serif;max-width:620px;color:#38263c;padding:24px"><h1>GiftSquire</h1><h2>${escape(b.subject)}</h2><p style="white-space:pre-wrap">${escape(b.message)}</p>${b.images.map((image, i) => `<h3>${escape(image.name)}</h3><p>${image.approved ? "Recipient-approved" : "A proposed look, for your review"}</p><img src="cid:look${i}" alt="${escape(image.name)}" style="max-width:100%;max-height:600px"/>`).join("")}<p><a href="${escape(url)}">Review your gift choices</a></p><p>Clothing and optional lipstick previews powered by YouCam · Perfect Corp.</p></div>`;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `giftsquire-brief-${id}`,
        },
        body: JSON.stringify({
          from,
          to: [b.recipientEmail],
          subject: b.subject,
          text,
          html,
          attachments,
        }),
        signal: AbortSignal.timeout(25000),
      });
      if (!r.ok)
        throw Error(
          `Email service returned ${r.status}. Your draft is kept; retry the same brief when ready.`,
        );
      const out = await r.json();
      if (!out.id)
        throw Error(
          "Email acceptance could not be confirmed. Your draft is kept.",
        );
      await ctx.runMutation(internal.briefs.finish, { id, providerId: out.id });
    } catch (e) {
      const message =
        e instanceof Error && e.name !== "TimeoutError"
          ? e.message
          : "Email acceptance was not confirmed. Your draft is kept; retry this same brief to avoid duplicate sending.";
      await ctx.runMutation(internal.briefs.finish, { id, error: message });
      throw new ConvexError(message);
    }
    return null;
  },
});

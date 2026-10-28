import Resend from "@auth/core/providers/resend";
function code() {
  let out = "";
  while (out.length < 8) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    for (const b of bytes) {
      if (b < 250) out += String(b % 10);
      if (out.length === 8) break;
    }
  }
  return out;
}
function provider(id: string, purpose: "verification" | "reset") {
  return Resend({
    id,
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.RESEND_FROM,
    maxAge: 15 * 60,
    generateVerificationToken: async () => code(),
    async sendVerificationRequest({ identifier, token }) {
      const key = process.env.RESEND_API_KEY,
        from = process.env.RESEND_FROM;
      if (!key || !from) throw new Error("EMAIL_NOT_CONFIGURED");
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(`${id}:${identifier}:${token}`),
      );
      const requestId = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const title =
        purpose === "reset"
          ? "Reset your GiftSquire password"
          : "Verify your GiftSquire email";
      const payload = {
        from,
        to: [identifier],
        subject: title,
        text: `${title}\n\nYour code is ${token}. It expires in 15 minutes.\n\nIf you did not request this, you can ignore this email.\n\nGiftSquire`,
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;padding:32px;color:#254c3e"><h1 style="font-size:24px">GiftSquire</h1><h2 style="font-size:20px">${title}</h2><p>Use this code to continue:</p><p style="font-size:32px;letter-spacing:6px;font-weight:bold">${token}</p><p>The code expires in 15 minutes. If you didn't request this, you can ignore this email.</p></div>`,
      };
      for (let attempt = 0; attempt < 2; attempt++) {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            "Idempotency-Key": requestId,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(12000),
        });
        if (r.ok) return;
        if (attempt === 0 && (r.status === 429 || r.status >= 500)) continue;
        throw new Error("EMAIL_DELIVERY_FAILED");
      }
    },
  });
}
export const verificationEmail = provider(
  "giftsquire-email-verification",
  "verification",
);
export const resetEmail = provider("giftsquire-password-reset", "reset");

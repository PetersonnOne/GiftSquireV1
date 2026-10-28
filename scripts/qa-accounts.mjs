// Disposable destination accounts only. Credentials and session tokens never go to stdout.
import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
const vars = Object.fromEntries(
  (await readFile(".env", "utf8"))
    .split(/\r?\n/)
    .filter((s) => /^[A-Z_]+=/.test(s))
    .map((s) => {
      const i = s.indexOf("=");
      return [s.slice(0, i), s.slice(i + 1).replace(/^['"]|['"]$/g, "")];
    }),
);
const dest = await readFile(".env.local", "utf8");
if (
  !dest.includes("dev:striped-viper-361") ||
  !dest.includes("project: giftsquire")
)
  throw Error("Wrong destination");
const url = "https://striped-viper-361.convex.cloud";
let accounts;
try {
  accounts = JSON.parse(await readFile(".private/qa-accounts.json", "utf8"));
} catch {
  const base = process.env.GIFTSQUIRE_QA_EMAIL;
  if (!base || !base.includes("@"))
    throw Error(
      "Set GIFTSQUIRE_QA_EMAIL to an email you own before creating disposable QA accounts.",
    );
  const [local, domain] = base.split("@");
  accounts = ["giver", "recipient"].map((role) => ({
    role,
    email: `${local}+giftsquire-${role}-${Date.now()}@${domain}`,
    password: randomBytes(20).toString("base64url"),
  }));
  await writeFile(".private/qa-accounts.json", JSON.stringify(accounts), {
    mode: 0o600,
  });
}
const mode = process.argv[2] || "signup";
for (const account of accounts) {
  const client = new ConvexHttpClient(url);
  try {
    if (mode === "signin") {
      const result = await client.action(api.auth.signIn, {
        provider: "password",
        params: {
          flow: "signIn",
          email: account.email,
          password: account.password,
        },
      });
      account.tokens = result.tokens;
      console.log(`${account.role}: refreshed via normal password sign-in.`);
    }
    if (mode === "signup") {
      await client.action(api.auth.signIn, {
        provider: "password",
        params: {
          flow: "signUp",
          email: account.email,
          password: account.password,
          name: `GiftSquire QA ${account.role}`,
        },
      });
      console.log(`${account.role}: verification requested.`);
    }
    if (mode === "verify") {
      const list = await fetch("https://api.resend.com/emails", {
        headers: { Authorization: `Bearer ${vars.RESEND_API_KEY}` },
      });
      if (!list.ok) throw Error(`Email retrieval returned ${list.status}`);
      const mail = (await list.json()).data.find(
        (m) => m.to.includes(account.email) && m.subject.includes("GiftSquire"),
      );
      if (!mail) throw Error("Verification email not found");
      const detail = await fetch(`https://api.resend.com/emails/${mail.id}`, {
        headers: { Authorization: `Bearer ${vars.RESEND_API_KEY}` },
      });
      const payload = await detail.json();
      const code = (payload.text || payload.html || "").match(/\b\d{8}\b/)?.[0];
      if (!code) throw Error("Code not found");
      account.code = code;
      const result = await client.action(api.auth.signIn, {
        provider: "password",
        params: { flow: "email-verification", email: account.email, code },
      });
      account.tokens = result.tokens;
      console.log(
        `${account.role}: email verification completed; private QA session saved.`,
      );
    }
  } catch (e) {
    console.log(
      `${account.role}: ${String(e.message)
        .replace(/eyJ\S+/g, "[redacted]")
        .slice(0, 220)}`,
    );
    process.exitCode = 1;
  }
  await writeFile(".private/qa-accounts.json", JSON.stringify(accounts), {
    mode: 0o600,
  });
}

import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
const origin = "https://giftsquire-v1.vercel.app",
  backend = "https://tame-meerkat-333.convex.cloud";
const project = JSON.parse(await readFile(".vercel/project.json", "utf8"));
if (project.projectName !== "giftsquire-v1") throw Error("Wrong project");
if (!process.env.RESEND_API_KEY) throw Error("Missing email read credential");
let accounts;
try {
  accounts = JSON.parse(
    await readFile(".private/production-qa-accounts.json", "utf8"),
  );
} catch {
  const base = process.env.GIFTSQUIRE_QA_EMAIL;
  if (!base?.includes("@"))
    throw Error(
      "Set GIFTSQUIRE_QA_EMAIL to an address you own for production QA.",
    );
  const [local, domain] = base.split("@");
  accounts = ["giver", "recipient"].map((role) => ({
    role,
    email: `${local}+giftsquire-prod-${role}-${Date.now()}@${domain}`,
    password: randomBytes(20).toString("base64url"),
    verified: false,
  }));
}
const save = () =>
  writeFile(".private/production-qa-accounts.json", JSON.stringify(accounts), {
    mode: 0o600,
  });
await save();
await mkdir("output/playwright", { recursive: true });
async function otp(a, subject) {
  for (let n = 0; n < 10; n++) {
    const list = await fetch("https://api.resend.com/emails", {
      headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY },
      signal: AbortSignal.timeout(15000),
    });
    if (!list.ok) throw Error("Email listing unavailable");
    const row = (await list.json()).data.find(
      (m) => m.to.includes(a.email) && m.subject === subject,
    );
    if (row) {
      const r = await fetch("https://api.resend.com/emails/" + row.id, {
        headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY },
      });
      const data = await r.json();
      const code = (data.text || data.html || "").match(/\b\d{8}\b/)?.[0];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw Error("Production OTP not found");
}
const b = await chromium.launch({ headless: true, channel: "chrome" }),
  report = { at: new Date().toISOString(), origin, backend, checks: [] };
let page;
try {
  for (const a of accounts) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    page = await ctx.newPage();
    page.setDefaultTimeout(60000);
    page.on("dialog", (d) => {
      report.unexpectedDialog = true;
      void d.dismiss();
    });
    await page.goto(origin + "/sign-in", { waitUntil: "domcontentloaded" });
    if (!a.verified) {
      await page
        .getByRole("button", {
          name: "New here? Create an account",
          exact: true,
        })
        .click();
      await page
        .getByLabel("Your name", { exact: true })
        .fill("GiftSquire Production QA " + a.role);
    }
    await page.locator("input[name=email]").fill(a.email);
    await page.locator("input[name=password]").fill(a.password);
    await page.locator(".auth-form button[type=submit]").click();
    if (!a.verified) {
      await page.locator("input[name=code]").waitFor();
      const code = await otp(a, "Verify your GiftSquire email");
      await page
        .locator("input[name=code]")
        .fill(code === "00000000" ? "11111111" : "00000000");
      await page.locator(".auth-form button[type=submit]").click();
      await page.locator(".auth-form [role=alert]").waitFor();
      await page.locator("input[name=code]").fill(code);
      await page.locator(".auth-form button[type=submit]").click();
    }
    await page.waitForURL("**/account");
    a.verified = true;
    await save();
    await ctx.storageState({
      path: ".private/production-" + a.role + "-browser.json",
    });
    report.checks.push(
      a.role +
        ": real hosted signup, delivered verification OTP, invalid-code rejection and account navigation",
    );
    console.log("PASS: hosted " + a.role + " account verification/login");
    const c = new ConvexHttpClient(backend);
    a.tokens = (
      await c.action(api.auth.signIn, {
        provider: "password",
        params: { flow: "signIn", email: a.email, password: a.password },
      })
    ).tokens;
    await save();
    await ctx.close();
  }
  const a = accounts[0],
    ctx = await b.newContext({
      storageState: ".private/production-giver-browser.json",
      viewport: { width: 390, height: 844 },
    });
  page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
  for (const t of ["garden", "midnight", "dark", "white"]) {
    await page
      .getByRole("combobox", { name: "Choose appearance", exact: true })
      .selectOption(t);
    await page.waitForFunction(
      (x) => document.documentElement.dataset.theme === x,
      t,
    );
    const widths = await page.evaluate(() => ({
      w: innerWidth,
      s: document.documentElement.scrollWidth,
    }));
    if (widths.s > widths.w + 1) throw Error("Theme overflow");
  }
  report.checks.push("All four hosted mobile appearances fit 390px");
  await page.goto(origin + "/admin", { waitUntil: "domcontentloaded" });
  await page
    .getByText("Access restricted", { exact: false })
    .waitFor({ timeout: 15000 })
    .catch(() => {});
  const c = new ConvexHttpClient(backend);
  c.setAuth(a.tokens.token);
  let forbidden = false;
  try {
    await c.query(api.administration.members, {
      paginationOpts: { numItems: 1, cursor: null },
    });
  } catch {
    forbidden = true;
  }
  if (!forbidden) throw Error("QA user unexpectedly has admin access");
  report.checks.push("Production QA is not an administrator");
  await page.screenshot({
    path: "output/playwright/production-access-check.png",
    fullPage: true,
  });
  if (report.unexpectedDialog) throw Error("Unexpected beforeunload dialog");
  await writeFile(
    ".private/production-auth-acceptance.json",
    JSON.stringify(report, null, 2),
  );
  console.log("PASS: hosted themes and private administration access checks");
} catch (e) {
  if (page)
    await page.screenshot({
      path: "output/playwright/production-auth-failure.png",
      fullPage: true,
    });
  throw e;
} finally {
  await b.close();
}

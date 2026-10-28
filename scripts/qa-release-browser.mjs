import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
const qa = JSON.parse(await readFile(".private/qa-accounts.json", "utf8")),
  account = qa.find((a) => a.role === "giver");
const browser = await chromium.launch({ headless: true, channel: "chrome" }),
  ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
  page = await ctx.newPage();
page.setDefaultTimeout(45000);
const checks = [];
let unexpected = 0;
page.on("dialog", async (d) => {
  unexpected++;
  await d.dismiss();
});
const pass = (name) => {
  checks.push({ name, status: "passed" });
  console.log("PASS:", name);
};
const submit = () => page.locator(".auth-form button[type=submit]");
async function recoveredEmail() {
  for (let i = 0; i < 8; i++) {
    const r = await fetch("https://api.resend.com/emails", {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw Error("Email status unavailable");
    const mail = (await r.json()).data.find(
      (m) =>
        m.to.includes(account.email) &&
        m.subject === "Reset your GiftSquire password",
    );
    if (mail) {
      const d = await fetch(`https://api.resend.com/emails/${mail.id}`, {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      });
      const body = await d.json(),
        code = (body.text || body.html || "").match(/\b\d{8}\b/)?.[0];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw Error("QA recovery email did not arrive");
}
try {
  await page.goto("http://localhost:4327/sign-in", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill(account.email);
  await page.locator("input[name=password]").fill(account.password);
  await submit().click();
  await page.waitForURL("**/account", { timeout: 60000 });
  await page
    .getByRole("heading", { name: "Your details", exact: true })
    .waitFor();
  pass("Password login reaches the account page");
  await page.getByRole("link", { name: "Your studio", exact: true }).click();
  await page
    .getByRole("heading", { name: "Your style studio.", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("link", { name: "Sign in ↗", exact: true }).click();
  await page
    .getByRole("button", { name: "Forgot your password?", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill(account.email);
  await submit().click();
  await page
    .getByRole("textbox", { name: "New password", exact: true })
    .waitFor();
  const code = await recoveredEmail();
  const next = randomBytes(20).toString("base64url");
  account.pendingRecoveryPassword = next;
  await writeFile(".private/qa-accounts.json", JSON.stringify(qa), {
    mode: 0o600,
  });
  await page
    .getByRole("textbox", { name: "New password", exact: true })
    .fill(next);
  await page
    .getByRole("textbox", { name: "Verification code", exact: true })
    .fill(code === "00000000" ? "11111111" : "00000000");
  await submit().click();
  await page
    .getByRole("alert")
    .filter({ hasText: "The code could not be verified." })
    .waitFor();
  pass("Invalid recovery OTP is rejected without losing the form");
  if (account.code && account.code !== code) {
    await page
      .getByRole("textbox", { name: "Verification code", exact: true })
      .fill(account.code);
    await submit().click();
    await page
      .getByRole("alert")
      .filter({ hasText: "The code could not be verified." })
      .waitFor();
    pass("Old verification OTP cannot reset a password");
  }
  await page
    .getByRole("textbox", { name: "Verification code", exact: true })
    .fill(code);
  await submit().click();
  await page.waitForURL("**/account", { timeout: 60000 });
  await page
    .getByRole("heading", { name: "Your details", exact: true })
    .waitFor();
  account.password = next;
  delete account.pendingRecoveryPassword;
  await writeFile(".private/qa-accounts.json", JSON.stringify(qa), {
    mode: 0o600,
  });
  pass("Fresh Resend recovery OTP resets password and returns to account");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("link", { name: "Sign in ↗", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill(account.email);
  await page.locator("input[name=password]").fill(next);
  await submit().click();
  await page.waitForURL("**/account", { timeout: 60000 });
  pass("New password signs in after logout");
  await page.goto("http://localhost:4327/", { waitUntil: "domcontentloaded" });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ["garden", "midnight", "dark", "white"]) {
    await page
      .getByRole("combobox", { name: "Choose appearance", exact: true })
      .selectOption(theme);
    await page.waitForFunction(
      (t) => document.documentElement.dataset.theme === t,
      theme,
    );
    const dimensions = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    if (dimensions.scroll > dimensions.width + 1)
      throw Error("Horizontal overflow in " + theme);
    await page.screenshot({
      path: `output/playwright/mobile-${theme}.png`,
      fullPage: true,
    });
    pass("Mobile layout and saved " + theme + " appearance");
  }
  await page
    .getByRole("combobox", { name: "Choose appearance", exact: true })
    .selectOption("site");
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "midnight",
  );
  await page.getByRole("link", { name: "Your studio", exact: true }).click();
  await page.getByRole("button", { name: "✎ User Mode", exact: true }).click();
  if (
    (await page
      .getByRole("button", { name: "✎ User Mode", exact: true })
      .getAttribute("aria-pressed")) !== "true"
  )
    throw Error("Mode pressed state missing");
  await page
    .getByRole("button", {
      name: "✧ For myself A look that feels like me.",
      exact: true,
    })
    .click()
    .catch(async () => {
      await page
        .getByRole("button")
        .filter({ hasText: "For myself" })
        .first()
        .click();
    });
  pass("User Mode exposes selected state to assistive technology");
  await page.screenshot({
    path: "output/playwright/mobile-studio.png",
    fullPage: true,
  });
  const size = await page.evaluate(() => ({
    w: innerWidth,
    s: document.documentElement.scrollWidth,
  }));
  if (size.s > size.w + 1) throw Error("Studio has horizontal overflow");
  pass("Mobile studio layout");
  if (unexpected) throw Error("Unexpected browser navigation dialog");
  pass("No beforeunload warning during login, reset, logout or navigation");
  const c = new ConvexHttpClient("https://striped-viper-361.convex.cloud");
  const result = await c.action(api.auth.signIn, {
    provider: "password",
    params: {
      flow: "signIn",
      email: account.email,
      password: account.password,
    },
  });
  account.tokens = result.tokens;
  await writeFile(".private/qa-accounts.json", JSON.stringify(qa), {
    mode: 0o600,
  });
  await ctx.storageState({ path: ".private/giver-browser-state.json" });
} catch (e) {
  checks.push({
    name: "Release browser acceptance",
    status: "failed",
    error: e.message,
  });
  console.error(e.message);
  process.exitCode = 1;
  await page
    .screenshot({
      path: "output/playwright/release-failure.png",
      timeout: 15000,
    })
    .catch(() => {});
} finally {
  await writeFile(
    ".private/release-browser-acceptance.json",
    JSON.stringify({ date: new Date().toISOString(), checks }, null, 2),
  );
  await browser.close();
}

import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
const qa = JSON.parse(await readFile(".private/qa-accounts.json", "utf8")),
  a = qa.find((a) => a.role === "giver"),
  c = new ConvexHttpClient("https://striped-viper-361.convex.cloud");
c.setAuth(a.tokens.token);
const viewer = await c.query(api.identity.current, {});
const spaces = await c.query(api.spaces.list, {});
let fixture;
for (const item of spaces) {
  const s = await c.query(api.spaces.get, { id: item.id });
  if (
    s.journey === "gift" &&
    s.isOwner &&
    s.recipientJoined &&
    s.looks.some((l) => l.resultUrl && l.status === "complete")
  ) {
    fixture = s;
    break;
  }
}
if (!fixture) throw Error("Existing QA gift space unavailable");
const l = fixture.looks.find((l) => l.resultUrl && l.status === "complete");
const id = await c.mutation(api.briefs.create, {
  spaceId: fixture.id,
  kind: "gift",
  lookIds: [l.id],
  subject: "QA interrupted-send recovery",
  message: "Controlled QA draft. No email is sent by this test.",
  recipientEmail: qa.find((a) => a.role === "recipient").email,
});
const env = await readFile(".env.local", "utf8");
if (!env.includes("project: giftsquire") || !env.includes("striped-viper-361"))
  throw Error("Wrong deployment");
const browser = await chromium.launch({ headless: true, channel: "chrome" }),
  ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }),
  page = await ctx.newPage();
page.setDefaultTimeout(45000);
// Model a lost send acknowledgement in the browser only. No provider email is sent.
await page.routeWebSocket(
  "wss://striped-viper-361.convex.cloud/**",
  (socket) => {
    const upstream = socket.connectToServer();
    socket.onMessage((message) => upstream.send(message));
    upstream.onMessage((message) => {
      try {
        const data = JSON.parse(String(message));
        for (const mod of data.modifications ?? []) {
          if (mod.type === "QueryUpdated" && mod.value?.id === id) {
            mod.value.status = "sending";
            mod.value.sendStartedAt = Date.now();
            mod.value.firstSendStartedAt = Date.now();
          }
        }
        socket.send(JSON.stringify(data));
      } catch {
        socket.send(message);
      }
    });
  },
);
const checks = [];
let dialogs = 0;
page.on("dialog", async (d) => {
  dialogs++;
  await d.dismiss();
});
const pass = (n) => {
  checks.push({ name: n, status: "passed" });
  console.log("PASS:", n);
};
try {
  await page.goto("http://localhost:4327/sign-in", {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill(a.email);
  await page.locator("input[name=password]").fill(a.password);
  await page.locator(".auth-form button[type=submit]").click();
  await page.waitForURL("**/account");
  await page.getByRole("link", { name: "Your studio", exact: true }).click();
  await page.getByRole("button", { name: "✎ User Mode", exact: true }).click();
  if (
    (await page
      .getByRole("button", { name: "✎ User Mode", exact: true })
      .getAttribute("aria-pressed")) !== "true"
  )
    throw Error("Missing selected mode state");
  await page
    .getByRole("button")
    .filter({ hasText: "For myself" })
    .first()
    .click();
  await page
    .getByRole("textbox", { name: "Space name", exact: true })
    .fill("QA self brief options");
  await page
    .getByRole("button", { name: "Create my shopping space ↗", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "QA self brief options", exact: true })
    .waitFor();
  if (
    await page
      .getByRole("button", { name: "Gift Brief · for them", exact: true })
      .count()
  )
    throw Error("Self shopping exposes gift email option");
  pass("Self shopping shows only the private Partner Brief");
  const dim = await page.evaluate(() => ({
    w: innerWidth,
    s: document.documentElement.scrollWidth,
  }));
  if (dim.s > dim.w + 1) throw Error("Studio horizontal overflow");
  await page.screenshot({
    path: "output/playwright/mobile-studio.png",
    fullPage: true,
  });
  pass("Mobile studio fits the viewport and exposes selected mode state");
  await page
    .getByRole("link", { name: "GiftSquire THOUGHTFULLY YOURS", exact: true })
    .click();
  for (const theme of ["garden", "midnight", "dark", "white"]) {
    await page
      .getByRole("combobox", { name: "Choose appearance", exact: true })
      .selectOption(theme);
    await page.waitForFunction(
      (t) => document.documentElement.dataset.theme === t,
      theme,
    );
    const d = await page.evaluate(() => ({
      w: innerWidth,
      s: document.documentElement.scrollWidth,
    }));
    if (d.s > d.w + 1) throw Error("Theme overflows");
    await page.screenshot({
      path: `output/playwright/mobile-${theme}.png`,
      fullPage: true,
    });
    pass("Mobile " + theme + " appearance");
  }
  await page
    .getByRole("combobox", { name: "Choose appearance", exact: true })
    .selectOption("site");
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "midnight",
  );
  await page.getByRole("link", { name: "Your studio", exact: true }).click();
  await page
    .getByRole("heading", { name: "Your style studio.", exact: true })
    .waitFor();
  pass("Navigation after saving theme completes without a warning");
  await page.clock.install();
  await page.goto(`http://localhost:4327/brief?id=${id}`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator(".gs-brief-document").waitFor();
  await page.clock.fastForward(65000);
  const retry = page.getByRole("button", {
    name: "Retry sending this Gift Brief",
    exact: true,
  });
  await retry.waitFor();
  await page
    .getByRole("checkbox", {
      name: "I checked the recipient email, message and images above and want to send this Gift Brief.",
      exact: true,
    })
    .check();
  if (!(await retry.isEnabled()))
    throw Error("Interrupted send cannot be recovered");
  await page.screenshot({
    path: "output/playwright/email-recovery-control.png",
    fullPage: true,
  });
  pass("Interrupted send unlocks an explicit same-brief retry; no email sent");
  if (dialogs) throw Error("Unexpected navigation dialog");
  pass("No unwanted beforeunload dialog");
} catch (e) {
  checks.push({
    name: "Layout acceptance",
    status: "failed",
    error: e.message,
  });
  console.error(e.message);
  process.exitCode = 1;
  await page
    .screenshot({
      path: "output/playwright/layout-failure.png",
      timeout: 15000,
    })
    .catch(() => {});
} finally {
  await writeFile(
    ".private/layout-browser-acceptance.json",
    JSON.stringify({ date: new Date().toISOString(), checks }, null, 2),
  );
  await browser.close();
}

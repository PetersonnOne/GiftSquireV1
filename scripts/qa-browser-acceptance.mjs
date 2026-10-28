import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const qa = JSON.parse(await readFile(".private/qa-accounts.json", "utf8")),
  client = new ConvexHttpClient("https://striped-viper-361.convex.cloud");
client.setAuth(qa[0].tokens.token);
const all = await client.query(api.spaces.list, {}),
  self = all.find((s) => s.journey === "self");
if (!self) throw Error("Voice-created self space not found");
const browser = await chromium.launch({ headless: true, channel: "chrome" }),
  ctx = await browser.newContext({
    storageState: ".private/giver-browser-state.json",
    viewport: { width: 1440, height: 1000 },
  }),
  page = await ctx.newPage();
page.setDefaultTimeout(45000);
const report = { started: new Date().toISOString(), checks: [] };
const pass = (name, extra = {}) => {
  report.checks.push({ name, status: "passed", ...extra });
  console.log("PASS:", name);
};
page.on("dialog", (d) => {
  report.checks.push({
    name: "Unexpected dialog",
    status: "failed",
    type: d.type(),
  });
  void d.dismiss();
});
try {
  await page.goto(`http://localhost:4327/studio?space=${self.id}`, {
    timeout: 90000,
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { name: self.title, exact: true }).waitFor();
  await page.screenshot({
    path: "output/playwright/self-voice-created.png",
    fullPage: true,
  });
  const s = await client.query(api.spaces.get, { id: self.id });
  if (!s.hasPhoto) {
    await page
      .getByRole("checkbox", {
        name: "I am an adult and consent to this photo being processed by YouCam for previews. I own or have permission to use it.",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Use YouCam’s example model", exact: true })
      .click();
  }
  if (!s.looks.some((l) => l.status === "complete")) {
    await page
      .getByRole("button", { name: "Preview on me", exact: true })
      .first()
      .click();
    console.log("Waiting for the self-shopping preview.");
  }
  const current = await client.query(api.spaces.get, { id: self.id });
  if (!current.looks.some((l) => l.approved)) {
    const like = page
      .getByRole("button", { name: "♡ I like this", exact: true })
      .first();
    await like.waitFor({ timeout: 120000 });
    await like.click();
  }
  if (!current.selectedId) {
    const choose = page
      .getByRole("button", { name: "Choose this look", exact: true })
      .first();
    await choose.waitFor();
    await choose.click();
  }
  await page.locator(".gs-decision").waitFor();
  pass(
    "Interactive setup -> self-shopping preview -> approval -> saved choice",
  );
  await page
    .getByRole("button", { name: "Prepare brief for review ↗", exact: true })
    .click();
  const link = page.getByRole("link", {
    name: "Open / Print / PDF ↗",
    exact: true,
  });
  await link.waitFor();
  const briefPath = await link.getAttribute("href");
  const print = await ctx.newPage();
  await print.goto("http://localhost:4327" + briefPath, {
    timeout: 90000,
    waitUntil: "domcontentloaded",
  });
  await print.locator(".gs-brief-document").waitFor();
  await print.locator(".gs-brief-document img").first().waitFor();
  await print.emulateMedia({ media: "print" });
  await print.screenshot({
    path: "output/playwright/partner-brief-print.png",
    fullPage: true,
  });
  await print.pdf({
    path: "output/playwright/partner-brief.pdf",
    format: "A4",
    printBackground: true,
    margin: { top: "15mm", bottom: "15mm", left: "12mm", right: "12mm" },
  });
  await print.close();
  pass("Partner Brief generated and printed to PDF");
  await page.goto(
    "http://localhost:4327/studio?space=kh7dfjjxc9f6cyynfzmdyscmzs8h3z8h",
    { timeout: 90000, waitUntil: "domcontentloaded" },
  );
  await page
    .getByRole("heading", { name: "A thoughtful celebration", exact: true })
    .waitFor();
  if (await page.locator(".gs-photo-area").count())
    throw Error("Recipient original photo exposed to giver");
  await page
    .getByRole("button", { name: "Choose this look", exact: true })
    .first()
    .click();
  await page.locator(".gs-decision").waitFor();
  pass(
    "Separate recipient approval -> giver final choice; original photo hidden",
  );
  await page.goto(
    "http://localhost:4327/studio?space=kh73yvtxapqvz3faw30nmsc3k58h2389",
    { timeout: 90000, waitUntil: "domcontentloaded" },
  );
  await page
    .getByRole("heading", { name: "QA — a thoughtful birthday", exact: true })
    .waitFor();
  if ((await page.locator(".gs-lip-detail img").count()) !== 1)
    throw Error("Lipstick close-up missing");
  pass(
    "Three real shared-photo previews and separate actual lipstick close-up",
  );
  await page
    .getByRole("button", { name: "Gift Brief · for them", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Recipient’s email", exact: true })
    .fill(qa[1].email);
  await page
    .getByRole("button", { name: "Prepare brief for review ↗", exact: true })
    .click();
  await page.locator(".gs-brief-document").waitFor();
  const body = await page.locator(".gs-brief-document").innerText();
  if (/Budget:|Final choice|Style wishes:/.test(body))
    throw Error("Private planning fields exposed in Gift Brief");
  if ((await page.locator(".gs-brief-document img").count()) !== 4)
    throw Error("Gift Brief did not contain the exact selected output images");
  const send = page.getByRole("button", {
    name: "Send Gift Brief via Resend ↗",
    exact: true,
  });
  if (!(await send.isDisabled())) throw Error("Email confirmation bypassed");
  await page
    .getByRole("checkbox", {
      name: "I checked the recipient email, message and images above and want to send this Gift Brief.",
      exact: true,
    })
    .click();
  await send.click();
  await page
    .getByText("✓ Resend accepted this Gift Brief for delivery.", {
      exact: true,
    })
    .waitFor({ timeout: 90000, waitUntil: "domcontentloaded" });
  await page.screenshot({
    path: "output/playwright/gift-brief-accepted.png",
    fullPage: true,
  });
  pass(
    "Gift Brief privacy, explicit email confirmation and actual Resend acceptance",
    { images: 4 },
  );
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download actual preview ↓", exact: true })
    .first()
    .click();
  const file = await download;
  await file.saveAs("output/playwright/downloaded-actual-preview.jpg");
  pass("Actual generated image download");
  await ctx.storageState({ path: ".private/giver-browser-state.json" });
} catch (e) {
  report.checks.push({
    name: "Browser acceptance stopped",
    status: "failed",
    error: e.message,
  });
  console.error(e.message);
  process.exitCode = 1;
  await page
    .screenshot({
      path: "output/playwright/acceptance-failure.png",
      fullPage: true,
      timeout: 15000,
    })
    .catch(() => {});
} finally {
  await writeFile(
    ".private/browser-acceptance.json",
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}

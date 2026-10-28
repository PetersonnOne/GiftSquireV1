import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
const a = JSON.parse(await readFile(".private/qa-accounts.json", "utf8")).find(
  (a) => a.role === "recipient",
);
const b = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      "--autoplay-policy=no-user-gesture-required",
    ],
  }),
  ctx = await b.newContext({
    permissions: ["microphone"],
    viewport: { width: 1440, height: 1000 },
  }),
  p = await ctx.newPage();
p.setDefaultTimeout(60000);
const report = {
  at: new Date().toISOString(),
  mode: "interactive",
  freshReady: false,
  audioPlayback: false,
  reviewPrepared: false,
  setupApplied: false,
};
try {
  await p.goto("http://localhost:4327/sign-in", {
    waitUntil: "domcontentloaded",
  });
  await p
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill(a.email);
  await p.locator("input[name=password]").fill(a.password);
  await p.locator(".auth-form button[type=submit]").click();
  await p.waitForURL("**/account");
  await p.getByRole("link", { name: "Your studio", exact: true }).click();
  const v = p.locator(".voice-session:visible");
  await v.getByRole("button", { name: "Start voice", exact: true }).click();
  await p.waitForFunction(
    () =>
      document
        .querySelector(".voice-session .voice-captions")
        ?.textContent?.includes("GiftSquire"),
    null,
    { timeout: 50000 },
  );
  report.freshReady = true;
  await p.waitForFunction(
    () => {
      const a = document.querySelector(".voice-session audio");
      return a && a.readyState >= 2 && a.currentTime > 0.05 && !a.paused;
    },
    null,
    { timeout: 15000 },
  );
  report.audioPlayback = true;
  await v
    .getByLabel("Extra notes for the review", { exact: true })
    .fill(
      "I am shopping for myself. Name this space Connectivity check. Occasion is a birthday. Currency USD, budget 100. I prefer comfortable sleeves and simple colours.",
    );
  await v
    .getByRole("button", { name: "Stop voice & prepare review", exact: true })
    .click();
  await v.getByLabel("Space name", { exact: true }).waitFor();
  report.reviewPrepared = true;
  const checkbox = v.locator(".voice-review input[type=checkbox]");
  if (await checkbox.count()) await checkbox.first().check();
  await v
    .getByRole("button", {
      name: "Confirm setup & choose outfits",
      exact: true,
    })
    .click();
  await p.getByRole("button", { name: "User Mode", exact: false }).waitFor();
  report.setupApplied =
    (await p
      .getByRole("button", { name: "User Mode", exact: false })
      .getAttribute("aria-pressed")) === "true";
  if (!report.setupApplied) throw Error("Reviewed setup not applied");
  await p.screenshot({
    path: "output/playwright/interactive-connectivity-success.png",
    fullPage: true,
  });
  await writeFile(
    ".private/interactive-connectivity-success.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    "PASS: Interactive Mode fresh welcome, decoded audio playback, review preparation and confirmed setup handoff. No shopping space or render created.",
  );
} catch (e) {
  await p.screenshot({
    path: "output/playwright/interactive-connectivity-failure.png",
    fullPage: true,
  });
  await writeFile(
    ".private/interactive-connectivity-failure.json",
    JSON.stringify(report, null, 2),
  );
  throw e;
} finally {
  await b.close();
}

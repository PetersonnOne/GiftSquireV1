import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
const origin = "https://giftsquire-v1.vercel.app",
  backend = "https://tame-meerkat-333.convex.cloud",
  mode = process.argv[2] || "interactive";
if (!["interactive", "discussion"].includes(mode))
  throw Error("Choose a voice mode");
const qa = JSON.parse(
    await readFile(".private/production-qa-accounts.json", "utf8"),
  ),
  a = qa.find(
    (a) => a.role === (mode === "interactive" ? "recipient" : "giver"),
  ),
  c = new ConvexHttpClient(backend);
c.setAuth(a.tokens.token);
const report = {
  at: new Date().toISOString(),
  origin,
  backend,
  mode,
  freshReady: false,
  audioPlayback: false,
  reviewPrepared: false,
  confirmed: false,
};
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
    storageState: ".private/production-" + a.role + "-browser.json",
    permissions: ["microphone"],
    viewport: { width: 1440, height: 1000 },
  }),
  p = await ctx.newPage();
p.setDefaultTimeout(60000);
let v, s, look;
try {
  await p.goto(origin + "/studio", { waitUntil: "domcontentloaded" });
  if (mode === "discussion") {
    const f = JSON.parse(
      await readFile(".private/production-journeys.json", "utf8"),
    );
    s = await c.query(api.spaces.get, { id: f.giftId });
    look = s.looks[0];
    await p
      .locator(".gs-space-tabs button")
      .filter({ hasText: s.title })
      .click();
    const d = p.locator(".gs-discussion");
    await d
      .getByLabel("Discussion topic", { exact: false })
      .selectOption(look.id);
    await d
      .getByRole("button", { name: "Discuss with AI", exact: false })
      .click();
    v = d.locator(".voice-session:visible");
  } else {
    v = p.locator(".voice-session:visible");
  }
  await v.getByRole("button", { name: "Start voice", exact: true }).click();
  await p.waitForFunction(
    () =>
      [...document.querySelectorAll(".voice-session")].some(
        (v) =>
          !v.closest("[hidden]") &&
          v
            .querySelector(".voice-captions")
            ?.textContent?.includes("GiftSquire"),
      ),
    null,
    { timeout: 50000 },
  );
  report.freshReady = true;
  await p.waitForFunction(
    () =>
      [...document.querySelectorAll(".voice-session audio")].some(
        (a) => a.readyState >= 2 && a.currentTime > 0.05 && !a.paused,
      ),
    null,
    { timeout: 15000 },
  );
  report.audioPlayback = true;
  await v
    .getByLabel("Extra notes for the review", { exact: true })
    .fill(
      mode === "interactive"
        ? "I am shopping for myself. Name this space My production voice draft. Occasion birthday. Currency USD, budget 100. Prefer comfortable sleeves and simple colours."
        : "For this outfit only, I prefer comfortable sleeves and simple gold accessories. Preserve overall space wishes.",
    );
  await v
    .getByRole("button", { name: "Stop voice & prepare review", exact: true })
    .click();
  await v.locator(".voice-review").waitFor();
  report.reviewPrepared = true;
  const checkbox = v.locator(".voice-review input[type=checkbox]");
  if (await checkbox.count()) await checkbox.first().check();
  if (mode === "interactive") {
    await v
      .getByRole("button", {
        name: "Confirm setup & choose outfits",
        exact: true,
      })
      .click();
    await p.waitForFunction(() =>
      [...document.querySelectorAll("button")].some(
        (b) =>
          b.textContent.includes("User Mode") &&
          b.getAttribute("aria-pressed") === "true",
      ),
    );
    report.confirmed = true;
  } else {
    const expected = await v
      .getByLabel("Preference to save", { exact: false })
      .inputValue();
    await v
      .getByRole("button", { name: "Confirm & save preference", exact: true })
      .click();
    for (let i = 0; i < 15; i++) {
      const after = await c.query(api.spaces.get, { id: s.id });
      const l = after.looks.find((l) => l.id === look.id);
      if (
        l.feedbackVersion === look.feedbackVersion + 1 &&
        l.planningFeedback === expected &&
        after.preferences === s.preferences
      ) {
        report.confirmed = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!report.confirmed)
      throw Error("Reviewed note was not saved exactly to the target");
  }
  await p.screenshot({
    path: "output/playwright/production-" + mode + "-voice.png",
    fullPage: true,
  });
  await writeFile(
    ".private/production-" + mode + "-voice.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    "PASS: production " +
      mode +
      " welcome, decoded audio, review and confirmed handoff.",
  );
} catch (e) {
  await p.screenshot({
    path: "output/playwright/production-" + mode + "-voice-failure.png",
    fullPage: true,
  });
  await writeFile(
    ".private/production-" + mode + "-voice.json",
    JSON.stringify(report, null, 2),
  );
  throw e;
} finally {
  await b.close();
}

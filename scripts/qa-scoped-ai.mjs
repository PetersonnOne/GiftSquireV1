import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
const a = JSON.parse(await readFile(".private/qa-accounts.json", "utf8")).find(
    (a) => a.role === "giver",
  ),
  c = new ConvexHttpClient("https://striped-viper-361.convex.cloud");
c.setAuth(a.tokens.token);
const f = JSON.parse(await readFile(".private/qa-renders.json", "utf8"));
let s = await c.query(api.spaces.get, { id: f.spaceId });
const look = s.looks[0],
  original = s.preferences;
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
  date: new Date().toISOString(),
  targetedVoice: false,
  captionGreeting: false,
  reviewSaved: false,
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
  await p.locator(".gs-space-tabs button").filter({ hasText: s.title }).click();
  const d = p.locator(".gs-discussion");
  await d
    .getByLabel("Discussion topic", { exact: false })
    .selectOption(look.id);
  await d
    .getByLabel("Message your Style Guide", { exact: true })
    .fill(
      "For this outfit, please keep comfortable sleeves and add a preference for simple accessories.",
    );
  await d
    .getByRole("button", { name: "Send to Style Guide", exact: false })
    .click();
  await d
    .getByRole("button", { name: "Confirm & save outfit note", exact: true })
    .click();
  await p.waitForTimeout(800);
  s = await c.query(api.spaces.get, { id: f.spaceId });
  if (s.preferences !== original) throw Error("Chat changed overall wishes");
  report.targetedChat = true;
  await d
    .getByRole("button", { name: "Discuss with AI", exact: false })
    .click();
  await d.getByRole("button", { name: "Start voice", exact: true }).click();
  await p.waitForFunction(
    () =>
      document
        .querySelector(".gs-discussion .voice-captions")
        ?.textContent?.includes("GiftSquire"),
    null,
    { timeout: 50000 },
  );
  report.captionGreeting = true;
  report.targetedVoice = true;
  await d
    .getByLabel("Extra notes for the review", { exact: true })
    .fill(
      "For this outfit only, I prefer comfortable sleeves and simple gold accessories. Keep the overall style wishes unchanged.",
    );
  await d
    .getByRole("button", { name: "Stop voice & prepare review", exact: true })
    .click();
  await d.getByLabel("Preference to save", { exact: true }).waitFor();
  const confirm = d.getByRole("button", {
    name: "Confirm & save preference",
    exact: true,
  });
  const checks = d.locator(".voice-review input[type=checkbox]");
  if (await checks.count()) await checks.first().check();
  await confirm.click();
  await p.waitForTimeout(1000);
  s = await c.query(api.spaces.get, { id: f.spaceId });
  if (
    s.preferences !== original ||
    !s.looks[0].planningFeedback.toLowerCase().includes("accessor")
  )
    throw Error("Reviewed voice note not applied to selected outfit");
  report.reviewSaved = true;
  await p.screenshot({
    path: "output/playwright/scoped-ai-handoff.png",
    fullPage: true,
  });
  await writeFile(
    ".private/scoped-ai-acceptance.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    "PASS: real scoped Chat proposal and real GPT Live greeting, review, confirmation and targeted save; overall wishes unchanged.",
  );
} catch (e) {
  await p.screenshot({
    path: "output/playwright/scoped-ai-failure.png",
    fullPage: true,
  });
  throw e;
} finally {
  await b.close();
}

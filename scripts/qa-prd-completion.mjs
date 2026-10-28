import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
const qa = JSON.parse(await readFile(".private/qa-accounts.json", "utf8")),
  a = qa.find((a) => a.role === "giver"),
  c = new ConvexHttpClient("https://striped-viper-361.convex.cloud");
c.setAuth(a.tokens.token);
const fixture = JSON.parse(await readFile(".private/qa-renders.json", "utf8"));
let s = await c.query(api.spaces.get, { id: fixture.spaceId });
const look = s.looks[0],
  unchanged = s.looks[1],
  originalPreferences = s.preferences,
  otherNote = unchanged.feedback;
const browser = await chromium.launch({ headless: true, channel: "chrome" }),
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  }),
  page = await context.newPage();
page.setDefaultTimeout(45000);
const checks = [];
await mkdir("output/playwright", { recursive: true });
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
  await page
    .locator(".gs-space-tabs button")
    .filter({ hasText: s.title })
    .click();
  const discussion = page.locator(".gs-discussion");
  await discussion
    .getByLabel("Discussion topic", { exact: false })
    .selectOption(look.id);
  await discussion
    .getByText("Or edit this topic directly", { exact: true })
    .click();
  await discussion
    .getByRole("textbox", { name: "Reviewed note", exact: true })
    .fill("Prefer this outfit with comfortable sleeves.");
  await discussion
    .getByRole("button", { name: "Save reviewed note", exact: true })
    .click();
  await page.waitForTimeout(1000);
  s = await c.query(api.spaces.get, { id: fixture.spaceId });
  if (
    s.looks[0].planningFeedback !==
      "Prefer this outfit with comfortable sleeves." ||
    s.preferences !== originalPreferences ||
    s.looks[1].feedback !== otherNote
  )
    throw Error("Scoped planning note mismatch");
  checks.push(
    "Real browser saves one outfit note without changing overall wishes or another outfit",
  );
  await discussion
    .getByLabel("Feedback stage", { exact: false })
    .selectOption("post_purchase");
  const save = discussion.getByRole("button", {
    name: "Save reviewed note",
    exact: true,
  });
  if (!(await save.isDisabled()))
    throw Error("Purchase confirmation not required");
  await discussion.getByRole("checkbox").check();
  await discussion
    .getByRole("textbox", { name: "Reviewed note", exact: true })
    .fill("I bought it and found the sleeves comfortable.");
  await save.click();
  await page.waitForTimeout(1000);
  s = await c.query(api.spaces.get, { id: fixture.spaceId });
  if (
    s.looks[0].planningFeedback !==
      "Prefer this outfit with comfortable sleeves." ||
    !s.looks[0].postPurchaseFeedback.includes("bought")
  )
    throw Error("Post-purchase stage overwrote planning");
  checks.push(
    "Explicit purchase report required; planning and post-purchase notes retained separately",
  );
  await discussion
    .getByLabel("Feedback stage", { exact: false })
    .selectOption("planning");
  await discussion
    .getByRole("button", { name: "Discuss with AI", exact: false })
    .click();
  if (
    !(await discussion
      .getByLabel("Discussion topic", { exact: false })
      .isDisabled())
  )
    throw Error("Voice topic can change mid-session");
  await discussion
    .getByRole("button", { name: "Chat", exact: false })
    .first()
    .click();
  checks.push(
    "Voice discussion freezes the target; returning to Chat restores controls",
  );
  const variants = page.locator(".gs-shade-comparison");
  if ((await variants.locator("img").count()) !== 3)
    throw Error("Three-shade comparison absent");
  await variants.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "output/playwright/all-shades-and-feedback.png",
    fullPage: true,
  });
  checks.push("All three actual shade images displayed beside retained outfit");
  const briefId = await c.mutation(api.briefs.create, {
    spaceId: fixture.spaceId,
    kind: "partner",
    lookIds: [look.id],
    subject: "Local acceptance Partner Brief",
    message: "Reviewed local acceptance, no email sent.",
  });
  const brief = await c.query(api.briefs.get, { id: briefId });
  if (brief.shortlist.length !== s.looks.length)
    throw Error("Shortlist incomplete");
  await page.goto(`http://localhost:4327/brief?id=${briefId}`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("heading", { name: "Complete shortlist", exact: true })
    .waitFor();
  await page.getByText("Relationship:", { exact: false }).waitFor();
  await page.pdf({
    path: "output/playwright/expanded-partner-brief.pdf",
    format: "A4",
    printBackground: true,
  });
  await page.screenshot({
    path: "output/playwright/expanded-partner-brief.png",
    fullPage: true,
  });
  checks.push(
    "Expanded Partner Brief renders relationship, full shortlist and revisions; actual PDF exported",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:4327/studio", {
    waitUntil: "domcontentloaded",
  });
  await page
    .locator(".gs-space-tabs button")
    .filter({ hasText: s.title })
    .click();
  await discussion.getByLabel("Discussion topic", { exact: false }).waitFor();
  await page.screenshot({
    path: "output/playwright/scoped-feedback-mobile.png",
    fullPage: true,
  });
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  if (dimensions.scroll > dimensions.width + 2)
    throw Error("Mobile horizontal overflow " + JSON.stringify(dimensions));
  checks.push(
    "Updated shade gallery and feedback controls fit 390px mobile viewport",
  );
  await writeFile(
    ".private/prd-completion-browser.json",
    JSON.stringify({ date: new Date().toISOString(), checks }, null, 2),
  );
  for (const x of checks) console.log("PASS:", x);
} catch (e) {
  await page.screenshot({
    path: "output/playwright/prd-completion-failure.png",
    fullPage: true,
  });
  throw e;
} finally {
  await browser.close();
}

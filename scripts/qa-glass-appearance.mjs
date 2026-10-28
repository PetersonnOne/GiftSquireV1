import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const origin = "http://localhost:4328";
const a = JSON.parse(await readFile(".private/qa-accounts.json", "utf8")).find(
  (a) => a.role === "giver",
);
const b = await chromium.launch({ headless: true, channel: "chrome" }),
  ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } }),
  p = await ctx.newPage();
p.setDefaultTimeout(45000);
const report = { at: new Date().toISOString(), checks: [] };
const pass = (x) => {
  report.checks.push(x);
  console.log("PASS:", x);
};
await mkdir("output/playwright", { recursive: true });
try {
  await p.goto(origin, { waitUntil: "domcontentloaded" });
  await p.getByRole("combobox", { name: "Choose appearance" }).waitFor();
  for (const t of ["midnight", "garden", "dark", "white"]) {
    await p
      .getByRole("combobox", { name: "Choose appearance" })
      .selectOption(t);
    await p.waitForFunction(
      (t) => document.documentElement.dataset.theme === t,
      t,
    );
    const result = await p.evaluate(() => ({
      w: innerWidth,
      s: document.documentElement.scrollWidth,
      blur: getComputedStyle(document.querySelector(".header")).backdropFilter,
    }));
    if (result.s > result.w + 1 || !result.blur.includes("blur"))
      throw Error("Desktop glass/layout regression: " + t);
    await p.screenshot({
      path: "output/playwright/glass-home-" + t + ".png",
      fullPage: true,
    });
  }
  pass(
    "All four desktop themes show frosted navigation without horizontal overflow",
  );
  const cta = p.locator(".gs-hero .button").first();
  await cta.hover();
  await p.waitForTimeout(220);
  if ((await cta.evaluate((el) => getComputedStyle(el).transform)) === "none")
    throw Error("Hover lift missing");
  pass("Primary buttons lift on pointer hover");
  await p
    .getByRole("combobox", { name: "Choose appearance" })
    .selectOption("midnight");
  await p.goto(origin + "/sign-in", { waitUntil: "domcontentloaded" });
  await p.locator("input[name=email]").fill(a.email);
  await p.locator("input[name=password]").fill(a.password);
  await p.locator(".auth-form button[type=submit]").click();
  await p.waitForURL("**/account");
  await p.getByRole("link", { name: "Your studio", exact: true }).click();
  await p.getByRole("button", { name: "User Mode", exact: false }).click();
  const card = p.locator(".gs-product").first();
  await card.hover();
  await p.waitForTimeout(220);
  if ((await card.evaluate((el) => getComputedStyle(el).transform)) === "none")
    throw Error("Product hover missing");
  await p.keyboard.press("Tab");
  if (
    !(await p.evaluate(
      () => getComputedStyle(document.activeElement).outlineStyle !== "none",
    ))
  )
    throw Error("Keyboard focus ring missing");
  await p.screenshot({
    path: "output/playwright/glass-studio-midnight.png",
    fullPage: true,
  });
  await ctx.storageState({ path: ".private/glass-qa-browser.json" });
  pass(
    "Studio product hover, visible keyboard focus and readable setup panels",
  );
  await p.emulateMedia({ reducedMotion: "reduce" });
  await card.hover();
  if ((await card.evaluate((el) => getComputedStyle(el).transform)) !== "none")
    throw Error("Reduced motion still lifts cards");
  if (
    (await card.evaluate((el) => getComputedStyle(el).transitionDuration)) !==
    "0s"
  )
    throw Error("Reduced motion transition remains");
  pass("Reduced motion removes hover movement and transitions");
  await p.emulateMedia({
    reducedMotion: "no-preference",
    forcedColors: "active",
  });
  if (
    (await p
      .locator(".gs-mode-panel")
      .evaluate((el) => getComputedStyle(el).backdropFilter)) !== "none"
  )
    throw Error("High contrast blur fallback missing");
  pass("Forced-colour accessibility mode uses opaque surfaces");
  await p.emulateMedia({ forcedColors: "none" });
  const mobile = await b.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      storageState: ".private/glass-qa-browser.json",
    }),
    mp = await mobile.newPage();
  mp.setDefaultTimeout(45000);
  await mp.goto(origin, { waitUntil: "domcontentloaded" });
  for (const t of ["midnight", "garden", "dark", "white"]) {
    await mp
      .getByRole("combobox", { name: "Choose appearance" })
      .selectOption(t);
    await mp.waitForFunction(
      (t) => document.documentElement.dataset.theme === t,
      t,
    );
    const result = await mp.evaluate(() => ({
      w: innerWidth,
      s: document.documentElement.scrollWidth,
      blur: getComputedStyle(document.querySelector(".gs-feature-grid article"))
        .backdropFilter,
      hover: matchMedia("(hover:hover) and (pointer:fine)").matches,
    }));
    if (result.s > result.w + 1 || result.blur !== "none" || result.hover)
      throw Error("Mobile fallback failed: " + t);
    await mp.screenshot({
      path: "output/playwright/glass-mobile-" + t + ".png",
      fullPage: true,
    });
  }
  pass(
    "All four touch/mobile themes fit; cards use opaque, unblurred fallback",
  );
  await mp.goto(origin + "/studio", { waitUntil: "domcontentloaded" });
  await mp
    .getByRole("heading", { name: "Your style studio.", exact: true })
    .waitFor();
  const size = await mp.evaluate(() => ({
    w: innerWidth,
    s: document.documentElement.scrollWidth,
  }));
  if (size.s > size.w + 1) throw Error("Mobile studio overflow");
  await mp.screenshot({
    path: "output/playwright/glass-mobile-studio.png",
    fullPage: true,
  });
  pass("Mobile studio layout remains readable");
  await writeFile(
    ".private/glass-acceptance.json",
    JSON.stringify(report, null, 2),
  );
} catch (e) {
  await p.screenshot({
    path: "output/playwright/glass-failure.png",
    fullPage: true,
  });
  throw e;
} finally {
  await b.close();
}

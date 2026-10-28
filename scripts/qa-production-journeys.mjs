import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
const origin = "https://giftsquire-v1.vercel.app",
  backend = "https://tame-meerkat-333.convex.cloud";
const qa = JSON.parse(
    await readFile(".private/production-qa-accounts.json", "utf8"),
  ),
  clients = Object.fromEntries(
    qa.map((a) => {
      const c = new ConvexHttpClient(backend);
      c.setAuth(a.tokens.token);
      return [a.role, c];
    }),
  );
let state;
try {
  state = JSON.parse(
    await readFile(".private/production-journeys.json", "utf8"),
  );
} catch {
  state = { checks: [] };
}
const save = () =>
  writeFile(
    ".private/production-journeys.json",
    JSON.stringify(state, null, 2),
    { mode: 0o600 },
  );
const pass = (x) => {
  if (!state.checks.includes(x)) state.checks.push(x);
  console.log("PASS:", x);
};
const b = await chromium.launch({ headless: true, channel: "chrome" }),
  giverCtx = await b.newContext({
    storageState: ".private/production-giver-browser.json",
    viewport: { width: 1440, height: 1000 },
  }),
  recipientCtx = await b.newContext({
    storageState: ".private/production-recipient-browser.json",
    viewport: { width: 1440, height: 1000 },
  }),
  p = await giverCtx.newPage(),
  rp = await recipientCtx.newPage();
p.setDefaultTimeout(60000);
rp.setDefaultTimeout(60000);
try {
  if (!state.selfId) {
    await p.goto(origin + "/studio", { waitUntil: "domcontentloaded" });
    await p.getByRole("button", { name: "User Mode", exact: false }).click();
    await p
      .getByRole("button")
      .filter({ hasText: "For myself" })
      .first()
      .click();
    await p
      .getByLabel("Space name", { exact: true })
      .fill("Production QA self shopping");
    await p
      .getByLabel("Style wishes", { exact: false })
      .fill("Comfortable sleeves and simple colours.");
    await p
      .getByRole("button", { name: "Create my shopping space", exact: false })
      .click();
    await p
      .getByRole("heading", {
        name: "Production QA self shopping",
        exact: true,
      })
      .waitFor();
    state.selfId = (await clients.giver.query(api.spaces.list, {})).find(
      (s) => s.title === "Production QA self shopping",
    ).id;
    await save();
  }
  pass("Hosted User Mode creates a self-shopping space");
  if (!state.giftId) {
    state.giftId = await clients.giver.mutation(api.spaces.create, {
      setup: JSON.stringify({
        journey: "gift",
        title: "Production QA thoughtful gift",
        occasion: "Birthday",
        relationship: "Friend",
        currency: "USD",
        budget: 100,
        preferences: "Warm colours, comfortable clothing",
      }),
      photoPath: "shared",
      products: [
        "orange_two_piece_feminine",
        "bold_high_low_feminine",
        "denim_duo_feminine",
      ],
    });
    state.inviteToken = randomBytes(36).toString("hex");
    await clients.giver.mutation(api.spaces.invite, {
      id: state.giftId,
      token: state.inviteToken,
    });
    await save();
  }
  let s = await clients.giver.query(api.spaces.get, { id: state.giftId });
  if (!s.recipientJoined) {
    await rp.goto(origin + "/join?token=" + state.inviteToken, {
      waitUntil: "domcontentloaded",
    });
    await rp
      .getByRole("button", { name: "Accept invitation", exact: true })
      .click();
    await rp
      .getByRole("heading", {
        name: "Production QA thoughtful gift",
        exact: true,
      })
      .waitFor();
  }
  pass("Hosted invitation accepted in separate recipient browser");
  s = await clients.giver.query(api.spaces.get, { id: state.giftId });
  if (!s.hasPhoto)
    await clients.giver.mutation(api.spaces.photo, {
      id: state.giftId,
      demo: true,
      consent: true,
    });
  await p.goto(origin + "/studio?space=" + state.giftId, {
    waitUntil: "domcontentloaded",
  });
  await p
    .getByRole("heading", {
      name: "Production QA thoughtful gift",
      exact: true,
    })
    .waitFor();
  s = await clients.giver.query(api.spaces.get, { id: state.giftId });
  let look = s.looks[0];
  state.lookId = look.id;
  if (!state.renderRequested) {
    await p
      .getByRole("button", { name: "Preview on me", exact: true })
      .first()
      .click();
    state.renderRequested = true;
    await save();
    console.log("Requested one actual production YouCam outfit render.");
  }
  async function ready() {
    for (let n = 0; n < 65; n++) {
      const current = (
        await clients.giver.query(api.spaces.get, { id: state.giftId })
      ).looks.find((l) => l.id === state.lookId);
      if (current.status === "complete") return current;
      if (current.status === "failed")
        throw Error("Production render failed: " + current.error);
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw Error("Existing production render still pending; do not resubmit it");
  }
  look = await ready();
  pass("Actual production YouCam outfit completes");
  if (!state.makeupRequested) {
    await clients.giver.mutation(api.spaces.preview, {
      lookId: look.id,
      version: look.version,
      shade: "rose",
    });
    state.makeupRequested = true;
    await save();
    console.log("Requested one actual production lipstick close-up.");
  }
  look = await ready();
  if (!look.detailUrl) throw Error("Production lipstick output unavailable");
  pass("Production lipstick close-up and preserved outfit ready");
  const sourceRecipient = await clients.recipient.query(api.spaces.get, {
    id: state.giftId,
  });
  if (!sourceRecipient.canApprove)
    throw Error("Recipient approval role missing");
  await clients.recipient.mutation(api.spaces.share, {
    id: state.giftId,
    enabled: true,
  });
  let denied = false;
  try {
    await clients.giver.mutation(api.spaces.approve, {
      lookId: look.id,
      version: look.version,
      approved: true,
    });
  } catch {
    denied = true;
  }
  if (!denied) throw Error("Giver approved as recipient");
  await rp.goto(origin + "/studio?space=" + state.giftId, {
    waitUntil: "domcontentloaded",
  });
  await rp
    .getByRole("heading", {
      name: "Production QA thoughtful gift",
      exact: true,
    })
    .waitFor();
  const like = rp
    .getByRole("button", { name: "I like this", exact: false })
    .first();
  if (
    !(await clients.recipient.query(api.spaces.get, { id: state.giftId }))
      .looks[0].approved
  )
    await like.click();
  await p.goto(origin + "/studio?space=" + state.giftId, {
    waitUntil: "domcontentloaded",
  });
  const choose = p
    .getByRole("button", { name: "Choose this look", exact: true })
    .first();
  if (
    (await clients.giver.query(api.spaces.get, { id: state.giftId }))
      .selectedId !== state.lookId
  )
    await choose.click();
  await p.locator(".gs-decision").waitFor();
  s = await clients.giver.query(api.spaces.get, { id: state.giftId });
  if (s.selectedId !== state.lookId) throw Error("Final choice not saved");
  pass(
    "Recipient-only approval and giver approved-choice selection pass on hosted UI",
  );
  if (!state.partnerBriefId)
    state.partnerBriefId = await clients.giver.mutation(api.briefs.create, {
      spaceId: state.giftId,
      kind: "partner",
      lookIds: [state.lookId],
      subject: "Production QA private Partner Brief",
      message: "Production acceptance; actual generated images.",
    });
  await save();
  await p.goto(origin + "/brief?id=" + state.partnerBriefId, {
    waitUntil: "domcontentloaded",
  });
  await p
    .getByRole("heading", { name: "Complete shortlist", exact: true })
    .waitFor();
  await p.pdf({
    path: "output/playwright/production-partner-brief.pdf",
    format: "A4",
    printBackground: true,
  });
  pass("Hosted Partner Brief full shortlist and PDF export");
  if (!state.giftBriefId)
    state.giftBriefId = await clients.giver.mutation(api.briefs.create, {
      spaceId: state.giftId,
      kind: "gift",
      lookIds: [state.lookId],
      subject: "GiftSquire production QA Gift Brief",
      message:
        "Production acceptance for the account owner. Actual YouCam output.",
      recipientEmail: qa.find((a) => a.role === "recipient").email,
    });
  await save();
  const gift = await clients.giver.query(api.briefs.get, {
    id: state.giftBriefId,
  });
  if (
    gift.budget !== null ||
    gift.relationship !== null ||
    gift.shortlist.length
  )
    throw Error("Private metadata exposed in Gift Brief");
  await p.goto(origin + "/brief?id=" + state.giftBriefId, {
    waitUntil: "domcontentloaded",
  });
  await p.locator(".gs-brief-document").waitFor();
  if (gift.status !== "sent") {
    await p.getByRole("checkbox").check();
    await p
      .getByRole("button", { name: "Send Gift Brief via Resend", exact: false })
      .click();
    await p
      .getByText("Resend accepted this Gift Brief for delivery.", {
        exact: false,
      })
      .first()
      .waitFor();
  }
  pass(
    "Hosted reviewed Resend Gift Brief send accepted; private metadata excluded",
  );
  await p.screenshot({
    path: "output/playwright/production-gift-brief-sent.png",
    fullPage: true,
  });
  state.completedAt = new Date().toISOString();
  await save();
} catch (e) {
  await p.screenshot({
    path: "output/playwright/production-journey-failure.png",
    fullPage: true,
  });
  await save();
  throw e;
} finally {
  await b.close();
}

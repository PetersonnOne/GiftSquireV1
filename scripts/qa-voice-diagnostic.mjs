import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
const env = await readFile(".env.local", "utf8");
if (!env.includes("project: giftsquire") || !env.includes("striped-viper-361"))
  throw Error("Wrong project");
const a = JSON.parse(await readFile(".private/qa-accounts.json", "utf8")).find(
  (a) => a.role === "giver",
);
const c = new ConvexHttpClient("https://striped-viper-361.convex.cloud");
c.setAuth(a.tokens.token);
const f = JSON.parse(await readFile(".private/qa-renders.json", "utf8"));
const s = await c.query(api.spaces.get, { id: f.spaceId });
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
p.setDefaultTimeout(45000);
await p.addInitScript(() => {
  const Native = window.RTCPeerConnection;
  window.__gsVoiceDiagnostic = { peers: [] };
  window.RTCPeerConnection = class extends Native {
    constructor(...args) {
      super(...args);
      const row = { states: [], events: [], stats: [] };
      this.__row = row;
      window.__gsVoiceDiagnostic.peers.push(row);
      for (const e of [
        "connectionstatechange",
        "iceconnectionstatechange",
        "icegatheringstatechange",
      ])
        this.addEventListener(e, () =>
          row.states.push({
            at: Date.now(),
            event: e,
            connection: this.connectionState,
            ice: this.iceConnectionState,
            gathering: this.iceGatheringState,
          }),
        );
      const timer = setInterval(async () => {
        if (this.connectionState === "closed") {
          clearInterval(timer);
          return;
        }
        try {
          const report = await this.getStats(),
            safe = [];
          report.forEach((x) => {
            if (x.type === "candidate-pair")
              safe.push({
                type: x.type,
                state: x.state,
                nominated: x.nominated,
                bytesSent: x.bytesSent,
                bytesReceived: x.bytesReceived,
                requestsSent: x.requestsSent,
                responsesReceived: x.responsesReceived,
              });
            if (x.type === "transport")
              safe.push({
                type: x.type,
                dtlsState: x.dtlsState,
                bytesSent: x.bytesSent,
                bytesReceived: x.bytesReceived,
              });
            if (x.type === "local-candidate" || x.type === "remote-candidate")
              safe.push({
                type: x.type,
                candidateType: x.candidateType,
                protocol: x.protocol,
              });
          });
          if (safe.length) row.stats = safe;
        } catch {}
      }, 500);
    }
    createDataChannel(...args) {
      const dc = super.createDataChannel(...args);
      for (const type of ["open", "close", "error"])
        dc.addEventListener(type, () =>
          this.__row.events.push({ at: Date.now(), type: "channel." + type }),
        );
      dc.addEventListener("message", (e) => {
        try {
          const x = JSON.parse(e.data);
          this.__row.events.push({ at: Date.now(), type: x.type });
        } catch {}
      });
      return dc;
    }
    async setRemoteDescription(...args) {
      const result = await super.setRemoteDescription(...args);
      this.__row.remoteAnswerApplied = true;
      return result;
    }
  };
});
let d;
const report = {
  date: new Date().toISOString(),
  mode: "discussion",
  freshReady: false,
  greeting: false,
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
  d = p.locator(".gs-discussion");
  await d
    .getByLabel("Discussion topic", { exact: false })
    .selectOption(s.looks[0].id);
  await d
    .getByRole("button", { name: "Discuss with AI", exact: false })
    .click();
  await d.getByRole("button", { name: "Start voice", exact: true }).click();
  for (let n = 0; n < 55; n++) {
    await p.waitForTimeout(1000);
    const captions = await d.locator(".voice-captions").innerText();
    if (captions.includes("GiftSquire")) {
      report.freshReady = true;
      report.greeting = true;
      break;
    }
    if (await d.getByText("Voice could not start", { exact: true }).isVisible())
      break;
  }
  report.diagnostics = await p.evaluate(() => window.__gsVoiceDiagnostic);
  report.uiStatus = await d.locator("[role=status]").allTextContents();
  report.alerts = await d.locator("[role=alert]").allTextContents();
  await p.screenshot({
    path: "output/playwright/voice-retry-diagnostic.png",
    fullPage: true,
  });
  const stop = d.getByRole("button", { name: "Stop voice", exact: true });
  if ((await stop.count()) && !(await stop.isDisabled())) await stop.click();
  await p.waitForTimeout(1500);
  await writeFile(
    ".private/voice-retry-diagnostic.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await b.close();
}

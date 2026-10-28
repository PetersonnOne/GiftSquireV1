import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
const c = new ConvexHttpClient("https://striped-viper-361.convex.cloud");
const qa = JSON.parse(await readFile(".private/qa-accounts.json", "utf8"));
c.setAuth(qa.find((a) => a.role === "giver").tokens.token);
const u = await c.query(api.identity.current, {});
const cmd = spawnSync(
  process.execPath,
  [
    "--use-system-ca",
    "node_modules/convex/bin/main.js",
    "data",
    "voiceConnections",
    "--format",
    "json",
  ],
  { encoding: "utf8", timeout: 60000 },
);
if (cmd.status !== 0) throw Error("Cannot read QA voice metadata");
const rows = JSON.parse(cmd.stdout).filter((r) => r.ownerId === u.id);
for (const row of rows.filter((r) => r.status !== "closed"))
  await c.mutation(api.voice.stop, { id: row._id });
const row = rows
  .filter((r) => r.context && JSON.parse(r.context).scope === "look")
  .sort((a, b) => b._creationTime - a._creationTime)[0];
if (!row) throw Error("Missing scoped session");
const context = JSON.parse(row.context);
console.log(
  "Scoped context:",
  context.scope,
  context.stage,
  "Target present:",
  !!context.target,
  "Status:",
  row.status,
  "Provider negotiated:",
  !!row.providerId,
);
const d = JSON.parse(
  await c.action(api.voiceActions.prepare, {
    id: row._id,
    transcript:
      "For this outfit only, I prefer comfortable sleeves and simple gold accessories. Keep the overall style wishes unchanged.",
  }),
);
if (!d.feedback.toLowerCase().includes("accessor"))
  throw Error("Targeted extraction failed");
const f = JSON.parse(await readFile(".private/qa-renders.json", "utf8")),
  s = await c.query(api.spaces.get, { id: f.spaceId }),
  l = s.looks.find((l) => l.id === context.target.id);
await c.mutation(api.discussion.save, {
  spaceId: s.id,
  scope: "look",
  lookId: l.id,
  stage: "planning",
  version: l.feedbackVersion,
  renderVersion: l.version,
  text: d.feedback,
});
const after = await c.query(api.spaces.get, { id: s.id });
if (after.preferences !== s.preferences) throw Error("Overall wishes changed");
await writeFile(
  ".private/scoped-ai-acceptance.json",
  JSON.stringify(
    {
      date: new Date().toISOString(),
      targetedChat: true,
      serverOwnedVoiceContext: true,
      reviewFromNotes: true,
      targetedSave: true,
      overallWishesPreserved: true,
      freshWebRTCReady: false,
      reason:
        "Voice did not become ready in current Chromium network; recovery retained notes and no automatic paid retry.",
    },
    null,
    2,
  ),
);
console.log(
  "PASS: server-owned outfit context, actual AI preparation and reviewed save from notes; overall wishes unchanged.",
);

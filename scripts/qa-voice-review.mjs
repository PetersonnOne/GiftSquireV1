import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
const env = await readFile(".env.local", "utf8");
if (!env.includes("project: giftsquire") || !env.includes("striped-viper-361"))
  throw Error("Wrong destination");
const qa = JSON.parse(await readFile(".private/qa-accounts.json", "utf8")),
  c = new ConvexHttpClient("https://striped-viper-361.convex.cloud");
c.setAuth(qa[0].tokens.token);
const viewer = await c.query(api.identity.current, {});
const run = spawnSync(
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
if (run.status !== 0)
  throw Error("Could not inspect destination voice metadata");
const rows = JSON.parse(run.stdout);
const owned = rows.filter((r) => r.ownerId === viewer.id),
  active = owned.filter((r) => r.status !== "closed");
for (const r of active) await c.mutation(api.voice.stop, { id: r._id });
console.log("QA voice sessions requiring cleanup:", active.length);
const row = owned
  .filter((r) => r.mode === "discussion" && r.context)
  .sort((a, b) => b._creationTime - a._creationTime)[0];
if (!row) {
  console.log(
    "Old discussion context has expired; no new paid voice start was made.",
  );
  process.exit(0);
}
const d = JSON.parse(
  await c.action(api.voiceActions.prepare, {
    id: row._id,
    transcript:
      "I would like soft pastel colours and comfortable sleeves. Keep the existing style wishes. I also mentioned shopping for myself and renaming the space, but this is a discussion of the saved gift space.",
  }),
);
if (d.questions.some((q) => /journey|title|renam|name.*space/i.test(q)))
  throw Error("Fixed setup fields still appear as discussion questions");
await writeFile(
  ".private/voice-prompt-regression.json",
  JSON.stringify(
    {
      passed: true,
      mode: "discussion",
      questions: d.questions.length,
      preferencePresent: !!d.feedback,
      usedExistingClosedSession: true,
    },
    null,
    2,
  ),
);
console.log(
  "PASS: discussion preparation keeps fixed setup fields out of open questions; no new voice session.",
);

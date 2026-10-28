import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const state = JSON.parse(await readFile(".private/qa-renders.json", "utf8")),
  l = state.looks[0];
const run = spawnSync(
  process.execPath,
  [
    "--use-system-ca",
    "node_modules/convex/bin/main.js",
    "run",
    "spaces:job",
    JSON.stringify({ lookId: l.id, version: l.version }),
  ],
  { encoding: "utf8" },
);
if (run.status !== 0) throw Error("Could not read QA task");
const row = JSON.parse(run.stdout);
const r = await fetch(
  `https://yce-api-01.makeupar.com/s2s/v2.0/task/makeup-vto/${row.look.taskId}`,
  { headers: { Authorization: `Bearer ${process.env.YOUCAM_API_KEY}` } },
);
const body = await r.json();
await writeFile(
  ".private/youcam-makeup-diagnostic.json",
  JSON.stringify(body, null, 2),
);
console.log(JSON.stringify({ status: r.status, task: body.data }));

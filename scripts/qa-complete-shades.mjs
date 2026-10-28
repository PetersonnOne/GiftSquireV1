import { readFile, writeFile, mkdir } from "node:fs/promises";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
const dest = await readFile(".env.local", "utf8");
if (
  !dest.includes("dev:striped-viper-361") ||
  !dest.includes("project: giftsquire")
)
  throw Error("Wrong destination");
const qa = JSON.parse(await readFile(".private/qa-accounts.json", "utf8")),
  c = new ConvexHttpClient("https://striped-viper-361.convex.cloud");
c.setAuth(qa.find((a) => a.role === "giver").tokens.token);
const state = JSON.parse(await readFile(".private/qa-renders.json", "utf8")),
  id = state.spaceId;
let s = await c.query(api.spaces.get, { id }),
  lookId = s.looks[0].id;
const base = s.looks[0].resultUrl,
  results = [];
await mkdir(".private/render-evidence", { recursive: true });
for (const shade of ["berry", "coral"]) {
  let l = (await c.query(api.spaces.get, { id })).looks.find(
    (l) => l.id === lookId,
  );
  if (!l.shadePreviews.some((v) => v.shade === shade)) {
    if (l.status !== "complete")
      throw Error(
        "Wait for the existing look operation to finish before retrying",
      );
    await c.mutation(api.spaces.preview, { lookId, version: l.version, shade });
    console.log("One YouCam lipstick request submitted:", shade);
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      l = (await c.query(api.spaces.get, { id })).looks.find(
        (l) => l.id === lookId,
      );
      if (l.status === "complete" || l.status === "failed") break;
    }
  }
  const variant = l.shadePreviews.find((v) => v.shade === shade);
  if (!variant) throw Error("Lipstick preview failed: " + (l.error || shade));
  if (l.resultUrl !== base)
    throw Error("The outfit image changed during lipstick processing");
  const r = await fetch(variant.url, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw Error("Cannot retrieve shade output");
  await writeFile(
    `.private/render-evidence/${shade}-closeup.png`,
    Buffer.from(await r.arrayBuffer()),
  );
  results.push({
    shade,
    renderRevision: variant.renderRevision,
    realProviderOutput: true,
  });
  console.log(
    "PASS: actual shade close-up with original outfit retained:",
    shade,
  );
}
let l = (await c.query(api.spaces.get, { id })).looks.find(
  (l) => l.id === lookId,
);
const selected = await c.mutation(api.spaces.preview, {
  lookId,
  version: l.version,
  shade: "rose",
});
if (!selected.cached) throw Error("Ready rose shade was not reused from cache");
l = (await c.query(api.spaces.get, { id })).looks.find((l) => l.id === lookId);
if (
  l.status !== "complete" ||
  l.resultUrl !== base ||
  l.shadePreviews.length !== 3
)
  throw Error("Shade comparison state is incorrect");
await writeFile(
  ".private/all-shades-acceptance.json",
  JSON.stringify(
    {
      results,
      cachedSelection: true,
      allThreeReady: true,
      outfitRetained: true,
      spaceId: id,
      lookId,
    },
    null,
    2,
  ),
);
console.log(
  "PASS: all three shades available; cached selection did not create a paid task.",
);

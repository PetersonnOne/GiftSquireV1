import { readFile, writeFile, mkdir } from "node:fs/promises";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
const local = await readFile(".env.local", "utf8");
if (
  !local.includes("dev:striped-viper-361") ||
  !local.includes("project: giftsquire")
)
  throw Error("Destination guard failed");
const qa = JSON.parse(await readFile(".private/qa-accounts.json", "utf8"));
const client = new ConvexHttpClient("https://striped-viper-361.convex.cloud");
client.setAuth(qa[0].tokens.token);
let state;
try {
  state = JSON.parse(await readFile(".private/qa-renders.json", "utf8"));
} catch {
  state = {};
}
const mode = process.argv[2] || "status";
if (mode === "create" && !state.spaceId) {
  state.spaceId = await client.mutation(api.spaces.create, {
    setup: JSON.stringify({
      journey: "gift",
      title: "QA — a thoughtful birthday",
      occasion: "Birthday",
      relationship: "Friend",
      currency: "USD",
      budget: 100,
      preferences: "Warm colours, comfortable occasion clothing",
    }),
    photoPath: "shared",
    products: [
      "orange_two_piece_feminine",
      "bold_high_low_feminine",
      "denim_duo_feminine",
    ],
  });
  await writeFile(".private/qa-renders.json", JSON.stringify(state));
  await client.mutation(api.spaces.photo, {
    id: state.spaceId,
    demo: true,
    consent: true,
  });
  let s = await client.query(api.spaces.get, { id: state.spaceId });
  for (const l of s.looks)
    await client.mutation(api.spaces.preview, {
      lookId: l.id,
      version: l.version,
    });
  console.log(
    "Three real YouCam outfit previews requested once, using the official example photo.",
  );
}
if (!state.spaceId) throw Error("Create QA space first");
let s = await client.query(api.spaces.get, { id: state.spaceId });
if (mode === "retry") {
  for (const l of s.looks)
    if (l.status === "failed")
      await client.mutation(api.spaces.preview, {
        lookId: l.id,
        version: l.version,
      });
  console.log(
    "Retried only failed outfit previews after correcting the request schema.",
  );
}
if (mode === "makeup") {
  const l = s.looks[0];
  if (l.status !== "complete")
    throw Error("Outfit must finish before lipstick");
  if (!l.lipstick) {
    await client.mutation(api.spaces.preview, {
      lookId: l.id,
      version: l.version,
      shade: "rose",
    });
    console.log("One real lipstick preview requested on the completed outfit.");
  }
}
if (
  mode === "wait" ||
  mode === "create" ||
  mode === "makeup" ||
  mode === "retry"
) {
  for (let i = 0; i < 70; i++) {
    s = await client.query(api.spaces.get, { id: state.spaceId });
    console.log(
      s.looks
        .map(
          (l) => `${l.productId}: ${l.status}${l.error ? " — " + l.error : ""}`,
        )
        .join(" | "),
    );
    if (s.looks.every((l) => ["complete", "failed"].includes(l.status))) break;
    await new Promise((r) => setTimeout(r, 3000));
  }
}
console.log(
  JSON.stringify({
    spaceId: state.spaceId,
    looks: s.looks.map((l) => ({
      id: l.id,
      version: l.version,
      status: l.status,
      shade: l.lipstick,
      error: l.error,
    })),
  }),
);
await writeFile(
  ".private/qa-renders.json",
  JSON.stringify({ ...state, looks: s.looks }),
);
await mkdir(".private/render-evidence", { recursive: true });
for (const l of s.looks)
  if (l.resultUrl) {
    const r = await fetch(l.resultUrl, { signal: AbortSignal.timeout(20000) });
    if (r.ok)
      await writeFile(
        `.private/render-evidence/${l.productId}${l.lipstick ? "-" + l.lipstick : ""}.jpg`,
        Buffer.from(await r.arrayBuffer()),
      );
  }
await writeFile(
  ".private/qa-renders.json",
  JSON.stringify({ ...state, looks: s.looks }),
);

for (const l of s.looks)
  if (l.detailUrl) {
    const r = await fetch(l.detailUrl, { signal: AbortSignal.timeout(20000) });
    if (r.ok)
      await writeFile(
        `.private/render-evidence/${l.productId}-lipstick-closeup.png`,
        Buffer.from(await r.arrayBuffer()),
      );
    console.log("Lipstick close-up stored:", r.ok);
  }

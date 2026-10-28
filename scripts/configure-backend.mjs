import { generateKeyPair, exportPKCS8, exportJWK } from "jose";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const local = await readFile(".env.local", "utf8");
if (
  !local.includes("dev:striped-viper-361") ||
  !local.includes("project: giftsquire")
)
  throw Error("GiftSquire destination guard failed");
const env = await readFile(".env", "utf8");
const allowed = [
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "YOUCAM_API_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM",
];
const lines = env
  .split(/\r?\n/)
  .filter((line) => allowed.some((key) => line.startsWith(key + "=")));
const check = spawnSync(
  process.execPath,
  ["--use-system-ca", "node_modules/convex/bin/main.js", "env", "get", "JWKS"],
  { encoding: "utf8" },
);
if (!check.stdout.trim()) {
  const pair = await generateKeyPair("RS256", { extractable: true });
  const privateKey = (await exportPKCS8(pair.privateKey))
    .trimEnd()
    .replace(/\n/g, " ");
  lines.push(
    `JWT_PRIVATE_KEY="${privateKey}"`,
    `JWKS=${JSON.stringify({ keys: [{ use: "sig", ...(await exportJWK(pair.publicKey)) }] })}`,
  );
}
lines.push("SITE_URL=http://localhost:4327");
const file = ".private/giftsquire-backend.env";
await writeFile(file, lines.join("\n") + "\n", { mode: 0o600 });
const run = spawnSync(
  process.execPath,
  [
    "--use-system-ca",
    "node_modules/convex/bin/main.js",
    "env",
    "set",
    "--from-file",
    file,
  ],
  { encoding: "utf8" },
);
if (run.status !== 0) {
  console.log("Destination environment setup failed; secrets not printed.");
  process.exitCode = 1;
} else {
  await unlink(file);
  console.log(
    "GiftSquire backend credentials configured; temporary file removed.",
  );
}

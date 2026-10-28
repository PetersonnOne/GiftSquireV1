import { generateKeyPair, exportPKCS8, exportJWK } from "jose";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const local = await readFile(".env.local", "utf8");
if (
  !local.includes("dev:striped-viper-361") ||
  !local.includes("project: giftsquire")
)
  throw Error("GiftSquire project guard failed");
const allowed = [
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "YOUCAM_API_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM",
];
const source = await readFile(".env", "utf8");
const lines = source
  .split(/\r?\n/)
  .filter((l) => allowed.some((k) => l.startsWith(k + "=")));
for (const k of [
  "OPENAI_API_KEY",
  "YOUCAM_API_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM",
])
  if (!lines.some((l) => l.startsWith(k + "=") && l.slice(k.length + 1).trim()))
    throw Error("Missing required production setting: " + k);
const get = spawnSync(
  process.execPath,
  [
    "--use-system-ca",
    "node_modules/convex/bin/main.js",
    "env",
    "get",
    "JWKS",
    "--prod",
  ],
  { encoding: "utf8", timeout: 60000 },
);
if (
  get.status !== 0 &&
  !/not.*set|not.*found|does not exist/i.test(get.stderr + get.stdout)
)
  throw Error("Cannot inspect production signing configuration");
if (!get.stdout.trim()) {
  const pair = await generateKeyPair("RS256", { extractable: true });
  lines.push(
    'JWT_PRIVATE_KEY="' +
      (await exportPKCS8(pair.privateKey)).trimEnd().replace(/\n/g, " ") +
      '"',
    "JWKS=" +
      JSON.stringify({
        keys: [{ use: "sig", ...(await exportJWK(pair.publicKey)) }],
      }),
  );
}
lines.push("SITE_URL=https://giftsquire-v1.vercel.app");
const file = ".private/giftsquire-production-settings.env";
await writeFile(file, lines.join("\n") + "\n", { mode: 0o600 });
const run = spawnSync(
  process.execPath,
  [
    "--use-system-ca",
    "node_modules/convex/bin/main.js",
    "env",
    "set",
    "--prod",
    "--force",
    "--from-file",
    file,
  ],
  { encoding: "utf8", timeout: 60000 },
);
if (run.status !== 0)
  throw Error("Production environment setup failed; credentials not printed");
await unlink(file);
console.log(
  "GiftSquire production provider, signing and site settings configured. Development settings unchanged.",
);

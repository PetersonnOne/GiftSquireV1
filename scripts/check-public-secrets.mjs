import { readFile, readdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const lines = (await readFile(".env", "utf8")).split(/\r?\n/),
  secrets = [];
for (const line of lines) {
  const i = line.indexOf("=");
  if (i < 0 || !/(KEY|SECRET|TOKEN)$/.test(line.slice(0, i))) continue;
  const value = line
    .slice(i + 1)
    .trim()
    .replace(/^['"]|['"]$/g, "");
  if (value.length >= 16) secrets.push(value);
}
const files = new Set();
for (const args of [
  ["ls-files", "-z"],
  ["ls-files", "--others", "--exclude-standard", "-z"],
]) {
  const r = spawnSync("git", args, { encoding: "utf8" });
  if (r.status !== 0) throw Error("Cannot inventory repository");
  for (const path of r.stdout.split("\0").filter(Boolean)) files.add(path);
}
async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = path + "/" + entry.name;
    if (entry.isDirectory()) await walk(child);
    else files.add(child);
  }
}
await walk(".next/static");
let checked = 0;
for (const file of files) {
  const content = await readFile(file);
  if (secrets.some((s) => content.includes(Buffer.from(s))))
    throw Error(
      "A credential was found in a tracked candidate or public bundle. Value not printed.",
    );
  checked++;
}
console.log(
  `PASS: ${checked} repository candidates/public assets scanned; no configured provider secret found.`,
);

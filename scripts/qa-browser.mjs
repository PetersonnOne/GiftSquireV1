import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const accounts = JSON.parse(
  await readFile(".private/qa-accounts.json", "utf8"),
);
const cli =
  "C:/Users/TOSHIBA/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/@playwright/cli/playwright-cli.js";
const [mode = "signin", role = "giver", session = "giftsquire"] =
    process.argv.slice(2),
  account = accounts.find((a) => a.role === role);
let code;
if (mode === "signin")
  code = `async(page)=>{await page.getByRole('textbox',{name:'Email address',exact:true}).fill(${JSON.stringify(account.email)});await page.getByRole('textbox',{name:'Password Use 12–128 characters.'}).fill(${JSON.stringify(account.password)});await page.getByRole('button',{name:'Sign in ↗',exact:true}).click();}`;
else if (mode === "snippet")
  code = await readFile(".private/browser-snippet.js", "utf8");
else throw Error("Unknown QA operation");
const run = spawnSync(
  process.execPath,
  [cli, `-s=${session}`, "run-code", code],
  { encoding: "utf8", timeout: 90000, maxBuffer: 2 * 1024 * 1024 },
);
let output = (run.stdout || "") + (run.stderr || "");
for (const a of accounts)
  for (const value of [
    a.password,
    a.code,
    a.tokens?.token,
    a.tokens?.refreshToken,
  ])
    if (value) output = output.split(value).join("[private QA value]");
if (mode === "snippet")
  output = output.replace(
    /### Ran Playwright code[\s\S]*?### Page/,
    "### Ran private QA snippet\n### Page",
  );
await writeFile(".private/qa-browser-last.txt", output);
console.log(output.slice(-10000));
process.exitCode = run.status || 0;

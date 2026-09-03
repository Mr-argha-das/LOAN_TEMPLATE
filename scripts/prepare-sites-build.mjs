import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";

if (!existsSync(".output/server/index.mjs") || !existsSync(".output/public")) {
  throw new Error("TanStack production output is missing.");
}

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
cpSync(".output/server", "dist/server", { recursive: true });
cpSync(".output/public", "dist/client", { recursive: true });
renameSync("dist/server/index.mjs", "dist/server/index.js");

const wranglerPath = "dist/server/wrangler.json";
if (existsSync(wranglerPath)) {
  const wrangler = JSON.parse(readFileSync(wranglerPath, "utf8"));
  wrangler.main = "index.js";
  if (wrangler.assets) wrangler.assets.directory = "../client";
  writeFileSync(wranglerPath, `${JSON.stringify(wrangler, null, 2)}\n`);
}

mkdirSync("dist/.openai", { recursive: true });
cpSync(".openai/hosting.json", "dist/.openai/hosting.json");

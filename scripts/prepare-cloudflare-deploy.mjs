// Merges the D1/R2 bindings from wrangler.cloudflare.json into the Nitro-generated
// worker config so `wrangler deploy` sees env.DB and env.FILES at runtime.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const generatedPath = ".output/server/wrangler.json";
const overridesPath = "wrangler.cloudflare.json";

if (!existsSync(generatedPath)) {
  throw new Error("Run `npm run build` before preparing the Cloudflare deploy.");
}
if (!existsSync(overridesPath)) {
  throw new Error(`${overridesPath} is missing.`);
}

const generated = JSON.parse(readFileSync(generatedPath, "utf8"));
const overrides = JSON.parse(readFileSync(overridesPath, "utf8"));
delete overrides.$schema;

const databaseId = overrides.d1_databases?.[0]?.database_id;
if (!databaseId || databaseId.startsWith("REPLACE_WITH")) {
  throw new Error(
    "Set your real D1 database_id in wrangler.cloudflare.json (see: npx wrangler d1 create chola-loan-db).",
  );
}

writeFileSync(generatedPath, `${JSON.stringify({ ...generated, ...overrides }, null, 2)}\n`);
console.log(`Cloudflare config ready: ${generatedPath}`);
console.log(`  worker : ${overrides.name}`);
console.log(`  D1     : ${overrides.d1_databases[0].database_name} -> env.DB`);
console.log(`  R2     : ${overrides.r2_buckets[0].bucket_name} -> env.FILES`);

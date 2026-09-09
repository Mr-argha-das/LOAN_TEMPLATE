// Applies every drizzle/*.sql migration to the remote D1 database, in order.
// Re-running is safe to attempt: already-applied ALTERs fail with "duplicate column",
// which is reported and skipped.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

const overrides = JSON.parse(readFileSync("wrangler.cloudflare.json", "utf8"));
const database = overrides.d1_databases?.[0]?.database_name;
if (!database) throw new Error("No D1 database_name in wrangler.cloudflare.json.");

const remote = process.argv.includes("--local") ? "--local" : "--remote";
const files = readdirSync("drizzle")
  .filter((name) => name.endsWith(".sql"))
  .sort();

for (const file of files) {
  process.stdout.write(`Applying drizzle/${file} … `);
  try {
    execFileSync(
      "npx",
      ["wrangler", "d1", "execute", database, remote, "--yes", "--file", `drizzle/${file}`],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    console.log("done");
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    if (/duplicate column|already exists/i.test(output)) {
      console.log("already applied, skipped");
    } else {
      console.log("failed");
      console.error(output);
      process.exit(1);
    }
  }
}
console.log(`All migrations applied to ${database}.`);

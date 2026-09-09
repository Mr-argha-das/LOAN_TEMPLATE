// Self-hosting adapter: provides the same `DB` (D1-shaped) and `FILES` (R2-shaped)
// bindings the Cloudflare Worker gets, backed by node:sqlite and the local disk.
// Enabled by setting DATA_DIR when running the Node build on your own server.

type NodeEnv = {
  DB: unknown;
  FILES: unknown;
  ADMIN_PASSWORD?: string;
};

let cached: Promise<NodeEnv | undefined> | undefined;

async function build(): Promise<NodeEnv | undefined> {
  const dataDir = process.env["DATA_DIR"];
  if (!dataDir) return undefined;

  const { DatabaseSync } = await import("node:sqlite");
  const { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync, rmSync } =
    await import("node:fs");
  const { join, dirname } = await import("node:path");

  const filesDir = join(dataDir, "files");
  mkdirSync(filesDir, { recursive: true });

  const database = new DatabaseSync(join(dataDir, "loan.db"));
  database.exec("PRAGMA journal_mode = WAL");

  // Apply every drizzle migration once; already-applied ALTERs are ignored.
  const migrationsDir = join(process.cwd(), "drizzle");
  if (existsSync(migrationsDir)) {
    for (const file of readdirSync(migrationsDir)
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      const sql = readFileSync(join(migrationsDir, file), "utf8");
      for (const statement of sql.split("--> statement-breakpoint")) {
        const trimmed = statement.trim();
        if (!trimmed) continue;
        try {
          database.exec(trimmed);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!/duplicate column|already exists/i.test(message)) throw error;
        }
      }
    }
  }

  const DB = {
    prepare(sql: string) {
      const statement = database.prepare(sql);
      let values: unknown[] = [];
      const api = {
        bind(...args: unknown[]) {
          values = args;
          return api;
        },
        async first<T>() {
          return (statement.get(...(values as never[])) ?? null) as T | null;
        },
        async all<T>() {
          return { results: statement.all(...(values as never[])) as T[] };
        },
        async run() {
          return statement.run(...(values as never[]));
        },
      };
      return api;
    },
  };

  const safePath = (key: string) => join(filesDir, `${key.replace(/[^\w/.-]/g, "_")}.bin`);
  const metaPath = (key: string) => `${safePath(key)}.json`;

  const FILES = {
    async put(
      key: string,
      value: ArrayBuffer,
      options?: { httpMetadata?: { contentType?: string } },
    ) {
      const target = safePath(key);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, Buffer.from(value));
      writeFileSync(
        metaPath(key),
        JSON.stringify({ contentType: options?.httpMetadata?.contentType ?? "" }),
      );
    },
    async get(key: string) {
      const target = safePath(key);
      if (!existsSync(target)) return null;
      const body = readFileSync(target);
      let contentType = "";
      try {
        contentType = (JSON.parse(readFileSync(metaPath(key), "utf8")) as { contentType?: string })
          .contentType!;
      } catch {
        contentType = "";
      }
      return {
        body: new Blob([body]).stream(),
        httpMetadata: { contentType },
      };
    },
    async delete(key: string) {
      rmSync(safePath(key), { force: true });
      rmSync(metaPath(key), { force: true });
    },
  };

  const adminPassword = process.env["ADMIN_PASSWORD"];
  return { DB, FILES, ...(adminPassword ? { ADMIN_PASSWORD: adminPassword } : {}) };
}

export function getSelfHostEnv(): Promise<NodeEnv | undefined> {
  if (!cached) cached = build();
  return cached;
}

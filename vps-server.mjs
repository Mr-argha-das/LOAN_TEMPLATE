/**
 * VPS production server for the Loan app (plain Node.js, no Cloudflare needed).
 *
 * Ye built app (`.output/`) ko VPS/shared Node hosting par chalata hai:
 *  - D1 database  -> local SQLite file  (vps-data/app.db)
 *  - R2 bucket    -> local disk folder   (vps-data/files/)
 *  - ADMIN_PASSWORD -> environment variable / .env file se
 *
 * Chalane ke steps:
 *   1. npm install
 *   2. npm run build
 *   3. ADMIN_PASSWORD=apna-mazboot-password node ./vps-server.mjs
 *      (ya .env file me ADMIN_PASSWORD=... likh kar sirf `node ./vps-server.mjs`)
 *
 * Node.js 22.13+ chahiye (node:sqlite built-in use hota hai).
 */

import http from "node:http";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(ROOT, ".output");
const PUBLIC_DIR = join(OUTPUT_DIR, "public");
const WORKER_ENTRY = join(OUTPUT_DIR, "server", "index.mjs");

// ---------------------------------------------------------------------------
// .env file support (koi dependency nahi chahiye)
// ---------------------------------------------------------------------------
function loadDotEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const rawLine of readFileSync(envPath, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const key = line.slice(0, line.indexOf("=")).trim();
    let value = line.slice(line.indexOf("=") + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const DATA_DIR = resolve(ROOT, process.env.DATA_DIR || "vps-data");
const FILES_DIR = join(DATA_DIR, "files");
const DB_PATH = join(DATA_DIR, "app.db");

if (!ADMIN_PASSWORD) {
  console.error("");
  console.error("  ERROR: ADMIN_PASSWORD set nahi hai!");
  console.error("  Kaise set karein (koi ek tarika):");
  console.error("    1. .env file banakar usme likhein:  ADMIN_PASSWORD=apna-mazboot-password");
  console.error("    2. Ya command me:  ADMIN_PASSWORD=apna-mazboot-password node ./vps-server.mjs");
  console.error("");
  process.exit(1);
}

if (!existsSync(WORKER_ENTRY) || !existsSync(PUBLIC_DIR)) {
  console.error("");
  console.error("  ERROR: production build nahi mila (.output/ folder missing hai).");
  console.error("  Pehle ye command chalayein:  npm run build");
  console.error("");
  process.exit(1);
}

if (!Number.isFinite(PORT) || PORT <= 0) {
  console.error(`  ERROR: PORT galat hai: ${process.env.PORT}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Storage: SQLite (D1) + disk folder (R2)
// ---------------------------------------------------------------------------
mkdirSync(FILES_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS loan_applications (
    id TEXT PRIMARY KEY NOT NULL,
    answers_json TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    pan_document_key TEXT NOT NULL,
    pan_document_name TEXT NOT NULL,
    pan_document_type TEXT NOT NULL,
    aadhaar_document_key TEXT NOT NULL,
    aadhaar_document_name TEXT NOT NULL,
    aadhaar_document_type TEXT NOT NULL,
    aadhaar_front_document_key TEXT,
    aadhaar_front_document_name TEXT,
    aadhaar_front_document_type TEXT,
    aadhaar_back_document_key TEXT,
    aadhaar_back_document_name TEXT,
    aadhaar_back_document_type TEXT,
    approval_title TEXT DEFAULT '' NOT NULL,
    approval_image_key TEXT,
    approval_image_name TEXT,
    approval_image_type TEXT,
    created_at TEXT NOT NULL,
    reviewed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_loan_applications_status_created
    ON loan_applications (status, created_at);
`);

// D1-compatible shim (app sirf prepare/bind/first/all/run use karta hai)
function createD1Shim(database) {
  return {
    prepare(sql) {
      const stmt = database.prepare(sql);
      let values = [];
      const statement = {
        bind(...params) {
          values = params;
          return statement;
        },
        first() {
          return Promise.resolve(stmt.get(...values) ?? null);
        },
        all() {
          return Promise.resolve({ results: stmt.all(...values) });
        },
        run() {
          stmt.run(...values);
          return Promise.resolve({});
        },
      };
      return statement;
    },
  };
}

function safeFilePath(key) {
  const normalized = normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = join(FILES_DIR, normalized);
  if (!full.startsWith(FILES_DIR + sep) && full !== FILES_DIR) {
    throw new Error("Invalid file key.");
  }
  return full;
}

// R2-compatible shim (app sirf put/get/delete use karta hai)
function createR2Shim() {
  return {
    put(key, value, options) {
      const full = safeFilePath(key);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, Buffer.from(value));
      writeFileSync(
        `${full}.meta.json`,
        JSON.stringify({ contentType: options?.httpMetadata?.contentType || "" }),
      );
      return Promise.resolve({});
    },
    get(key) {
      const full = safeFilePath(key);
      if (!existsSync(full)) return Promise.resolve(null);
      const bytes = readFileSync(full);
      let contentType;
      try {
        const meta = JSON.parse(readFileSync(`${full}.meta.json`, "utf8"));
        if (meta.contentType) contentType = meta.contentType;
      } catch {
        // meta file na mile to default chalega
      }
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(bytes));
          controller.close();
        },
      });
      return Promise.resolve({ body, httpMetadata: { contentType } });
    },
    delete(key) {
      rmSync(safeFilePath(key), { force: true });
      rmSync(`${safeFilePath(key)}.meta.json`, { force: true });
      return Promise.resolve();
    },
  };
}

const runtimeEnv = {
  DB: createD1Shim(db),
  FILES: createR2Shim(),
  ADMIN_PASSWORD,
};

// ---------------------------------------------------------------------------
// Static files (.output/public)
// ---------------------------------------------------------------------------
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/vnd.microsoft.icon",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function tryServeStatic(pathname, res) {
  try {
    const decoded = decodeURIComponent(pathname);
    const full = normalize(join(PUBLIC_DIR, decoded));
    if (!full.startsWith(PUBLIC_DIR + sep) && full !== PUBLIC_DIR) return false;
    if (!existsSync(full) || !statSync(full).isFile()) return false;
    const ext = extname(full).toLowerCase();
    res.writeHead(200, {
      "content-type": CONTENT_TYPES[ext] || "application/octet-stream",
      "cache-control": decoded.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600",
    });
    createReadStream(full).pipe(res);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Worker (built app) ko load karo
// ---------------------------------------------------------------------------
const worker = await import(WORKER_ENTRY).then((m) => m.default || m);
if (!worker || typeof worker.fetch !== "function") {
  console.error("  ERROR: built worker me fetch() handler nahi mila.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// HTTP server: Node request -> Web Request -> worker -> Node response
// ---------------------------------------------------------------------------
function readBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolveBody(Buffer.concat(chunks)));
    req.on("error", rejectBody);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || `127.0.0.1:${PORT}`;
    const pathname = (req.url || "/").split("?")[0];

    // 1. Static file (JS/CSS/images) seedha disk se do — ye sabse tez hai
    if ((req.method === "GET" || req.method === "HEAD") && tryServeStatic(pathname, res)) {
      return;
    }

    // 2. Baaki sab (pages + /api/*) built app worker ko forward karo
    const url = `http://${host}${req.url || "/"}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }

    let body;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await readBody(req);
    }

    const request = new Request(url, {
      method: req.method,
      headers,
      body: body && body.length > 0 ? body : undefined,
      duplex: "half",
    });

    // Cloudflare-style context (worker andar waitUntil expect karta hai)
    const workerContext = {
      waitUntil(promise) {
        Promise.resolve(promise).catch(() => {});
      },
      passThroughOnException() {},
    };

    const response = await worker.fetch(request, runtimeEnv, workerContext);

    const outHeaders = {};
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") return; // neeche alag se handle
      outHeaders[key] = value;
    });
    const setCookie = response.headers.getSetCookie?.();
    if (setCookie && setCookie.length > 0) outHeaders["set-cookie"] = setCookie;

    const bytes = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, outHeaders);
    res.end(bytes);
  } catch (error) {
    console.error("Request failed:", error);
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "application/json" });
    }
    res.end(JSON.stringify({ error: "The request could not be completed." }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("  Loan app chal rahi hai (VPS production server)");
  console.log(`  - Site : http://localhost:${PORT}/`);
  console.log(`  - Admin: http://localhost:${PORT}/admin`);
  console.log(`  - Data : ${DATA_DIR}  (SQLite + uploaded files, server restart par safe)`);
  console.log("  - Admin password: ADMIN_PASSWORD env variable se (code me kahin nahi likha)");
  console.log("");
});

import type {
  ApplicationStatus,
  LoanApplication,
  LoanApplicationAnswers,
  StoredDocument,
} from "./loan-applications";

type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<{ results: T[] }>;
  run: () => Promise<unknown>;
};

type D1Database = {
  prepare: (sql: string) => D1Statement;
};

type R2ObjectBody = {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
};

type R2Bucket = {
  put: (
    key: string,
    value: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } },
  ) => Promise<unknown>;
  get: (key: string) => Promise<R2ObjectBody | null>;
  delete: (key: string) => Promise<void>;
};

type RuntimeEnv = {
  DB?: D1Database;
  FILES?: R2Bucket;
  ADMIN_PASSWORD?: string;
};

type ApplicationRow = {
  id: string;
  answers_json: string;
  status: "pending" | "approved";
  pan_document_key: string;
  pan_document_name: string;
  pan_document_type: string;
  aadhaar_document_key: string;
  aadhaar_document_name: string;
  aadhaar_document_type: string;
  aadhaar_front_document_key: string | null;
  aadhaar_front_document_name: string | null;
  aadhaar_front_document_type: string | null;
  aadhaar_back_document_key: string | null;
  aadhaar_back_document_name: string | null;
  aadhaar_back_document_type: string | null;
  approval_title: string;
  approval_image_key: string | null;
  approval_image_name: string | null;
  approval_image_type: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type LocalFile = { body: ArrayBuffer; type: string };

const localApplications: ApplicationRow[] = [];
const localFiles = new Map<string, LocalFile>();
const MAX_UPLOAD_BYTES = 900_000;
const DOCUMENT_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ADMIN_COOKIE = "chola_admin_session";
const LOCAL_ADMIN_PASSWORD = "admin123";

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function json(value: unknown, status = 200, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("cache-control", "no-store");
  return Response.json(value, {
    status,
    headers: responseHeaders,
  });
}

function isLocalRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
}

function getEnv(value: unknown): RuntimeEnv {
  return value && typeof value === "object" ? (value as RuntimeEnv) : {};
}

function requireStorage(request: Request, env: RuntimeEnv) {
  if (env.DB && env.FILES) return "durable" as const;
  if (isLocalRequest(request)) return "local" as const;
  throw new HttpError(503, "Application storage is not configured.");
}

function requireText(value: FormDataEntryValue | null, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `${label} is required.`);
  }
  return value.trim();
}

function requireUpload(value: FormDataEntryValue | null, types: Set<string>, label: string) {
  if (!(value instanceof File) || value.size === 0) {
    throw new HttpError(400, `${label} is required.`);
  }
  if (!types.has(value.type)) throw new HttpError(400, `${label} file type is not supported.`);
  if (value.size > MAX_UPLOAD_BYTES) {
    throw new HttpError(400, `${label} must be 900 KB or less.`);
  }
  return value;
}

function parseAnswers(value: FormDataEntryValue | null): LoanApplicationAnswers {
  if (typeof value !== "string") throw new HttpError(400, "Application details are required.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new HttpError(400, "Application details are invalid.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new HttpError(400, "Application details are invalid.");
  }

  const answers = parsed as Partial<LoanApplicationAnswers>;
  const required: Array<keyof LoanApplicationAnswers> = [
    "loanType",
    "occupation",
    "company",
    "firstName",
    "lastName",
    "state",
    "city",
    "pincode",
    "gender",
    "dob",
    "pan",
    "income",
    "sector",
    "netBanking",
  ];
  for (const field of required) {
    if (typeof answers[field] !== "string" || !answers[field].trim()) {
      throw new HttpError(400, `Missing application field: ${field}.`);
    }
  }
  if (!/^\d{6}$/.test(answers.pincode!)) throw new HttpError(400, "Pincode is invalid.");
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(answers.pan!)) throw new HttpError(400, "PAN is invalid.");
  return answers as LoanApplicationAnswers;
}

async function putFile(mode: "durable" | "local", env: RuntimeEnv, key: string, file: File) {
  const body = await file.arrayBuffer();
  if (mode === "durable") {
    await env.FILES!.put(key, body, { httpMetadata: { contentType: file.type } });
  } else {
    localFiles.set(key, { body, type: file.type });
  }
}

async function deleteFile(mode: "durable" | "local", env: RuntimeEnv, key: string) {
  if (mode === "durable") await env.FILES!.delete(key);
  else localFiles.delete(key);
}

async function insertApplication(mode: "durable" | "local", env: RuntimeEnv, row: ApplicationRow) {
  if (mode === "local") {
    localApplications.unshift(row);
    return;
  }
  await env
    .DB!.prepare(
      `INSERT INTO loan_applications (
        id, answers_json, status,
        pan_document_key, pan_document_name, pan_document_type,
        aadhaar_document_key, aadhaar_document_name, aadhaar_document_type,
        aadhaar_front_document_key, aadhaar_front_document_name, aadhaar_front_document_type,
        aadhaar_back_document_key, aadhaar_back_document_name, aadhaar_back_document_type,
        approval_title, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.answers_json,
      row.status,
      row.pan_document_key,
      row.pan_document_name,
      row.pan_document_type,
      row.aadhaar_document_key,
      row.aadhaar_document_name,
      row.aadhaar_document_type,
      row.aadhaar_front_document_key,
      row.aadhaar_front_document_name,
      row.aadhaar_front_document_type,
      row.aadhaar_back_document_key,
      row.aadhaar_back_document_name,
      row.aadhaar_back_document_type,
      row.approval_title,
      row.created_at,
    )
    .run();
}

async function getApplication(
  mode: "durable" | "local",
  env: RuntimeEnv,
  id: string,
): Promise<ApplicationRow | null> {
  if (mode === "local") return localApplications.find((row) => row.id === id) ?? null;
  return env
    .DB!.prepare("SELECT * FROM loan_applications WHERE id = ?")
    .bind(id)
    .first<ApplicationRow>();
}

async function getApplications(
  mode: "durable" | "local",
  env: RuntimeEnv,
): Promise<ApplicationRow[]> {
  if (mode === "local") return [...localApplications];
  const result = await env
    .DB!.prepare("SELECT * FROM loan_applications ORDER BY created_at DESC")
    .all<ApplicationRow>();
  return result.results;
}

async function updateApproval(mode: "durable" | "local", env: RuntimeEnv, row: ApplicationRow) {
  if (mode === "local") {
    const index = localApplications.findIndex((application) => application.id === row.id);
    if (index >= 0) localApplications[index] = row;
    return;
  }
  await env
    .DB!.prepare(
      `UPDATE loan_applications
       SET status = 'approved', approval_title = ?, approval_image_key = ?,
           approval_image_name = ?, approval_image_type = ?, reviewed_at = ?
       WHERE id = ?`,
    )
    .bind(
      row.approval_title,
      row.approval_image_key,
      row.approval_image_name,
      row.approval_image_type,
      row.reviewed_at,
      row.id,
    )
    .run();
}

function publicStatus(row: ApplicationRow): ApplicationStatus {
  return {
    id: row.id,
    status: row.status,
    approvalTitle: row.approval_title,
    ...(row.status === "approved" && row.approval_image_key
      ? { approvalImageUrl: `/api/applications/${encodeURIComponent(row.id)}/approval-image` }
      : {}),
    createdAt: row.created_at,
    ...(row.reviewed_at ? { reviewedAt: row.reviewed_at } : {}),
  };
}

function storedDocument(
  id: string,
  kind: "pan" | "aadhaar-front" | "aadhaar-back",
  name: string,
  type: string,
) {
  return {
    name,
    type,
    url: `/api/admin/applications/${encodeURIComponent(id)}/files/${kind}`,
  } satisfies StoredDocument;
}

function adminApplication(row: ApplicationRow): LoanApplication {
  const answers = JSON.parse(row.answers_json) as LoanApplicationAnswers;
  return {
    ...answers,
    ...publicStatus(row),
    panDocument: storedDocument(row.id, "pan", row.pan_document_name, row.pan_document_type),
    aadhaarFrontDocument: storedDocument(
      row.id,
      "aadhaar-front",
      row.aadhaar_front_document_name ?? row.aadhaar_document_name,
      row.aadhaar_front_document_type ?? row.aadhaar_document_type,
    ),
    ...(row.aadhaar_back_document_name && row.aadhaar_back_document_type
      ? {
          aadhaarBackDocument: storedDocument(
            row.id,
            "aadhaar-back",
            row.aadhaar_back_document_name,
            row.aadhaar_back_document_type,
          ),
        }
      : {}),
    ...(row.approval_image_key && row.approval_image_name && row.approval_image_type
      ? {
          approvalImage: {
            name: row.approval_image_name,
            type: row.approval_image_type,
            url: `/api/admin/applications/${encodeURIComponent(row.id)}/files/approval`,
          },
        }
      : {}),
  };
}

async function sessionToken(password: string) {
  const bytes = new TextEncoder().encode(`chola-admin:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return undefined;
}

async function requireAdmin(request: Request, env: RuntimeEnv) {
  const password = env.ADMIN_PASSWORD ?? (isLocalRequest(request) ? LOCAL_ADMIN_PASSWORD : "");
  if (!password) throw new HttpError(503, "Admin access is not configured.");
  const supplied = cookieValue(request, ADMIN_COOKIE);
  if (!supplied || supplied !== (await sessionToken(password))) {
    throw new HttpError(401, "Admin sign-in required.");
  }
}

async function serveFile(
  mode: "durable" | "local",
  env: RuntimeEnv,
  key: string,
  type: string,
  name: string,
) {
  if (mode === "local") {
    const object = localFiles.get(key);
    if (!object) throw new HttpError(404, "File not found.");
    return new Response(object.body, {
      headers: {
        "content-type": object.type,
        "content-disposition": `inline; filename="${name.replace(/["\\]/g, "")}"`,
        "cache-control": "private, no-store",
      },
    });
  }
  const object = await env.FILES!.get(key);
  if (!object) throw new HttpError(404, "File not found.");
  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? type,
      "content-disposition": `inline; filename="${name.replace(/["\\]/g, "")}"`,
      "cache-control": "private, no-store",
    },
  });
}

async function handleCreateApplication(request: Request, env: RuntimeEnv) {
  const mode = requireStorage(request, env);
  const form = await request.formData();
  const answers = parseAnswers(form.get("answers"));
  const pan = requireUpload(form.get("panDocument"), DOCUMENT_TYPES, "PAN document");
  const aadhaarFront = requireUpload(
    form.get("aadhaarFrontDocument"),
    DOCUMENT_TYPES,
    "Aadhaar front document",
  );
  const aadhaarBack = requireUpload(
    form.get("aadhaarBackDocument"),
    DOCUMENT_TYPES,
    "Aadhaar back document",
  );
  const id = crypto.randomUUID();
  const panKey = `applications/${id}/pan`;
  const aadhaarFrontKey = `applications/${id}/aadhaar-front`;
  const aadhaarBackKey = `applications/${id}/aadhaar-back`;
  const createdAt = new Date().toISOString();
  const row: ApplicationRow = {
    id,
    answers_json: JSON.stringify(answers),
    status: "pending",
    pan_document_key: panKey,
    pan_document_name: pan.name,
    pan_document_type: pan.type,
    // Legacy fields remain populated for applications created before this update.
    aadhaar_document_key: aadhaarFrontKey,
    aadhaar_document_name: aadhaarFront.name,
    aadhaar_document_type: aadhaarFront.type,
    aadhaar_front_document_key: aadhaarFrontKey,
    aadhaar_front_document_name: aadhaarFront.name,
    aadhaar_front_document_type: aadhaarFront.type,
    aadhaar_back_document_key: aadhaarBackKey,
    aadhaar_back_document_name: aadhaarBack.name,
    aadhaar_back_document_type: aadhaarBack.type,
    approval_title: "",
    approval_image_key: null,
    approval_image_name: null,
    approval_image_type: null,
    created_at: createdAt,
    reviewed_at: null,
  };

  try {
    await putFile(mode, env, panKey, pan);
    await putFile(mode, env, aadhaarFrontKey, aadhaarFront);
    await putFile(mode, env, aadhaarBackKey, aadhaarBack);
    await insertApplication(mode, env, row);
  } catch (error) {
    await Promise.allSettled([
      deleteFile(mode, env, panKey),
      deleteFile(mode, env, aadhaarFrontKey),
      deleteFile(mode, env, aadhaarBackKey),
    ]);
    throw error;
  }
  return json(publicStatus(row), 201);
}

async function handleAdminLogin(request: Request, env: RuntimeEnv) {
  const password = env.ADMIN_PASSWORD ?? (isLocalRequest(request) ? LOCAL_ADMIN_PASSWORD : "");
  if (!password) throw new HttpError(503, "Admin access is not configured.");
  const input = (await request.json().catch(() => ({}))) as { password?: unknown };
  if (typeof input.password !== "string" || input.password !== password) {
    throw new HttpError(401, "Incorrect admin password.");
  }
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return json(
    { ok: true },
    200,
    new Headers({
      "set-cookie": `${ADMIN_COOKIE}=${await sessionToken(password)}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=28800${secure}`,
    }),
  );
}

async function handleApproval(request: Request, env: RuntimeEnv, id: string) {
  await requireAdmin(request, env);
  const mode = requireStorage(request, env);
  const existing = await getApplication(mode, env, id);
  if (!existing) throw new HttpError(404, "Application not found.");
  const form = await request.formData();
  const title = requireText(form.get("approvalTitle"), "Approval title");
  const imageValue = form.get("approvalImage");
  let imageKey = existing.approval_image_key;
  let imageName = existing.approval_image_name;
  let imageType = existing.approval_image_type;

  if (imageValue instanceof File && imageValue.size > 0) {
    const image = requireUpload(imageValue, IMAGE_TYPES, "Approval image");
    imageKey = `applications/${id}/approval`;
    imageName = image.name;
    imageType = image.type;
    await putFile(mode, env, imageKey, image);
  }
  if (!imageKey || !imageName || !imageType) {
    throw new HttpError(400, "Approval image is required.");
  }

  const updated: ApplicationRow = {
    ...existing,
    status: "approved",
    approval_title: title,
    approval_image_key: imageKey,
    approval_image_name: imageName,
    approval_image_type: imageType,
    reviewed_at: new Date().toISOString(),
  };
  await updateApproval(mode, env, updated);
  return json(adminApplication(updated));
}

export async function handleLoanApiRequest(
  request: Request,
  envValue: unknown,
): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return undefined;
  const env = getEnv(envValue);

  try {
    if (request.method === "POST" && url.pathname === "/api/applications") {
      return await handleCreateApplication(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/admin/login") {
      return await handleAdminLogin(request, env);
    }
    if (request.method === "GET" && url.pathname === "/api/admin/applications") {
      await requireAdmin(request, env);
      const mode = requireStorage(request, env);
      return json((await getApplications(mode, env)).map(adminApplication));
    }

    const approvalMatch = url.pathname.match(/^\/api\/admin\/applications\/([^/]+)\/approve$/);
    if (request.method === "POST" && approvalMatch?.[1]) {
      return await handleApproval(request, env, decodeURIComponent(approvalMatch[1]));
    }

    const adminFileMatch = url.pathname.match(
      /^\/api\/admin\/applications\/([^/]+)\/files\/(pan|aadhaar-front|aadhaar-back|approval)$/,
    );
    if (request.method === "GET" && adminFileMatch?.[1] && adminFileMatch[2]) {
      await requireAdmin(request, env);
      const mode = requireStorage(request, env);
      const id = decodeURIComponent(adminFileMatch[1]);
      const row = await getApplication(mode, env, id);
      if (!row) throw new HttpError(404, "Application not found.");
      const kind = adminFileMatch[2];
      if (kind === "pan") {
        return serveFile(
          mode,
          env,
          row.pan_document_key,
          row.pan_document_type,
          row.pan_document_name,
        );
      }
      if (kind === "aadhaar-front") {
        return serveFile(
          mode,
          env,
          row.aadhaar_front_document_key ?? row.aadhaar_document_key,
          row.aadhaar_front_document_type ?? row.aadhaar_document_type,
          row.aadhaar_front_document_name ?? row.aadhaar_document_name,
        );
      }
      if (kind === "aadhaar-back") {
        if (
          !row.aadhaar_back_document_key ||
          !row.aadhaar_back_document_type ||
          !row.aadhaar_back_document_name
        ) {
          throw new HttpError(404, "Aadhaar back document not found.");
        }
        return serveFile(
          mode,
          env,
          row.aadhaar_back_document_key,
          row.aadhaar_back_document_type,
          row.aadhaar_back_document_name,
        );
      }
      if (!row.approval_image_key || !row.approval_image_type || !row.approval_image_name) {
        throw new HttpError(404, "Approval image not found.");
      }
      return serveFile(
        mode,
        env,
        row.approval_image_key,
        row.approval_image_type,
        row.approval_image_name,
      );
    }

    const approvalImageMatch = url.pathname.match(/^\/api\/applications\/([^/]+)\/approval-image$/);
    if (request.method === "GET" && approvalImageMatch?.[1]) {
      const mode = requireStorage(request, env);
      const row = await getApplication(mode, env, decodeURIComponent(approvalImageMatch[1]));
      if (
        !row ||
        row.status !== "approved" ||
        !row.approval_image_key ||
        !row.approval_image_type ||
        !row.approval_image_name
      ) {
        throw new HttpError(404, "Approval image not found.");
      }
      return serveFile(
        mode,
        env,
        row.approval_image_key,
        row.approval_image_type,
        row.approval_image_name,
      );
    }

    const statusMatch = url.pathname.match(/^\/api\/applications\/([^/]+)$/);
    if (request.method === "GET" && statusMatch?.[1]) {
      const mode = requireStorage(request, env);
      const row = await getApplication(mode, env, decodeURIComponent(statusMatch[1]));
      if (!row) throw new HttpError(404, "Application not found.");
      return json(publicStatus(row));
    }

    return json({ error: "Not found." }, 404);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error(error);
    return json({ error: "The request could not be completed." }, 500);
  }
}

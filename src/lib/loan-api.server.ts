import type {
  ApplicationStatus,
  BankDetails,
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
  approved_amount: number | null;
  bank_details_json: string | null;
  disbursement_submitted_at: string | null;
  processing_fee_amount: number | null;
  payment_upi_id: string | null;
  payment_qr_key: string | null;
  payment_qr_name: string | null;
  payment_qr_type: string | null;
  fee_paid_marked_at: string | null;
  payment_trnx: string | null;
  loan_transferred_at: string | null;
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
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    (import.meta.env?.DEV === true && hostname.endsWith(".e2b.app"))
  );
}

function getEnv(value: unknown): RuntimeEnv {
  return value && typeof value === "object" ? (value as RuntimeEnv) : {};
}

function requireStorage(request: Request, env: RuntimeEnv) {
  if (env.DB && env.FILES) return "durable" as const;
  if (isLocalRequest(request)) return "local" as const;
  console.error("Storage bindings unavailable", {
    availableBindings: Object.keys(env),
    hasDatabase: Boolean(env.DB),
    hasFiles: Boolean(env.FILES),
  });
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
           approval_image_name = ?, approval_image_type = ?, reviewed_at = ?, approved_amount = ?
       WHERE id = ?`,
    )
    .bind(
      row.approval_title,
      row.approval_image_key,
      row.approval_image_name,
      row.approval_image_type,
      row.reviewed_at,
      row.approved_amount,
      row.id,
    )
    .run();
}

function publicStatus(row: ApplicationRow): ApplicationStatus {
  return {
    id: row.id,
    status: row.status,
    approvalTitle: row.approval_title,
    ...(row.approved_amount ? { approvedAmount: row.approved_amount } : {}),
    ...(row.disbursement_submitted_at
      ? {
          disbursementStatus: "processing" as const,
          disbursementSubmittedAt: row.disbursement_submitted_at,
          bankAccountLast4: (JSON.parse(row.bank_details_json!) as BankDetails).accountNumber.slice(
            -4,
          ),
        }
      : {}),
    ...(row.processing_fee_amount ? { processingFeeAmount: row.processing_fee_amount } : {}),
    ...(row.payment_upi_id ? { paymentUpiId: row.payment_upi_id } : {}),
    ...(row.payment_qr_key
      ? { paymentQrUrl: `/api/applications/${encodeURIComponent(row.id)}/payment-qr` }
      : {}),
    ...(row.fee_paid_marked_at ? { feePaidMarkedAt: row.fee_paid_marked_at } : {}),
    ...(row.payment_trnx ? { paymentTrnx: row.payment_trnx } : {}),
    ...(row.loan_transferred_at ? { loanTransferredAt: row.loan_transferred_at } : {}),
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
    ...(row.bank_details_json
      ? { bankDetails: JSON.parse(row.bank_details_json) as BankDetails }
      : {}),
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
    ...(row.payment_qr_key && row.payment_qr_name && row.payment_qr_type
      ? {
          paymentQr: {
            name: row.payment_qr_name,
            type: row.payment_qr_type,
            url: `/api/applications/${encodeURIComponent(row.id)}/payment-qr`,
          },
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
    approved_amount: null,
    bank_details_json: null,
    disbursement_submitted_at: null,
    processing_fee_amount: null,
    payment_upi_id: null,
    payment_qr_key: null,
    payment_qr_name: null,
    payment_qr_type: null,
    fee_paid_marked_at: null,
    payment_trnx: null,
    loan_transferred_at: null,
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
  const amount = Number(form.get("approvedAmount"));
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100_000_000) {
    throw new HttpError(400, "Enter a valid approved amount between ₹1 and ₹10,00,00,000.");
  }
  if (existing.disbursement_submitted_at) {
    throw new HttpError(409, "Approval cannot be changed after disbursement is requested.");
  }
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
    approved_amount: amount,
    approval_image_key: imageKey,
    approval_image_name: imageName,
    approval_image_type: imageType,
    reviewed_at: new Date().toISOString(),
  };
  await updateApproval(mode, env, updated);
  return json(adminApplication(updated));
}

async function handleDisbursement(request: Request, env: RuntimeEnv, id: string) {
  const mode = requireStorage(request, env);
  const row = await getApplication(mode, env, id);
  if (!row) throw new HttpError(404, "Application not found.");
  if (row.status !== "approved" || !row.approved_amount) {
    throw new HttpError(409, "An approved loan amount is required before disbursement.");
  }
  if (row.disbursement_submitted_at) return json(publicStatus(row));
  const input = (await request.json().catch(() => null)) as Partial<BankDetails> | null;
  const details: BankDetails = {
    accountHolder: typeof input?.accountHolder === "string" ? input.accountHolder.trim() : "",
    bankName: typeof input?.bankName === "string" ? input.bankName.trim() : "",
    accountNumber: typeof input?.accountNumber === "string" ? input.accountNumber.trim() : "",
    ifsc: typeof input?.ifsc === "string" ? input.ifsc.trim().toUpperCase() : "",
  };
  if (
    details.accountHolder.length < 2 ||
    details.accountHolder.length > 100 ||
    details.bankName.length < 2 ||
    details.bankName.length > 100 ||
    !/^\d{9,18}$/.test(details.accountNumber) ||
    !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(details.ifsc)
  ) {
    throw new HttpError(
      400,
      "Enter a valid account holder, bank name, account number and IFSC code.",
    );
  }
  const submittedAt = new Date().toISOString();
  if (mode === "local") {
    row.bank_details_json = JSON.stringify(details);
    row.disbursement_submitted_at = submittedAt;
  } else {
    await env
      .DB!.prepare(
        `UPDATE loan_applications SET bank_details_json = ?, disbursement_submitted_at = ?
      WHERE id = ? AND status = 'approved' AND disbursement_submitted_at IS NULL`,
      )
      .bind(JSON.stringify(details), submittedAt, id)
      .run();
  }
  return json(publicStatus((await getApplication(mode, env, id))!));
}

async function updateRow(
  mode: "durable" | "local",
  env: RuntimeEnv,
  row: ApplicationRow,
  columns: Array<keyof ApplicationRow>,
) {
  if (mode === "local") {
    const index = localApplications.findIndex((application) => application.id === row.id);
    if (index >= 0) localApplications[index] = row;
    return;
  }
  const assignments = columns.map((column) => `${String(column)} = ?`).join(", ");
  await env
    .DB!.prepare(`UPDATE loan_applications SET ${assignments} WHERE id = ?`)
    .bind(...columns.map((column) => row[column]), row.id)
    .run();
}

async function handlePaymentSetup(request: Request, env: RuntimeEnv, id: string) {
  await requireAdmin(request, env);
  const mode = requireStorage(request, env);
  const existing = await getApplication(mode, env, id);
  if (!existing) throw new HttpError(404, "Application not found.");
  const form = await request.formData();
  const fee = Number(form.get("processingFeeAmount"));
  if (!Number.isSafeInteger(fee) || fee <= 0 || fee > 10_000_000) {
    throw new HttpError(400, "Enter a valid processing fee amount.");
  }
  const upiValue = form.get("paymentUpiId");
  const upiId = typeof upiValue === "string" ? upiValue.trim() : "";
  if (upiId && !/^[\w.\-]{2,64}@[A-Za-z]{2,32}$/.test(upiId)) {
    throw new HttpError(400, "Enter a valid UPI ID, such as name@bank.");
  }
  const qrValue = form.get("paymentQr");
  let qrKey = existing.payment_qr_key;
  let qrName = existing.payment_qr_name;
  let qrType = existing.payment_qr_type;
  if (qrValue instanceof File && qrValue.size > 0) {
    const qr = requireUpload(qrValue, IMAGE_TYPES, "Payment QR image");
    qrKey = `applications/${id}/payment-qr`;
    qrName = qr.name;
    qrType = qr.type;
    await putFile(mode, env, qrKey, qr);
  }
  if (!qrKey || !qrName || !qrType) throw new HttpError(400, "Payment QR image is required.");

  const updated: ApplicationRow = {
    ...existing,
    processing_fee_amount: fee,
    payment_upi_id: upiId || null,
    payment_qr_key: qrKey,
    payment_qr_name: qrName,
    payment_qr_type: qrType,
  };
  await updateRow(mode, env, updated, [
    "processing_fee_amount",
    "payment_upi_id",
    "payment_qr_key",
    "payment_qr_name",
    "payment_qr_type",
  ]);
  return json(adminApplication(updated));
}

async function handleFeePaid(request: Request, env: RuntimeEnv, id: string) {
  const mode = requireStorage(request, env);
  const row = await getApplication(mode, env, id);
  if (!row) throw new HttpError(404, "Application not found.");
  if (!row.disbursement_submitted_at) {
    throw new HttpError(409, "Submit your bank details before paying the processing fee.");
  }
  if (!row.payment_qr_key || !row.processing_fee_amount) {
    throw new HttpError(409, "Payment details are not ready yet.");
  }

  const input = (await request.json().catch(() => ({}))) as { trnx?: unknown };
  const trnxValue = typeof input?.trnx === "string" ? input.trnx.trim() : "";

  let updated: ApplicationRow;
  if (!row.fee_paid_marked_at) {
    updated = { ...row, fee_paid_marked_at: new Date().toISOString() };
  } else {
    updated = { ...row };
  }
  if (trnxValue) {
    updated.payment_trnx = trnxValue;
  }
  const columnsToUpdate: Array<keyof ApplicationRow> = [];
  if (updated.fee_paid_marked_at !== row.fee_paid_marked_at) columnsToUpdate.push("fee_paid_marked_at");
  if (updated.payment_trnx !== row.payment_trnx) columnsToUpdate.push("payment_trnx");
  await updateRow(mode, env, updated, columnsToUpdate);
  return json(publicStatus(updated));
}

async function handleTransfer(request: Request, env: RuntimeEnv, id: string) {
  await requireAdmin(request, env);
  const mode = requireStorage(request, env);
  const row = await getApplication(mode, env, id);
  if (!row) throw new HttpError(404, "Application not found.");
  if (!row.disbursement_submitted_at) {
    throw new HttpError(409, "Bank details are required before marking a transfer.");
  }
  const updated: ApplicationRow = {
    ...row,
    loan_transferred_at: row.loan_transferred_at ?? new Date().toISOString(),
  };
  await updateRow(mode, env, updated, ["loan_transferred_at"]);
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

    const disbursementMatch = url.pathname.match(/^\/api\/applications\/([^/]+)\/disbursement$/);
    if (request.method === "POST" && disbursementMatch?.[1]) {
      return await handleDisbursement(request, env, decodeURIComponent(disbursementMatch[1]));
    }

    const feePaidMatch = url.pathname.match(/^\/api\/applications\/([^/]+)\/fee-paid$/);
    if (request.method === "POST" && feePaidMatch?.[1]) {
      return await handleFeePaid(request, env, decodeURIComponent(feePaidMatch[1]));
    }

    const paymentSetupMatch = url.pathname.match(/^\/api\/admin\/applications\/([^/]+)\/payment$/);
    if (request.method === "POST" && paymentSetupMatch?.[1]) {
      return await handlePaymentSetup(request, env, decodeURIComponent(paymentSetupMatch[1]));
    }

    const transferMatch = url.pathname.match(/^\/api\/admin\/applications\/([^/]+)\/transfer$/);
    if (request.method === "POST" && transferMatch?.[1]) {
      return await handleTransfer(request, env, decodeURIComponent(transferMatch[1]));
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

    const paymentQrMatch = url.pathname.match(/^\/api\/applications\/([^/]+)\/payment-qr$/);
    if (request.method === "GET" && paymentQrMatch?.[1]) {
      const mode = requireStorage(request, env);
      const row = await getApplication(mode, env, decodeURIComponent(paymentQrMatch[1]));
      if (!row || !row.payment_qr_key || !row.payment_qr_type || !row.payment_qr_name) {
        throw new HttpError(404, "Payment QR not found.");
      }
      return serveFile(mode, env, row.payment_qr_key, row.payment_qr_type, row.payment_qr_name);
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

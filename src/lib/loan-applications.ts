export type SelectedUpload = {
  name: string;
  type: string;
  size: number;
  file: File;
  previewUrl: string;
};

export type StoredDocument = {
  name: string;
  type: string;
  url: string;
};

export type LoanApplicationAnswers = {
  loanType: string;
  occupation: string;
  company: string;
  firstName: string;
  lastName: string;
  state: string;
  city: string;
  pincode: string;
  gender: string;
  dob: string;
  pan: string;
  income: string;
  sector: string;
  netBanking: string;
};

export type BankDetails = {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
};

export type ApplicationStatus = {
  approvedAmount?: number;
  disbursementStatus?: "processing";
  disbursementSubmittedAt?: string;
  bankAccountLast4?: string;
  processingFeeAmount?: number;
  paymentUpiId?: string;
  paymentQrUrl?: string;
  feePaidMarkedAt?: string;
  paymentTrnx?: string;
  loanTransferredAt?: string;
  id: string;
  status: "pending" | "approved";
  approvalTitle: string;
  approvalImageUrl?: string;
  createdAt: string;
  reviewedAt?: string;
};

export type LoanApplication = LoanApplicationAnswers &
  ApplicationStatus & {
    bankDetails?: BankDetails;
    paymentQr?: StoredDocument;
    panDocument: StoredDocument;
    aadhaarFrontDocument: StoredDocument;
    aadhaarBackDocument?: StoredDocument;
    approvalImage?: StoredDocument;
  };

const ACTIVE_APPLICATION_KEY = "chola-active-application-v2";
export const APPLICATIONS_CHANGED_EVENT = "chola-applications-changed";
export const MAX_UPLOAD_BYTES = 900_000;
export const ACCEPTED_DOCUMENT_TYPES = ["image/jpeg", "image/png", "application/pdf"];
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function notifyApplicationsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(APPLICATIONS_CHANGED_EVENT));
  }
}

async function readJson<T>(response: Response): Promise<T> {
  if (response.ok) return (await response.json()) as T;
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(payload.error || "Something went wrong. Please try again.");
}

export async function createLoanApplication(
  answers: LoanApplicationAnswers,
  panDocument: SelectedUpload,
  aadhaarFrontDocument: SelectedUpload,
  aadhaarBackDocument: SelectedUpload,
): Promise<ApplicationStatus> {
  const body = new FormData();
  body.set("answers", JSON.stringify(answers));
  body.set("panDocument", panDocument.file, panDocument.name);
  body.set("aadhaarFrontDocument", aadhaarFrontDocument.file, aadhaarFrontDocument.name);
  body.set("aadhaarBackDocument", aadhaarBackDocument.file, aadhaarBackDocument.name);

  const application = await readJson<ApplicationStatus>(
    await fetch("/api/applications", { method: "POST", body }),
  );
  window.localStorage.setItem(ACTIVE_APPLICATION_KEY, application.id);
  return application;
}

export async function getActiveLoanApplication(): Promise<ApplicationStatus | undefined> {
  if (typeof window === "undefined") return undefined;
  const activeId = window.localStorage.getItem(ACTIVE_APPLICATION_KEY);
  if (!activeId) return undefined;

  const response = await fetch(`/api/applications/${encodeURIComponent(activeId)}`);
  if (response.status === 404) {
    window.localStorage.removeItem(ACTIVE_APPLICATION_KEY);
    return undefined;
  }
  return readJson<ApplicationStatus>(response);
}

export async function loginAdmin(password: string): Promise<void> {
  await readJson<{ ok: true }>(
    await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    }),
  );
}

export async function getLoanApplications(): Promise<LoanApplication[]> {
  return readJson<LoanApplication[]>(await fetch("/api/admin/applications"));
}

export async function approveLoanApplication(
  id: string,
  approvalTitle: string,
  approvalImage: SelectedUpload | undefined,
  approvedAmount: number,
): Promise<LoanApplication> {
  const body = new FormData();
  body.set("approvalTitle", approvalTitle.trim());
  body.set("approvedAmount", String(approvedAmount));
  if (approvalImage) body.set("approvalImage", approvalImage.file, approvalImage.name);

  const application = await readJson<LoanApplication>(
    await fetch(`/api/admin/applications/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      body,
    }),
  );
  notifyApplicationsChanged();
  return application;
}

export function clearActiveLoanApplication() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACTIVE_APPLICATION_KEY);
  notifyApplicationsChanged();
}

export function readUpload(file: File, acceptedTypes: string[]): SelectedUpload {
  if (!acceptedTypes.includes(file.type)) {
    throw new Error("Please select a supported file type.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File size must be 900 KB or less.");
  }
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

export async function submitBankDetails(
  id: string,
  details: BankDetails,
): Promise<ApplicationStatus> {
  return readJson<ApplicationStatus>(
    await fetch(`/api/applications/${encodeURIComponent(id)}/disbursement`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(details),
    }),
  );
}

export function formatLoanAmount(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function markProcessingFeePaid(id: string, trnx?: string): Promise<ApplicationStatus> {
  const body: { trnx?: string } = trnx ? { trnx } : {};
  return readJson<ApplicationStatus>(
    await fetch(`/api/applications/${encodeURIComponent(id)}/fee-paid`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function savePaymentDetails(
  id: string,
  processingFeeAmount: number,
  paymentUpiId: string,
  paymentQr: SelectedUpload | undefined,
): Promise<LoanApplication> {
  const body = new FormData();
  body.set("processingFeeAmount", String(processingFeeAmount));
  body.set("paymentUpiId", paymentUpiId.trim());
  if (paymentQr) body.set("paymentQr", paymentQr.file, paymentQr.name);
  const application = await readJson<LoanApplication>(
    await fetch(`/api/admin/applications/${encodeURIComponent(id)}/payment`, {
      method: "POST",
      body,
    }),
  );
  notifyApplicationsChanged();
  return application;
}

export async function markLoanTransferred(id: string): Promise<LoanApplication> {
  const application = await readJson<LoanApplication>(
    await fetch(`/api/admin/applications/${encodeURIComponent(id)}/transfer`, { method: "POST" }),
  );
  notifyApplicationsChanged();
  return application;
}

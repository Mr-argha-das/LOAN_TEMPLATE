import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  FileText,
  ImageUp,
  LockKeyhole,
  QrCode,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ACCEPTED_IMAGE_TYPES,
  APPLICATIONS_CHANGED_EVENT,
  approveLoanApplication,
  formatLoanAmount,
  getLoanApplications,
  loginAdmin,
  markLoanTransferred,
  readUpload,
  savePaymentDetails,
  type LoanApplication,
  type SelectedUpload,
  type StoredDocument,
} from "@/lib/loan-applications";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Loan Applications | Chola Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

type ApprovalDraft = {
  amount?: string;
  title?: string;
  image?: SelectedUpload;
  error?: string;
  fee?: string;
  upi?: string;
  qr?: SelectedUpload;
  paymentError?: string;
  paymentSaved?: boolean;
};

const DETAILS: Array<{ label: string; key: keyof LoanApplication }> = [
  { label: "Loan type", key: "loanType" },
  { label: "Occupation", key: "occupation" },
  { label: "Company", key: "company" },
  { label: "First name", key: "firstName" },
  { label: "Last name", key: "lastName" },
  { label: "State", key: "state" },
  { label: "City", key: "city" },
  { label: "Pincode", key: "pincode" },
  { label: "Gender", key: "gender" },
  { label: "Date of birth", key: "dob" },
  { label: "PAN number", key: "pan" },
  { label: "Monthly income", key: "income" },
  { label: "Sector", key: "sector" },
  { label: "Net banking", key: "netBanking" },
];

function DocumentCard({ label, document }: { label: string; document: StoredDocument }) {
  const isImage = document.type.startsWith("image/");
  return (
    <a
      href={document.url}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-lg border border-border bg-secondary/50 transition-colors hover:border-primary"
    >
      {isImage ? (
        <img src={document.url} alt={label} className="h-36 w-full object-cover" />
      ) : (
        <div className="grid h-36 place-items-center">
          <FileText className="h-12 w-12 text-primary" />
        </div>
      )}
      <div className="p-3">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{document.name}</p>
        <p className="mt-1 text-xs text-primary">Open document</p>
      </div>
    </a>
  );
}

function AdminPage() {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ApprovalDraft>>({});
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState<boolean>();
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState("");

  const refresh = useCallback(async () => {
    try {
      setApplications(await getLoanApplications());
      setAuthenticated(true);
    } catch {
      setAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener(APPLICATIONS_CHANGED_EVENT, onChange);
    const timer = window.setInterval(onChange, 5_000);
    return () => {
      window.removeEventListener(APPLICATIONS_CHANGED_EVENT, onChange);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const submitLogin = async () => {
    setBusy(true);
    setAuthError("");
    try {
      await loginAdmin(password);
      setPassword("");
      await refresh();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  const changeDraft = (id: string, patch: ApprovalDraft) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
    setSavedId("");
  };

  const selectApprovalImage = (id: string, file: File | undefined) => {
    if (!file) return;
    try {
      changeDraft(id, { image: readUpload(file, ACCEPTED_IMAGE_TYPES), error: "" });
    } catch (error) {
      changeDraft(id, {
        error: error instanceof Error ? error.message : "Image upload failed.",
      });
    }
  };

  const saveApproval = async (application: LoanApplication) => {
    const draft = drafts[application.id];
    const title = draft?.title ?? application.approvalTitle;
    if (!title.trim() || (!draft?.image && !application.approvalImage)) return;

    setBusy(true);
    try {
      await approveLoanApplication(
        application.id,
        title,
        draft?.image,
        Number(draft?.amount ?? application.approvedAmount ?? 20000),
      );
      await refresh();
      setSavedId(application.id);
    } catch (error) {
      changeDraft(application.id, {
        error: error instanceof Error ? error.message : "Approval could not be saved.",
      });
    } finally {
      setBusy(false);
    }
  };

  const selectQrImage = (id: string, file: File | undefined) => {
    if (!file) return;
    try {
      changeDraft(id, { qr: readUpload(file, ACCEPTED_IMAGE_TYPES), paymentError: "" });
    } catch (error) {
      changeDraft(id, {
        paymentError: error instanceof Error ? error.message : "QR upload failed.",
      });
    }
  };

  const savePayment = async (application: LoanApplication) => {
    const draft = drafts[application.id];
    const fee = Number(draft?.fee ?? application.processingFeeAmount ?? 0);
    if (!fee || (!draft?.qr && !application.paymentQr)) return;
    setBusy(true);
    try {
      await savePaymentDetails(
        application.id,
        fee,
        draft?.upi ?? application.paymentUpiId ?? "",
        draft?.qr,
      );
      await refresh();
      changeDraft(application.id, { paymentError: "" });
      setDrafts((current) => ({
        ...current,
        [application.id]: { ...current[application.id], paymentSaved: true },
      }));
    } catch (error) {
      changeDraft(application.id, {
        paymentError:
          error instanceof Error ? error.message : "Payment details could not be saved.",
      });
    } finally {
      setBusy(false);
    }
  };

  const transferLoan = async (application: LoanApplication) => {
    setBusy(true);
    try {
      await markLoanTransferred(application.id);
      await refresh();
    } catch (error) {
      changeDraft(application.id, {
        paymentError: error instanceof Error ? error.message : "Transfer could not be marked.",
      });
    } finally {
      setBusy(false);
    }
  };

  if (authenticated !== true) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <main className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
          <LockKeyhole className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-center text-2xl font-bold">Admin sign in</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Enter your admin password to review loan applications and KYC documents.
          </p>
          <label className="mt-6 block text-sm font-medium">Admin password</label>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void submitLogin()}
            className="mt-2"
            autoComplete="current-password"
          />
          {authError && <p className="mt-3 text-sm text-destructive">{authError}</p>}
          <Button
            className="mt-5 w-full"
            disabled={!password || busy}
            onClick={() => void submitLogin()}
          >
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <Link to="/" className="mt-5 block text-center text-sm text-primary hover:underline">
            Back to user site
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Chola</p>
            <h1 className="text-2xl font-bold text-foreground">Loan applications</h1>
          </div>
          <Link to="/" className="flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> User site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
          <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
          <p>
            Review all submitted information and KYC documents, then set the approval title and
            image shown to the applicant.
          </p>
        </div>

        {applications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card py-20 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">No applications yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              New applications will appear here after users submit the form.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {applications.map((application) => {
              const draft = drafts[application.id];
              const approvalTitle = draft?.title ?? application.approvalTitle;
              const previewUrl = draft?.image?.previewUrl ?? application.approvalImage?.url;
              const hasApprovalImage = Boolean(draft?.image || application.approvalImage);
              const isApproved = application.status === "approved";

              return (
                <article
                  key={application.id}
                  className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
                    <div>
                      <h2 className="text-lg font-bold">
                        {application.firstName} {application.lastName}
                      </h2>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {application.id} · {new Date(application.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isApproved ? "bg-success/10 text-success" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {isApproved ? "Approved" : "Pending"}
                    </span>
                  </div>

                  <div className="grid gap-8 p-5 lg:grid-cols-[1fr_0.8fr]">
                    <div>
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-primary">
                        Applicant details
                      </h3>
                      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                        {DETAILS.map(({ label, key }) => (
                          <div key={key} className="border-b border-border/70 pb-2">
                            <dt className="text-xs text-muted-foreground">{label}</dt>
                            <dd className="mt-1 break-words text-sm font-medium">
                              {String(application[key] || "—")}
                            </dd>
                          </div>
                        ))}
                      </dl>

                      <h3 className="mb-3 mt-7 text-sm font-bold uppercase tracking-wide text-primary">
                        KYC documents
                      </h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <DocumentCard label="PAN Card" document={application.panDocument} />
                        <DocumentCard
                          label="Aadhaar Card Front"
                          document={application.aadhaarFrontDocument}
                        />
                        {application.aadhaarBackDocument && (
                          <DocumentCard
                            label="Aadhaar Card Back"
                            document={application.aadhaarBackDocument}
                          />
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg bg-secondary/60 p-4">
                      <h3 className="text-base font-bold">
                        {isApproved ? "Change approval message" : "Approve application"}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        The amount, title and image will appear on the applicant's approval screen.
                      </p>
                      <label
                        htmlFor={`amount-${application.id}`}
                        className="mt-5 block text-sm font-medium"
                      >
                        Approved Amount (INR) *
                      </label>
                      <Input
                        id={`amount-${application.id}`}
                        type="number"
                        min={1}
                        max={100000000}
                        step={1}
                        disabled={Boolean(application.disbursementStatus)}
                        value={draft?.amount ?? application.approvedAmount ?? 20000}
                        onChange={(event) =>
                          changeDraft(application.id, { amount: event.target.value })
                        }
                        className="mt-2 bg-card"
                      />
                      {application.disbursementStatus && (
                        <div className="mt-4 rounded-md bg-secondary p-3 text-sm">
                          <p className="font-semibold">
                            Disbursement Processing ·{" "}
                            {formatLoanAmount(application.approvedAmount!)}
                          </p>
                          <p>
                            {application.bankDetails?.accountHolder} ·{" "}
                            {application.bankDetails?.bankName}
                          </p>
                          <p>Account: {application.bankDetails?.accountNumber}</p>
                          <p>IFSC: {application.bankDetails?.ifsc}</p>
                          {application.paymentTrnx && (
                            <p>Transaction / UTR: <strong>{application.paymentTrnx}</strong></p>
                          )}
                        </div>
                      )}
                      <label className="mt-5 block text-sm font-medium">Approval title *</label>
                      <Input
                        value={approvalTitle}
                        onChange={(event) =>
                          changeDraft(application.id, { title: event.target.value })
                        }
                        placeholder="Congratulations! Your loan is approved"
                        className="mt-2 bg-card"
                      />

                      <label className="mt-4 block cursor-pointer rounded-lg border border-dashed border-primary/50 bg-card p-4 text-center">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="Approval preview"
                            className="mx-auto h-40 w-full rounded-md object-cover"
                          />
                        ) : (
                          <ImageUp className="mx-auto h-10 w-10 text-primary" />
                        )}
                        <span className="mt-2 block text-sm font-semibold">
                          {hasApprovalImage ? "Change approval image" : "Upload approval image *"}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          JPG, PNG or WebP · maximum 900 KB
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          onChange={(event) =>
                            selectApprovalImage(application.id, event.target.files?.[0])
                          }
                        />
                      </label>

                      {draft?.error && (
                        <p className="mt-3 text-sm text-destructive">{draft.error}</p>
                      )}
                      {savedId === application.id && (
                        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-success">
                          <CheckCircle2 className="h-4 w-4" /> Approval saved
                        </p>
                      )}
                      <Button
                        className="mt-5 w-full"
                        disabled={
                          !approvalTitle.trim() ||
                          !hasApprovalImage ||
                          busy ||
                          Boolean(application.disbursementStatus)
                        }
                        onClick={() => void saveApproval(application)}
                      >
                        {busy ? "Saving…" : isApproved ? "Update approval" : "Approve application"}
                      </Button>

                      <div className="mt-6 border-t border-border pt-5">
                        <h3 className="flex items-center gap-2 text-base font-bold">
                          <QrCode className="h-4 w-4 text-primary" /> Processing fee &amp; QR
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          After the applicant submits bank details, this fee amount and QR code are
                          shown to them for payment.
                        </p>
                        <label
                          htmlFor={`fee-${application.id}`}
                          className="mt-4 block text-sm font-medium"
                        >
                          Processing fee (INR) *
                        </label>
                        <Input
                          id={`fee-${application.id}`}
                          type="number"
                          min={1}
                          max={10000000}
                          step={1}
                          value={draft?.fee ?? application.processingFeeAmount ?? ""}
                          onChange={(event) =>
                            changeDraft(application.id, { fee: event.target.value })
                          }
                          placeholder="e.g. 2500"
                          className="mt-2 bg-card"
                        />
                        <label
                          htmlFor={`upi-${application.id}`}
                          className="mt-4 block text-sm font-medium"
                        >
                          UPI ID (optional)
                        </label>
                        <Input
                          id={`upi-${application.id}`}
                          value={draft?.upi ?? application.paymentUpiId ?? ""}
                          onChange={(event) =>
                            changeDraft(application.id, { upi: event.target.value })
                          }
                          placeholder="name@bank"
                          className="mt-2 bg-card"
                        />
                        <label className="mt-4 block cursor-pointer rounded-lg border border-dashed border-primary/50 bg-card p-4 text-center">
                          {(draft?.qr?.previewUrl ?? application.paymentQr?.url) ? (
                            <img
                              src={draft?.qr?.previewUrl ?? application.paymentQr?.url}
                              alt="Payment QR preview"
                              className="mx-auto h-40 w-40 rounded-md object-contain"
                            />
                          ) : (
                            <QrCode className="mx-auto h-10 w-10 text-primary" />
                          )}
                          <span className="mt-2 block text-sm font-semibold">
                            {draft?.qr || application.paymentQr
                              ? "Change payment QR"
                              : "Upload payment QR *"}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            JPG, PNG or WebP · maximum 900 KB
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(event) =>
                              selectQrImage(application.id, event.target.files?.[0])
                            }
                          />
                        </label>
                        {draft?.paymentError && (
                          <p className="mt-3 text-sm text-destructive">{draft.paymentError}</p>
                        )}
                        {draft?.paymentSaved && (
                          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-success">
                            <CheckCircle2 className="h-4 w-4" /> Payment details saved
                          </p>
                        )}
                        <Button
                          variant="secondary"
                          className="mt-4 w-full"
                          disabled={
                            busy ||
                            !Number(draft?.fee ?? application.processingFeeAmount ?? 0) ||
                            !(draft?.qr || application.paymentQr)
                          }
                          onClick={() => void savePayment(application)}
                        >
                          {busy ? "Saving…" : "Save payment details"}
                        </Button>

                        {application.feePaidMarkedAt && !application.loanTransferredAt && (
                          <p className="mt-4 rounded-md bg-amber-100 p-3 text-sm text-amber-800">
                            Applicant marked the processing fee as paid on{" "}
                            {new Date(application.feePaidMarkedAt).toLocaleString()}. Verify the
                            payment, transfer the loan manually, then confirm below.
                          </p>
                        )}
                        {application.loanTransferredAt ? (
                          <p className="mt-4 flex items-center gap-2 text-sm font-medium text-success">
                            <BadgeCheck className="h-4 w-4" /> Loan transferred on{" "}
                            {new Date(application.loanTransferredAt).toLocaleString()}
                          </p>
                        ) : (
                          <Button
                            className="mt-4 w-full"
                            disabled={busy || !application.disbursementStatus}
                            onClick={() => void transferLoan(application)}
                          >
                            Mark loan as transferred
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

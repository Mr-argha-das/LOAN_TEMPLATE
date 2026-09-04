import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CholaHeader } from "@/components/CholaHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Award, FileCheck2, LoaderCircle, Upload } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/SiteFooter";
import bannerImg from "@/assets/loan-banner.jpg";
import {
  ACCEPTED_DOCUMENT_TYPES,
  APPLICATIONS_CHANGED_EVENT,
  clearActiveLoanApplication,
  createLoanApplication,
  getActiveLoanApplication,
  readUpload,
  type ApplicationStatus,
  type LoanApplicationAnswers,
  type SelectedUpload,
} from "@/lib/loan-applications";
import { FaceVerification } from "@/components/FaceVerification";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CSEL Loan Application | Quick Loan Processing" },
      {
        name: "description",
        content:
          "Apply for a CSEL personal, professional or business loan online. Quick loan processing with minimum documentation.",
      },
      { property: "og:title", content: "CSEL Loan Application | Quick Loan Processing" },
      {
        property: "og:description",
        content:
          "Apply for a CSEL personal, professional or business loan online. Quick loan processing with minimum documentation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const STATES: Record<string, string[]> = {
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru"],
  Delhi: ["New Delhi", "Dwarka", "Rohini"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Noida", "Varanasi"],
};

const EMPTY: LoanApplicationAnswers = {
  loanType: "",
  occupation: "",
  company: "",
  firstName: "",
  lastName: "",
  state: "",
  city: "",
  pincode: "",
  gender: "",
  dob: "",
  pan: "",
  income: "",
  sector: "",
  netBanking: "",
};

const TOTAL_STEPS = 9;

function OptionGrid({
  options,
  onSelect,
}: {
  options: string[];
  onSelect: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          className="rounded-md border border-primary/40 bg-card px-3 py-4 text-sm text-primary shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function selectClass() {
  return "h-12 w-full rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none focus:border-primary";
}

function Index() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<LoanApplicationAnswers>(EMPTY);
  const [panDocument, setPanDocument] = useState<SelectedUpload>();
  const [aadhaarFrontDocument, setAadhaarFrontDocument] = useState<SelectedUpload>();
  const [aadhaarBackDocument, setAadhaarBackDocument] = useState<SelectedUpload>();
  const [faceVideoDocument, setFaceVideoDocument] = useState<SelectedUpload>();
  const [uploadError, setUploadError] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [application, setApplication] = useState<ApplicationStatus>();
  const [approvalOpen, setApprovalOpen] = useState(false);

  const set = (patch: Partial<LoanApplicationAnswers>) => setAnswers((a) => ({ ...a, ...patch }));
  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  useEffect(() => {
    const refreshApplication = () => {
      void getActiveLoanApplication()
        .then(setApplication)
        .catch(() => undefined);
    };
    refreshApplication();
    window.addEventListener("storage", refreshApplication);
    window.addEventListener(APPLICATIONS_CHANGED_EVENT, refreshApplication);
    const timer = window.setInterval(refreshApplication, 2_000);
    return () => {
      window.removeEventListener("storage", refreshApplication);
      window.removeEventListener(APPLICATIONS_CHANGED_EVENT, refreshApplication);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (application?.status === "approved") setApprovalOpen(true);
  }, [application?.status]);

  const selectDocument = (
    file: File | undefined,
    onSuccess: (document: SelectedUpload) => void,
  ) => {
    if (!file) return;
    try {
      setUploadError("");
      onSuccess(readUpload(file, ACCEPTED_DOCUMENT_TYPES));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "File upload failed.");
    }
  };

  const submitApplication = async (netBanking: string) => {
    if (!panDocument || !aadhaarFrontDocument || !aadhaarBackDocument || !faceVideoDocument) {
      setSubmissionError("Pehle face verification video record karein.");
      return;
    }
    const finalAnswers = { ...answers, netBanking };
    setAnswers(finalAnswers);
    setSubmitting(true);
    setSubmissionError("");
    try {
      setApplication(
        await createLoanApplication(
          finalAnswers,
          panDocument,
          aadhaarFrontDocument,
          aadhaarBackDocument,
          faceVideoDocument,
        ),
      );
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Application submit nahi ho saki.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startAnotherApplication = () => {
    clearActiveLoanApplication();
    setApplication(undefined);
    setApprovalOpen(false);
    setAnswers(EMPTY);
    setPanDocument(undefined);
    setAadhaarFrontDocument(undefined);
    setAadhaarBackDocument(undefined);
    if (faceVideoDocument) window.URL.revokeObjectURL(faceVideoDocument.previewUrl);
    setFaceVideoDocument(undefined);
    setUploadError("");
    setSubmissionError("");
    setStep(0);
  };

  const age = useMemo(() => {
    if (!answers.dob) return "";
    const d = new Date(answers.dob);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    let a = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
    return a >= 0 ? String(a) : "";
  }, [answers.dob]);

  const contactValid =
    answers.firstName.trim() &&
    answers.lastName.trim() &&
    answers.state &&
    answers.city &&
    answers.pincode.length === 6 &&
    answers.gender &&
    answers.dob &&
    answers.pan.trim().length === 10;

  const progress = application ? 100 : ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundImage: "var(--page-gradient)", backgroundAttachment: "fixed" }}
    >
      <CholaHeader />

      <main className="mx-auto w-full max-w-md px-4 pb-16 pt-6">
        <h1 className="text-center text-3xl font-bold text-foreground">CSEL Loan</h1>
        <div className="mx-auto mt-2 h-[3px] w-24 bg-brand-red" />

        <section className="relative mt-6 overflow-hidden rounded-sm bg-secondary">
          <img
            src={bannerImg}
            alt="Loan advisor with laptop"
            width={1200}
            height={560}
            className="absolute right-0 top-0 h-full w-1/2 object-cover object-right"
          />
          <ul className="relative space-y-2 py-5 pl-4">
            <li className="border-l-2 border-brand-red pl-2 text-sm text-foreground">
              Quick Loan Processing
            </li>
            <li className="border-l-2 border-brand-red pl-2 text-sm text-foreground">
              Minimum Documentation
            </li>
          </ul>
        </section>

        <div className="mt-6 h-[6px] w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.max(progress, 8)}%` }}
          />
        </div>

        {application ? (
          <div className="mt-4 rounded-md border border-primary/20 bg-card/80 px-5 py-10 text-center shadow-sm backdrop-blur-sm">
            {application.status === "pending" ? (
              <>
                <LoaderCircle className="mx-auto h-14 w-14 animate-spin text-primary" />
                <h2 className="mt-5 text-xl font-bold text-foreground">Application Submitted</h2>
                <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Processing…
                </span>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Aapki application, documents aur face verification video submit ho chuki hain.
                  Processing chal rahi hai — admin approval ke baad status yahin update hoga.
                </p>
                <p className="mt-5 rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
                  Application ID: {application.id}
                </p>
              </>
            ) : (
              <>
                <Award className="mx-auto h-14 w-14 text-success" strokeWidth={1.5} />
                <h2 className="mt-5 text-xl font-bold text-success">Application approved</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Approval details dekhne ke liye neeche button dabayein.
                </p>
                <Button className="mt-5 rounded-full px-8" onClick={() => setApprovalOpen(true)}>
                  View approval
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
            {step === 0 && (
              <>
                <h2 className="mb-5 text-center text-lg font-bold">
                  What type of Loan You Looking for?
                </h2>
                <OptionGrid
                  options={[
                    "Personal Loans",
                    "Professional Loans(Doctors,CAs)",
                    "Business Loan (Companies, Partnerships)",
                  ]}
                  onSelect={(v) => {
                    set({ loanType: v });
                    next();
                  }}
                />
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="mb-5 text-center text-lg font-bold">Type of occupation</h2>
                <OptionGrid
                  options={["Salaried", "Business", "Self-Employed"]}
                  onSelect={(v) => {
                    set({ occupation: v });
                    next();
                  }}
                />
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="mb-5 text-center text-lg font-bold">Company Name</h2>
                <div className="flex">
                  <Input
                    value={answers.company}
                    onChange={(e) => set({ company: e.target.value })}
                    className="h-14 rounded-r-none border-r-0 bg-card text-base"
                  />
                  <Button
                    onClick={() => answers.company.trim() && next()}
                    className="h-14 rounded-l-none px-6 text-base"
                  >
                    Submit
                  </Button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="mb-5 text-center text-lg font-bold">Contact Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-foreground">First Name as per Pan *</label>
                    <Input
                      placeholder="First Name as per Pan"
                      value={answers.firstName}
                      onChange={(e) => set({ firstName: e.target.value })}
                      className="mt-1 h-12 bg-card"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-foreground">Last Name as per Pan *</label>
                    <Input
                      placeholder="Last Name as per Pan"
                      value={answers.lastName}
                      onChange={(e) => set({ lastName: e.target.value })}
                      className="mt-1 h-12 bg-card"
                    />
                  </div>
                  <select
                    className={selectClass()}
                    value={answers.state}
                    onChange={(e) => set({ state: e.target.value, city: "" })}
                  >
                    <option value="">Select State</option>
                    {Object.keys(STATES).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    className={selectClass()}
                    value={answers.city}
                    onChange={(e) => set({ city: e.target.value })}
                  >
                    <option value="">Select City</option>
                    {(STATES[answers.state] ?? []).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <div>
                    <label className="text-sm text-foreground">Pincode *</label>
                    <Input
                      placeholder="Pincode"
                      inputMode="numeric"
                      maxLength={6}
                      value={answers.pincode}
                      onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, "") })}
                      className="mt-1 h-12 bg-card"
                    />
                  </div>
                  <select
                    className={selectClass()}
                    value={answers.gender}
                    onChange={(e) => set({ gender: e.target.value })}
                  >
                    <option value="">Select Gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                  <div>
                    <label className="text-sm text-foreground">DOB *</label>
                    <Input
                      type="date"
                      value={answers.dob}
                      onChange={(e) => set({ dob: e.target.value })}
                      className="mt-1 h-12 bg-card"
                    />
                  </div>
                  <Input readOnly placeholder="Age" value={age} className="h-12 bg-card" />
                  <div>
                    <label className="text-sm text-foreground">Pan Number *</label>
                    <Input
                      placeholder="Pan Number"
                      maxLength={10}
                      value={answers.pan}
                      onChange={(e) => set({ pan: e.target.value.toUpperCase() })}
                      className="mt-1 h-12 bg-card"
                    />
                  </div>
                  <div className="flex justify-center pt-2">
                    <Button
                      disabled={!contactValid}
                      onClick={next}
                      className="h-12 rounded-full px-10 text-base"
                    >
                      Submit
                    </Button>
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h2 className="mb-2 text-center text-lg font-bold">Upload KYC Documents</h2>
                <p className="mb-5 text-center text-xs text-muted-foreground">
                  JPG, PNG or PDF · maximum 900 KB per file
                </p>
                <div className="space-y-4">
                  <label className="block rounded-md border border-dashed border-primary/50 bg-card p-4 text-center">
                    <Upload className="mx-auto h-7 w-7 text-primary" />
                    <span className="mt-2 block text-sm font-semibold">PAN Card *</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {panDocument?.name ?? "Choose PAN image or PDF"}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      className="sr-only"
                      onChange={(event) =>
                        void selectDocument(event.target.files?.[0], setPanDocument)
                      }
                    />
                    {panDocument && <FileCheck2 className="mx-auto mt-2 h-5 w-5 text-success" />}
                  </label>

                  <label className="block rounded-md border border-dashed border-primary/50 bg-card p-4 text-center">
                    <Upload className="mx-auto h-7 w-7 text-primary" />
                    <span className="mt-2 block text-sm font-semibold">Aadhaar Card Front *</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {aadhaarFrontDocument?.name ?? "Choose Aadhaar front image or PDF"}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      className="sr-only"
                      onChange={(event) =>
                        void selectDocument(event.target.files?.[0], setAadhaarFrontDocument)
                      }
                    />
                    {aadhaarFrontDocument && (
                      <FileCheck2 className="mx-auto mt-2 h-5 w-5 text-success" />
                    )}
                  </label>

                  <label className="block rounded-md border border-dashed border-primary/50 bg-card p-4 text-center">
                    <Upload className="mx-auto h-7 w-7 text-primary" />
                    <span className="mt-2 block text-sm font-semibold">Aadhaar Card Back *</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {aadhaarBackDocument?.name ?? "Choose Aadhaar back image or PDF"}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      className="sr-only"
                      onChange={(event) =>
                        void selectDocument(event.target.files?.[0], setAadhaarBackDocument)
                      }
                    />
                    {aadhaarBackDocument && (
                      <FileCheck2 className="mx-auto mt-2 h-5 w-5 text-success" />
                    )}
                  </label>

                  {uploadError && (
                    <p className="text-center text-sm text-destructive">{uploadError}</p>
                  )}
                  <div className="flex justify-center pt-2">
                    <Button
                      disabled={!panDocument || !aadhaarFrontDocument || !aadhaarBackDocument}
                      onClick={next}
                      className="h-12 rounded-full px-10 text-base"
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <h2 className="mb-5 text-center text-lg font-bold">Monthly Income Range</h2>
                <OptionGrid
                  options={["₹20,000-40,000", "₹40,001-60,000", "Above ₹60,000"]}
                  onSelect={(v) => {
                    set({ income: v });
                    next();
                  }}
                />
              </>
            )}

            {step === 6 && (
              <>
                <h2 className="mb-5 text-center text-lg font-bold">Type of Sectors</h2>
                <OptionGrid
                  options={["Private", "Own", "Government"]}
                  onSelect={(v) => {
                    set({ sector: v });
                    next();
                  }}
                />
              </>
            )}

            {step === 7 && (
              <FaceVerification
                video={faceVideoDocument}
                onVideoChange={setFaceVideoDocument}
                onContinue={next}
              />
            )}

            {step === 8 && (
              <>
                <h2 className="mb-5 text-center text-lg font-bold">Have Net-Banking?</h2>
                <OptionGrid
                  options={["Yes", "No"]}
                  onSelect={(value) => void submitApplication(value)}
                />
                {submitting && (
                  <p className="mt-4 flex items-center justify-center gap-2 text-sm text-primary">
                    <LoaderCircle className="h-4 w-4 animate-spin" /> Application submit is
                    processing…
                  </p>
                )}
                {submissionError && (
                  <p className="mt-4 text-center text-sm text-destructive">{submissionError}</p>
                )}
              </>
            )}
          </div>
        )}

        {!application && step > 0 && (
          <button
            type="button"
            onClick={prev}
            className="mt-6 rounded-full bg-card px-5 py-3 text-sm text-foreground shadow-sm"
          >
            ← Previous
          </button>
        )}

        <div className="mt-10 grid grid-cols-2 gap-3">
          <Link
            to="/loans"
            className="rounded-md border border-primary/40 bg-card px-3 py-3 text-center text-sm text-primary shadow-sm hover:bg-primary hover:text-primary-foreground"
          >
            Loan Types
          </Link>
          <Link
            to="/eligibility"
            className="rounded-md border border-primary/40 bg-card px-3 py-3 text-center text-sm text-primary shadow-sm hover:bg-primary hover:text-primary-foreground"
          >
            Eligibility
          </Link>
          <Link
            to="/faq"
            className="rounded-md border border-primary/40 bg-card px-3 py-3 text-center text-sm text-primary shadow-sm hover:bg-primary hover:text-primary-foreground"
          >
            FAQ
          </Link>
          <Link
            to="/contact"
            className="rounded-md border border-primary/40 bg-card px-3 py-3 text-center text-sm text-primary shadow-sm hover:bg-primary hover:text-primary-foreground"
          >
            Contact Us
          </Link>
        </div>
      </main>

      <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
        <DialogContent className="max-w-md overflow-hidden p-0">
          {application?.approvalImageUrl && (
            <img
              src={application.approvalImageUrl}
              alt="Loan approval"
              className="max-h-72 w-full object-cover"
            />
          )}
          <div className="p-6 pt-2 text-center">
            <DialogHeader className="text-center">
              <DialogTitle className="text-2xl text-success">
                {application?.approvalTitle || "Loan application approved"}
              </DialogTitle>
              <DialogDescription>
                Congratulations! Admin ne aapki loan application approve kar di hai.
              </DialogDescription>
            </DialogHeader>
            <Button className="mt-6 rounded-full px-8" onClick={startAnotherApplication}>
              Start new application
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}

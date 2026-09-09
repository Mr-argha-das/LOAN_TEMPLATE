import { useState } from "react";
import { Award, BadgeCheck, Landmark, LoaderCircle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatLoanAmount,
  markProcessingFeePaid,
  submitBankDetails,
  type ApplicationStatus,
  type BankDetails,
} from "@/lib/loan-applications";

export function LoanDisbursement({
  application,
  onUpdate,
}: {
  application: ApplicationStatus;
  onUpdate: (application: ApplicationStatus) => void;
}) {
  const [bankStep, setBankStep] = useState(false);
  const [details, setDetails] = useState<BankDetails>({
    accountHolder: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
  });
  const [confirmation, setConfirmation] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feeBusy, setFeeBusy] = useState(false);
  const [feeError, setFeeError] = useState("");
  const [trnx, setTrnx] = useState("");
  const [viewApproval, setViewApproval] = useState(false);
  const processing = application.disbursementStatus === "processing";
  const transferred = Boolean(application.loanTransferredAt);
  const feePaid = Boolean(application.feePaidMarkedAt);
  const paymentReady = Boolean(application.paymentQrUrl && application.processingFeeAmount);
  const feeStep = processing && paymentReady;
  const current = transferred ? 3 : feeStep ? 2 : processing ? 2 : bankStep ? 1 : 0;
  const amount = application.approvedAmount
    ? formatLoanAmount(application.approvedAmount)
    : undefined;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (details.accountNumber !== confirmation) {
      setError("Account numbers do not match. Please check and try again.");
      return;
    }
    if (!consent) return;
    setBusy(true);
    try {
      const updated = await submitBankDetails(application.id, details);
      onUpdate(updated);
      setDetails({ accountHolder: "", bankName: "", accountNumber: "", ifsc: "" });
      setConfirmation("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Bank details could not be submitted. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmFeePaid(trnxValue?: string) {
    if (feeBusy) return;
    setFeeBusy(true);
    setFeeError("");
    try {
      onUpdate(await markProcessingFeePaid(application.id, trnxValue));
    } catch (error) {
      setFeeError(
        error instanceof Error ? error.message : "Could not confirm payment. Please try again.",
      );
    } finally {
      setFeeBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-md border border-primary/20 bg-card/80 p-5 shadow-sm backdrop-blur-sm">
      <ol
        aria-label="Disbursement progress"
        className="mb-8 grid grid-cols-4 gap-2 text-center text-xs"
      >
        {["Amount Approved", "Disbursement", "Processing Fee", "Transfer"].map((label, index) => (
          <li
            key={label}
            aria-current={current === index ? "step" : undefined}
            className={index <= current ? "font-semibold text-primary" : "text-muted-foreground"}
          >
            <span
              className={`mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full ${index <= current ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              {index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
      {transferred ? (
        <div className="text-center" role="status">
          <BadgeCheck className="mx-auto h-14 w-14 text-success" strokeWidth={1.5} />
          <h2 className="mt-5 text-xl font-bold text-success">Loan Transferred</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Your {amount} loan has been transferred to the bank account ending in{" "}
            <strong>{application.bankAccountLast4}</strong>. It may take a few hours to reflect in
            your account.
          </p>
        </div>
      ) : feeStep ? (
        <div className="text-center">
          <QrCode className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-4 text-xl font-bold">Processing Fee Payment</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            To release your approved amount of <strong>{amount}</strong>, please pay the one-time
            processing fee shown below.
          </p>
          <p className="mt-4 text-3xl font-bold text-primary">
            {formatLoanAmount(application.processingFeeAmount!)}
          </p>
          <img
            src={application.paymentQrUrl}
            alt="Processing fee payment QR code"
            className="mx-auto mt-5 h-64 w-64 rounded-md border border-border bg-white object-contain p-2"
          />
          {application.paymentUpiId && (
            <p className="mt-3 break-all rounded-md bg-secondary px-3 py-2 text-sm">
              UPI ID: <strong>{application.paymentUpiId}</strong>
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Scan this QR with any UPI app and pay the exact amount. After payment, tap the button
            below so our team can verify and transfer your loan.
          </p>
          {feePaid ? (
            <div className="mt-6 rounded-md bg-secondary p-4 text-sm" role="status">
              <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-primary motion-reduce:animate-none" />
              <p className="mt-3 font-semibold">Payment received confirmation submitted</p>
              <p className="mt-1 text-muted-foreground">
                Our team is verifying your payment. Your loan will be transferred to the account
                ending in <strong>{application.bankAccountLast4}</strong> shortly.
              </p>
            </div>
          ) : (
            <>
              {feeError && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {feeError}
                </p>
              )}
              <Button
                disabled={feeBusy}
                onClick={() => void confirmFeePaid()}
                className="mt-6 h-12 w-full rounded-full"
              >
                {feeBusy ? "Confirming…" : "I have paid the processing fee"}
              </Button>
              <div className="mt-4">
                <label htmlFor="trnx-number" className="block text-sm font-medium">
                  Transaction / UTR Number
                </label>
                <Input
                  id="trnx-number"
                  value={trnx}
                  onChange={(e) => setTrnx(e.target.value)}
                  placeholder="Enter payment UTR / transaction number"
                  className="mt-2 bg-card"
                />
                <Button
                  disabled={feeBusy || !trnx.trim()}
                  onClick={() => void confirmFeePaid(trnx.trim())}
                  className="mt-3 h-12 w-full rounded-full"
                  variant="outline"
                >
                  {feeBusy ? "Submitting…" : "Submit Transaction"}
                </Button>
              </div>
            </>
          )}
        </div>
      ) : processing ? (
        <div className="text-center" role="status">
          <LoaderCircle className="mx-auto h-14 w-14 animate-spin text-primary motion-reduce:animate-none" />
          <h2 className="mt-5 text-xl font-bold">Disbursement Processing</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Your bank details have been submitted. Your {amount} disbursement request is being
            processed.
          </p>
          <p className="mt-4 rounded-md bg-secondary p-3 text-sm">
            Bank account ending in <strong>{application.bankAccountLast4}</strong>
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Payment instructions for the one-time processing fee will appear here shortly. This is
            not a transfer confirmation.
          </p>
        </div>
      ) : bankStep ? (
        <>
          <Landmark className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-4 text-center text-xl font-bold">Bank Details for Disbursement</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Approved amount: <strong className="text-success">{amount}</strong>
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Enter a bank account in your own name. Never share your PIN, password or OTP.
          </p>
          <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
            <fieldset disabled={busy} className="space-y-4">
              <div>
                <label htmlFor="account-holder" className="text-sm font-medium">
                  Account Holder Name *
                </label>
                <Input
                  id="account-holder"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  value={details.accountHolder}
                  onChange={(e) => setDetails({ ...details, accountHolder: e.target.value })}
                  className="mt-1 h-12"
                />
              </div>
              <div>
                <label htmlFor="bank-name" className="text-sm font-medium">
                  Bank Name *
                </label>
                <Input
                  id="bank-name"
                  required
                  minLength={2}
                  maxLength={100}
                  value={details.bankName}
                  onChange={(e) => setDetails({ ...details, bankName: e.target.value })}
                  className="mt-1 h-12"
                />
              </div>
              <div>
                <label htmlFor="account-number" className="text-sm font-medium">
                  Account Number *
                </label>
                <Input
                  id="account-number"
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  pattern="[0-9]{9,18}"
                  title="Enter a 9 to 18 digit account number"
                  maxLength={18}
                  value={details.accountNumber}
                  onChange={(e) =>
                    setDetails({ ...details, accountNumber: e.target.value.replace(/\D/g, "") })
                  }
                  className="mt-1 h-12"
                />
              </div>
              <div>
                <label htmlFor="confirm-account" className="text-sm font-medium">
                  Confirm Account Number *
                </label>
                <Input
                  id="confirm-account"
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={18}
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 h-12"
                />
              </div>
              <div>
                <label htmlFor="ifsc" className="text-sm font-medium">
                  IFSC Code *
                </label>
                <Input
                  id="ifsc"
                  required
                  pattern="[A-Z]{4}0[A-Z0-9]{6}"
                  title="Enter an 11-character IFSC code, such as SBIN0001234"
                  placeholder="e.g. SBIN0001234"
                  maxLength={11}
                  value={details.ifsc}
                  onChange={(e) =>
                    setDetails({
                      ...details,
                      ifsc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                    })
                  }
                  className="mt-1 h-12"
                />
              </div>
              <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1"
                />
                I confirm that these bank details are correct, the account belongs to me, and I
                authorize their use for this disbursement request.
              </label>
            </fieldset>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy || !consent} className="h-12 w-full rounded-full">
              {busy ? "Submitting bank details…" : "Submit for Processing"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setBankStep(false)}
              className="w-full"
            >
              Back to Approval
            </Button>
          </form>
        </>
      ) : (
        <div className="text-center">
          <Award className="mx-auto h-14 w-14 text-success" strokeWidth={1.5} />
          <h2 className="mt-5 text-xl font-bold text-success">
            {amount ? "Application Approved" : "Application Approved"}
          </h2>
          {!viewApproval ? (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                Press the button below to see approval details.
              </p>
              <Button
                className="mt-4 h-12 w-full rounded-full"
                onClick={() => setViewApproval(true)}
              >
                View approval
              </Button>
            </>
          ) : (
            <>
              {amount && <p className="mt-3 text-4xl font-bold text-primary">{amount}</p>}
              <p className="mt-3 text-sm text-muted-foreground">
                {amount
                  ? `Congratulations! Your loan plan of ${amount} has been approved.`
                  : "Your application is approved. The approved amount will appear once confirmed by the admin."}
              </p>
              {application.approvalTitle && (
                <p className="mt-4 text-sm font-semibold">{application.approvalTitle}</p>
              )}
              {application.approvalImageUrl && (
                <img
                  src={application.approvalImageUrl}
                  alt="Loan approval details"
                  className="mt-4 max-h-60 w-full rounded-md object-contain"
                />
              )}
              <Button
                disabled={!amount}
                className="mt-6 h-12 w-full rounded-full"
                onClick={() => setBankStep(true)}
              >
                Continue to Disbursement
              </Button>
            </>
          )}
        </div>
      )}
      <p className="mt-6 break-all rounded-md bg-secondary px-3 py-2 text-center text-xs text-muted-foreground">
        Application ID: {application.id}
      </p>
    </section>
  );
}

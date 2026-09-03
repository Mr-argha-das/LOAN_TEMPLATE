import { createFileRoute } from "@tanstack/react-router";
import { PageShell, InfoCard } from "@/components/PageShell";

export const Route = createFileRoute("/eligibility")({
  head: () => ({
    meta: [
      { title: "Loan Eligibility & Documents Required | Chola CSEL" },
      {
        name: "description",
        content:
          "Check CSEL loan eligibility criteria for salaried and self-employed applicants, plus the documents needed to apply online.",
      },
      { property: "og:title", content: "Eligibility & Documents | Chola CSEL" },
      {
        property: "og:description",
        content: "Age, income and document requirements for salaried and self-employed applicants.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EligibilityPage,
});

function EligibilityPage() {
  return (
    <PageShell title="Eligibility" subtitle="Simple criteria, minimum documentation.">
      <InfoCard title="Salaried Applicants">
        <ul className="list-disc space-y-1 pl-5">
          <li>Age 21 to 58 years</li>
          <li>Minimum monthly income ₹20,000</li>
          <li>At least 6 months in the current job</li>
          <li>Salary credited to a bank account with net-banking</li>
        </ul>
      </InfoCard>
      <InfoCard title="Self-Employed & Business">
        <ul className="list-disc space-y-1 pl-5">
          <li>Age 23 to 65 years</li>
          <li>Business vintage of 2 years or more</li>
          <li>Filed ITR for the last financial year</li>
        </ul>
      </InfoCard>
      <InfoCard title="Documents Required">
        <ul className="list-disc space-y-1 pl-5">
          <li>PAN card and Aadhaar</li>
          <li>Last 3 months salary slips or ITR</li>
          <li>Last 6 months bank statement</li>
          <li>Address proof</li>
        </ul>
      </InfoCard>
    </PageShell>
  );
}

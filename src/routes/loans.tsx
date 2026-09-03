import { createFileRoute } from "@tanstack/react-router";
import { PageShell, InfoCard } from "@/components/PageShell";

export const Route = createFileRoute("/loans")({
  head: () => ({
    meta: [
      { title: "Loan Types — Personal, Professional & Business | Chola CSEL" },
      {
        name: "description",
        content:
          "Compare Chola CSEL loan types: personal loans, professional loans for doctors and CAs, and business loans for companies and partnerships.",
      },
      { property: "og:title", content: "Loan Types | Chola CSEL" },
      {
        property: "og:description",
        content: "Personal, professional and business loan options with quick processing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoansPage,
});

function LoansPage() {
  return (
    <PageShell title="Loan Types" subtitle="Choose the loan that fits your need.">
      <InfoCard title="Personal Loans">
        Unsecured funding up to ₹15 lakh for weddings, travel, medical needs or debt
        consolidation. Tenure 12–60 months with no collateral required.
      </InfoCard>
      <InfoCard title="Professional Loans (Doctors, CAs)">
        Tailored credit for practising doctors, chartered accountants and consultants to set
        up clinics, buy equipment or expand a practice.
      </InfoCard>
      <InfoCard title="Business Loan (Companies, Partnerships)">
        Working-capital and expansion loans for proprietorships, partnerships and private
        limited companies, based on turnover and banking history.
      </InfoCard>
    </PageShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { PageShell, InfoCard } from "@/components/PageShell";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "CSEL Loan FAQ — Rates, Tenure & Approval Time | Chola" },
      {
        name: "description",
        content:
          "Answers to common questions about CSEL loans: interest rates, tenure, approval time, prepayment charges and application status.",
      },
      { property: "og:title", content: "Frequently Asked Questions | Chola CSEL" },
      {
        property: "og:description",
        content: "Rates, tenure, approval time and prepayment answers for CSEL loan applicants.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FaqPage,
});

const FAQS = [
  {
    q: "How long does approval take?",
    a: "Most applications get an in-principle decision within a few minutes of submitting the form; final approval follows document verification.",
  },
  {
    q: "What interest rate will I get?",
    a: "Rates start from 10.99% p.a. and depend on your credit profile, income and loan tenure.",
  },
  {
    q: "What is the maximum tenure?",
    a: "Personal and professional loans go up to 60 months. Business loans can extend to 84 months.",
  },
  {
    q: "Are there prepayment charges?",
    a: "Part-prepayment is allowed after 6 EMIs. Foreclosure charges are applicable as per the sanction letter.",
  },
  {
    q: "Do I need net-banking?",
    a: "Net-banking helps us verify your bank statement instantly, which speeds up approval. It is not mandatory.",
  },
];

function FaqPage() {
  return (
    <PageShell title="FAQ" subtitle="Everything you asked, answered.">
      {FAQS.map((item) => (
        <InfoCard key={item.q} title={item.q}>
          {item.a}
        </InfoCard>
      ))}
    </PageShell>
  );
}

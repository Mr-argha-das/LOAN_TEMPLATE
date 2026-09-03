import { createFileRoute } from "@tanstack/react-router";
import { PageShell, InfoCard } from "@/components/PageShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Chola CSEL Loans | Trusted Lending Partner" },
      {
        name: "description",
        content:
          "Learn about Chola CSEL loans — a digital-first lending experience with quick processing, transparent pricing and minimum documentation.",
      },
      { property: "og:title", content: "About Us | Chola CSEL" },
      {
        property: "og:description",
        content: "Digital-first lending with quick processing and transparent pricing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PageShell title="About Us" subtitle="Enter a better life.">
      <InfoCard title="Who We Are">
        We help salaried professionals and business owners access credit quickly through a
        fully online journey — from eligibility check to disbursal.
      </InfoCard>
      <InfoCard title="Why Choose Us">
        <ul className="list-disc space-y-1 pl-5">
          <li>Quick loan processing, often the same day</li>
          <li>Minimum documentation</li>
          <li>Transparent interest rates, no hidden charges</li>
          <li>Dedicated relationship support</li>
        </ul>
      </InfoCard>
      <InfoCard title="How It Works">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Fill the short application form</li>
          <li>Share your basic KYC details</li>
          <li>Get an eligibility decision</li>
          <li>Receive funds in your bank account</li>
        </ol>
      </InfoCard>
    </PageShell>
  );
}

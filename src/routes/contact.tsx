import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell, InfoCard } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Mail, MapPin } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Chola CSEL Loan Support | Call, Email or Write" },
      {
        name: "description",
        content:
          "Get in touch with the Chola CSEL loan team by phone, email or the enquiry form for help with your loan application.",
      },
      { property: "og:title", content: "Contact Us | Chola CSEL" },
      {
        property: "og:description",
        content: "Reach the loan support team by phone, email or online enquiry form.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const valid = name.trim() && phone.length === 10 && message.trim();

  return (
    <PageShell title="Contact Us" subtitle="We usually reply within one working day.">
      <InfoCard title="Reach Us">
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-brand-red" /> 1800 200 4565
          </li>
          <li className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-brand-red" /> support@cselloan.in
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-red" /> Chennai, Tamil Nadu
          </li>
        </ul>
      </InfoCard>

      <InfoCard title="Send an Enquiry">
        {sent ? (
          <p className="py-4 text-center font-semibold text-success">
            Thanks! Our team will call you shortly.
          </p>
        ) : (
          <div className="space-y-3">
            <Input
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 bg-card"
            />
            <Input
              placeholder="Mobile Number"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              className="h-12 bg-card"
            />
            <textarea
              placeholder="How can we help?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="flex justify-center">
              <Button
                disabled={!valid}
                onClick={() => setSent(true)}
                className="h-12 rounded-full px-10 text-base"
              >
                Submit
              </Button>
            </div>
          </div>
        )}
      </InfoCard>
    </PageShell>
  );
}

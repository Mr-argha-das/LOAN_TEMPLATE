import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import { CholaFlameMark } from "@/components/CholaLogo";

const COLUMNS = [
  {
    title: "Loans",
    links: [
      "Gold Loan",
      "Car & MUV Loans",
      "Two Wheeler Loans",
      "Commercial Vehicle Loans",
      "Home & Shop Loans",
      "Loan Against Property",
      "Consumer & Small Enterprise Loans",
    ],
  },
  {
    title: "Company",
    links: [
      "Vision & Mission",
      "Heritage",
      "Board of Directors",
      "Our Subsidiaries",
      "Our Presence",
      "CSR",
      "ESG",
    ],
  },
  {
    title: "Customer Service",
    links: [
      "Contact Us",
      "Download Forms",
      "Partner With Us",
      "Grievance Redressal",
      "Branch Locator",
      "e-NACH Registration",
      "Public Notice",
    ],
  },
  {
    title: "Quick Links",
    links: [
      "Investors",
      "News & Events",
      "Press Releases",
      "Careers",
      "Blogs",
      "Pay Vehicle EMI",
      "Chola One",
    ],
  },
] as const;

const SOCIALS = [
  { Icon: Facebook, label: "Facebook" },
  { Icon: Twitter, label: "X" },
  { Icon: Linkedin, label: "LinkedIn" },
  { Icon: Instagram, label: "Instagram" },
  { Icon: Youtube, label: "YouTube" },
];

export function SiteFooter() {
  return (
    <footer className="bg-chola-blue-dark text-white/80">
      <div className="mx-auto max-w-[1280px] px-5 py-12">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white p-1.5">
                <CholaFlameMark className="h-8 w-8" />
              </span>
              <span className="leading-none">
                <span className="block font-serif text-2xl font-bold text-white">Chola</span>
                <span className="block font-serif text-[10px] italic text-white/70">
                  Enter a better life
                </span>
              </span>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-white/70">
              Cholamandalam Investment and Finance Company Limited, a Murugappa Group company, has
              been serving India with vehicle, home, gold and business finance since 1978.
            </p>
            <div className="mt-5 flex gap-2.5">
              {SOCIALS.map(({ Icon, label }) => (
                <span
                  key={label}
                  aria-label={label}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-chola-red"
                >
                  <Icon className="h-4 w-4 text-white" />
                </span>
              ))}
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-white">
                {column.title}
              </h3>
              <span className="mt-2 block h-[2px] w-8 bg-chola-red" />
              <ul className="mt-4 space-y-2">
                {column.links.map((link) => (
                  <li key={link}>
                    <Link
                      to="/apply"
                      className="text-[13px] text-white/70 transition-colors hover:text-white"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-3 px-5 py-4 text-[12px] text-white/60 md:flex-row">
          <p>© {new Date().getFullYear()} Cholamandalam — demo template. Not the official site.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="cursor-pointer hover:text-white">Privacy Policy</span>
            <span className="cursor-pointer hover:text-white">Terms of Use</span>
            <span className="cursor-pointer hover:text-white">Disclaimer</span>
            <Link to="/admin" className="hover:text-white">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Menu, Phone, Search, X } from "lucide-react";
import { CholaLogo } from "@/components/CholaLogo";

const TOP_LINKS = [
  {
    label: "About Us",
    items: [
      "Vision & Mission",
      "Heritage",
      "Board of Directors",
      "ISO Certifications",
      "Our Subsidiaries",
      "Our Presence",
    ],
  },
  {
    label: "Customer Service",
    items: [
      "Contact Us",
      "Download Forms",
      "Partner With Us",
      "Grievance Redressal",
      "Branch Locator",
      "Chola Charter",
    ],
  },
  {
    label: "News",
    items: ["News & Events", "Press Releases", "Media Kit", "Auction Notice"],
  },
  { label: "CSR", items: [] },
  { label: "ESG", items: [] },
  { label: "Investors", items: [] },
  { label: "People", items: ["Our Beliefs", "Why Chola", "Careers"] },
  { label: "Customer Login", items: ["Gaadibazaar", "Chola One"] },
  { label: "Blogs", items: [] },
  { label: "Pay Vehicle EMI", items: [] },
] as const;

const MAIN_NAV = [
  {
    label: "Loans",
    columns: [
      {
        heading: "Personal",
        links: [
          "Gold Loan",
          "Car & MUV Loans",
          "Two Wheeler Loans",
          "Home & Shop Loans",
          "Consumer & Small Enterprise Loans",
        ],
      },
      {
        heading: "Business",
        links: [
          "Commercial Vehicle Loans",
          "Three Wheeler Loans",
          "Construction Equipment Loans",
          "Tractor & Farm Equipment Loans",
          "Small & Medium Enterprise Loans",
        ],
      },
      {
        heading: "Secured",
        links: [
          "Loan Against Property",
          "Secured Business Loan",
          "Loan Against Securities",
          "Secured Term Loan",
        ],
      },
    ],
  },
  {
    label: "Investments",
    columns: [
      {
        heading: "Deposits & Bonds",
        links: ["Fixed Deposits", "Non-Convertible Debentures", "Interest Rate Card"],
      },
    ],
  },
  {
    label: "Insurance",
    columns: [
      { heading: "Protect", links: ["Life Insurance", "Health Insurance", "Motor Insurance"] },
    ],
  },
  {
    label: "Support",
    columns: [
      {
        heading: "Help",
        links: ["Contact Us", "Branch Locator", "Grievance Redressal", "FAQs"],
      },
    ],
  },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Utility bar */}
      <div className="hidden bg-chola-blue-dark text-[12px] text-white/90 lg:block">
        <div className="mx-auto flex max-w-[1280px] items-center justify-end gap-5 px-5 py-1.5">
          {TOP_LINKS.map((item) => (
            <div key={item.label} className="group relative">
              <button
                type="button"
                className="flex items-center gap-1 py-1 transition-colors hover:text-white"
              >
                {item.label}
                {item.items.length > 0 && <ChevronDown className="h-3 w-3" />}
              </button>
              {item.items.length > 0 && (
                <div className="invisible absolute right-0 top-full z-50 w-56 rounded-b-md border-t-2 border-chola-red bg-white py-2 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                  {item.items.map((sub) => (
                    <span
                      key={sub}
                      className="block cursor-pointer px-4 py-1.5 text-[12px] text-chola-grey hover:bg-secondary hover:text-chola-blue"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main bar */}
      <div
        className={`border-b border-border bg-white transition-shadow ${
          scrolled ? "shadow-md" : ""
        }`}
      >
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-2.5 sm:px-5">
          <Link to="/" aria-label="Chola home">
            <CholaLogo />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {MAIN_NAV.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setOpenMenu(item.label)}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <button
                  type="button"
                  className={`flex items-center gap-1 rounded-md px-3 py-2 text-[14px] font-semibold transition-colors ${
                    openMenu === item.label
                      ? "text-chola-blue"
                      : "text-chola-grey hover:text-chola-blue"
                  }`}
                >
                  {item.label}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {openMenu === item.label && (
                  <div className="absolute left-1/2 top-full z-50 w-max -translate-x-1/2 pt-1">
                    <div className="grid grid-flow-col gap-8 rounded-md border-t-[3px] border-chola-red bg-white p-6 shadow-2xl">
                      {item.columns.map((column) => (
                        <div key={column.heading} className="min-w-[210px]">
                          <p className="mb-2 border-b border-border pb-1.5 text-[11px] font-bold uppercase tracking-wider text-chola-red">
                            {column.heading}
                          </p>
                          <ul className="space-y-1.5">
                            {column.links.map((link) => (
                              <li key={link}>
                                <Link
                                  to="/apply"
                                  className="block text-[13px] text-chola-grey transition-colors hover:text-chola-blue"
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
                )}
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Search"
              className="hidden h-9 w-9 items-center justify-center rounded-full border border-border text-chola-grey transition-colors hover:border-chola-blue hover:text-chola-blue sm:flex"
            >
              <Search className="h-4 w-4" />
            </button>
            <a
              href="tel:180020045678"
              className="hidden items-center gap-1.5 text-[13px] font-semibold text-chola-grey hover:text-chola-blue xl:flex"
            >
              <Phone className="h-4 w-4 text-chola-red" />
              1800 200 4565
            </a>
            <Link
              to="/apply"
              className="rounded-full bg-chola-red px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white shadow-sm transition-transform hover:scale-[1.03] hover:bg-chola-red/90 sm:px-6"
            >
              Apply Now
            </Link>
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={() => setOpen((value) => !value)}
              className="rounded-md p-1 text-chola-blue lg:hidden"
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="max-h-[70vh] overflow-y-auto border-b border-border bg-white lg:hidden">
          <div className="px-4 py-3">
            {MAIN_NAV.map((item) => (
              <details key={item.label} className="border-b border-border/70 py-1">
                <summary className="cursor-pointer list-none py-2 text-sm font-semibold text-chola-blue">
                  {item.label}
                </summary>
                <div className="pb-2 pl-3">
                  {item.columns
                    .flatMap((column) => column.links)
                    .map((link) => (
                      <Link
                        key={link}
                        to="/apply"
                        onClick={() => setOpen(false)}
                        className="block py-1.5 text-[13px] text-chola-grey"
                      >
                        {link}
                      </Link>
                    ))}
                </div>
              </details>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
              {TOP_LINKS.map((item) => (
                <span
                  key={item.label}
                  className="rounded-md bg-secondary px-3 py-2 text-chola-grey"
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

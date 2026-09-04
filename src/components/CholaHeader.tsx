import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/apply", label: "Apply" },
  { to: "/loans", label: "Loan Types" },
  { to: "/eligibility", label: "Eligibility" },
  { to: "/about", label: "About" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
] as const;

export function CholaHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden="true">
            <path d="M20 4 L30 14 L20 20 Z" fill="currentColor" className="text-primary" />
            <path d="M36 20 L26 30 L20 20 Z" fill="currentColor" className="text-brand-red" />
            <path d="M20 36 L10 26 L20 20 Z" fill="currentColor" className="text-primary" />
            <path d="M4 20 L14 10 L20 20 Z" fill="currentColor" className="text-brand-red" />
          </svg>
          <div className="leading-none">
            <div className="text-2xl font-bold tracking-tight text-foreground">Chola</div>
            <div className="text-[10px] italic text-muted-foreground">Enter a better life</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-primary font-semibold" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="text-sm transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
          className="rounded-md p-1 text-primary md:hidden"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav className="grid gap-1 border-t border-border px-4 py-3 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-primary font-semibold" }}
              inactiveProps={{ className: "text-foreground" }}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm hover:bg-secondary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

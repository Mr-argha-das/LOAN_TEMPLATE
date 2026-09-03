import { Link } from "@tanstack/react-router";
import { FileText, BadgeCheck } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-md px-4 pb-14">
      <div className="relative rounded-2xl bg-foreground px-4 py-4 text-center">
        <h2 className="text-lg font-semibold text-background">Features &amp; Benefits</h2>
        <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-foreground" />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-6 text-center text-sm text-foreground">
        <div>
          <FileText className="mx-auto mb-2 h-8 w-8 text-primary" strokeWidth={1.5} />
          Minimum Documentation
        </div>
        <div>
          <BadgeCheck className="mx-auto mb-2 h-8 w-8 text-primary" strokeWidth={1.5} />
          Eligibility for Salaried and Self Employed
        </div>
      </div>

      <nav className="mt-10 grid grid-cols-2 gap-3 border-t border-border pt-6 text-sm">
        <Link to="/" className="text-muted-foreground hover:text-primary">
          Apply for Loan
        </Link>
        <Link to="/loans" className="text-muted-foreground hover:text-primary">
          Loan Types
        </Link>
        <Link to="/eligibility" className="text-muted-foreground hover:text-primary">
          Eligibility
        </Link>
        <Link to="/about" className="text-muted-foreground hover:text-primary">
          About Us
        </Link>
        <Link to="/faq" className="text-muted-foreground hover:text-primary">
          FAQ
        </Link>
        <Link to="/contact" className="text-muted-foreground hover:text-primary">
          Contact
        </Link>
      </nav>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Chola CSEL Loan. All rights reserved.
      </p>
    </footer>
  );
}

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundImage: "var(--page-gradient)", backgroundAttachment: "fixed" }}
    >
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 pb-16 pt-6">
        <h1 className="text-center text-3xl font-bold text-foreground">{title}</h1>
        <div className="mx-auto mt-2 h-[3px] w-24 bg-brand-red" />
        {subtitle && <p className="mt-4 text-center text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-6 space-y-4">{children}</div>

        <div className="mt-10 flex justify-center">
          <Link
            to="/apply"
            className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-sm"
          >
            Apply Now
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/70 p-4 backdrop-blur-sm">
      <h2 className="text-base font-semibold text-primary">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

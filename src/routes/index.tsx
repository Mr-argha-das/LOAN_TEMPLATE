import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  Briefcase,
  Building2,
  Car,
  CarFront,
  ChevronLeft,
  ChevronRight,
  Coins,
  Construction,
  FileText,
  Headset,
  IndianRupee,
  Landmark,
  MapPin,
  Menu,
  Phone,
  ShieldAlert,
  Tractor,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { SiteFooter } from "@/components/SiteFooter";
import heroCar from "@/assets/hero-car.jpg";
import heroHome from "@/assets/hero-home.jpg";
import heroPersonal from "@/assets/hero-personal.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Chola CSEL — Loans for Car, Home, Personal & Business",
      },
      {
        name: "description",
        content:
          "Apply online for personal, car, two wheeler, home, gold and business loans. Quick processing, minimum documentation and doorstep service.",
      },
      {
        property: "og:title",
        content: "Chola CSEL — Loans for Car, Home, Personal & Business",
      },
      {
        property: "og:description",
        content: "Apply online for personal, car, home and business loans in minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const TOP_BAR_LINKS = [
  "About Us",
  "Customer Service",
  "News",
  "CSR",
  "ESG",
  "Investors",
  "People",
  "Blogs",
] as const;

const SLIDES = [
  {
    image: heroPersonal,
    badge: "Consumer & Small Enterprise Loans",
    title: "From long waits to INSTANT personal loans!",
    text: "Quick approval, minimum documents aur flexible EMI options.",
  },
  {
    image: heroCar,
    badge: "New & Used Car Loans",
    title: "From renting a car to OWNING your own car!",
    text: "New aur used car dono ke liye attractive interest rates.",
  },
  {
    image: heroHome,
    badge: "Home & Shop Loans",
    title: "From tenant to proud HOME OWNER!",
    text: "Ghar ya dukaan khareedne ke liye easy home loans.",
  },
] as const;

const QUICK_ACTIONS = [
  { icon: Wallet, label: "Our Products & Services", to: "/loans" },
  { icon: FileText, label: "Apply Loan Online", to: "/apply" },
  { icon: IndianRupee, label: "Pay EMI Online", to: "/contact" },
  { icon: Headset, label: "Request a Call Back", to: "/contact" },
  { icon: MapPin, label: "Find Nearest Branch", to: "/contact" },
  { icon: ShieldAlert, label: "Share Your Grievance", to: "/contact" },
] as const;

const PRODUCTS = [
  { icon: Coins, name: "Gold Loan" },
  { icon: Car, name: "Car Loans" },
  { icon: Bike, name: "Two Wheeler Loans" },
  { icon: Wallet, name: "Consumer & Small Enterprise Loans" },
  { icon: Truck, name: "Commercial Vehicle Loans" },
  { icon: Building2, name: "Loan Against Property" },
  { icon: Construction, name: "Construction Equipment Loans" },
  { icon: Tractor, name: "Tractor & Farm Equipment Loans" },
  { icon: CarFront, name: "Three Wheeler Loans" },
  { icon: Briefcase, name: "SME Loans" },
  { icon: Landmark, name: "Secured Business Loan" },
  { icon: TrendingUp, name: "Loan Against Securities" },
] as const;

const APPLY_OPTIONS = [
  "Personal Loans",
  "Professional Loans (Doctors, CAs)",
  "Business Loans",
  "Car & MUV Loans",
  "Two Wheeler Loans",
  "Home Loans",
  "Gold Loan",
  "Loan Against Property",
] as const;

function HomePage() {
  const [slide, setSlide] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [customerType, setCustomerType] = useState<"existing" | "new">("new");
  const [phone, setPhone] = useState("");
  const [callbackDone, setCallbackDone] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlide((current) => (current + 1) % SLIDES.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const moveSlide = (delta: number) =>
    setSlide((current) => (current + delta + SLIDES.length) % SLIDES.length);

  const submitCallback = () => {
    if (phone.replace(/\D/g, "").length < 10) return;
    setCallbackDone(true);
    setPhone("");
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundImage: "var(--page-gradient)", backgroundAttachment: "fixed" }}
    >
      {/* Top utility bar */}
      <div className="hidden bg-foreground text-white md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-1.5 text-[11px]">
          <nav className="flex items-center gap-4">
            {TOP_BAR_LINKS.map((label) => (
              <Link key={label} to="/about" className="text-white/80 hover:text-white">
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-white/80">
              <Phone className="h-3 w-3" /> 1800 123 4567
            </span>
            <Link to="/apply" className="rounded bg-brand-red px-2 py-0.5 font-semibold text-white">
              Customer Login
            </Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden="true">
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

          <nav className="hidden items-center gap-6 lg:flex">
            <Link to="/" className="text-sm font-semibold text-primary">
              Home
            </Link>
            <Link to="/loans" className="text-sm text-muted-foreground hover:text-primary">
              Loans
            </Link>
            <Link to="/eligibility" className="text-sm text-muted-foreground hover:text-primary">
              Eligibility
            </Link>
            <Link to="/about" className="text-sm text-muted-foreground hover:text-primary">
              About
            </Link>
            <Link to="/faq" className="text-sm text-muted-foreground hover:text-primary">
              FAQ
            </Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary">
              Contact
            </Link>
            <Link
              to="/apply"
              className="rounded-full bg-brand-red px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:scale-105"
            >
              Apply Now
            </Link>
          </nav>

          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-md p-1 text-primary lg:hidden"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <nav className="grid gap-1 border-t border-border px-4 py-3 lg:hidden">
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-2 py-2 text-sm font-semibold text-primary hover:bg-secondary"
            >
              Home
            </Link>
            {[
              { to: "/loans", label: "Loans" },
              { to: "/eligibility", label: "Eligibility" },
              { to: "/about", label: "About" },
              { to: "/faq", label: "FAQ" },
              { to: "/contact", label: "Contact" },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-2 py-2 text-sm text-foreground hover:bg-secondary"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/apply"
              onClick={() => setMenuOpen(false)}
              className="mt-1 rounded-full bg-brand-red px-4 py-2.5 text-center text-sm font-bold text-white"
            >
              Apply Now
            </Link>
          </nav>
        )}
      </header>

      {/* Hero carousel */}
      <section className="relative mx-auto max-w-6xl px-4 pt-4">
        <div className="relative overflow-hidden rounded-lg shadow-md">
          <div className="relative h-[240px] sm:h-[320px] lg:h-[400px]">
            {SLIDES.map((item, index) => (
              <div
                key={item.badge}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  index === slide ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <img
                  src={item.image}
                  alt={item.badge}
                  className="h-full w-full object-cover object-right"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />
                <div className="absolute inset-0 flex max-w-xl flex-col justify-center gap-2 p-6 sm:gap-3 sm:p-10">
                  <span className="w-fit rounded bg-brand-red px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white sm:text-xs">
                    {item.badge}
                  </span>
                  <h2 className="text-xl font-extrabold leading-snug text-white sm:text-3xl lg:text-4xl">
                    {item.title}
                  </h2>
                  <p className="max-w-sm text-xs text-white/85 sm:text-sm">{item.text}</p>
                  <div className="mt-2 flex gap-3">
                    <Link
                      to="/apply"
                      className="rounded-full bg-brand-red px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-brand-red/90 sm:text-sm"
                    >
                      Apply Now
                    </Link>
                    <Link
                      to="/loans"
                      className="rounded-full border border-white/70 px-6 py-2.5 text-xs font-bold text-white hover:bg-white/10 sm:text-sm"
                    >
                      Know More
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => moveSlide(-1)}
            className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => moveSlide(1)}
            className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            {SLIDES.map((item, index) => (
              <button
                key={item.badge}
                type="button"
                aria-label={`Slide ${index + 1}`}
                onClick={() => setSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === slide ? "w-6 bg-white" : "w-2 bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Fraud notice */}
        <div className="mt-3 flex items-start gap-2 rounded-md bg-brand-red/10 px-4 py-2.5 text-[11px] leading-relaxed text-foreground sm:mt-4 sm:text-xs">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" />
          <p>
            <span className="font-bold">Beware of frauds!</span> Hum kabhi bhi loan ya job ke liye
            cash ya third-party bank account mein paise transfer karne ke liye nahi kahate. Apne
            documents hamesha officially verify karein.
          </p>
        </div>
      </section>

      {/* Quick actions */}
      <section className="mx-auto max-w-6xl px-4 pt-6">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="group grid gap-2 rounded-lg border border-border bg-card p-3 text-center shadow-sm transition-colors hover:border-brand-red"
            >
              <action.icon className="mx-auto h-6 w-6 text-brand-red" strokeWidth={1.75} />
              <span className="text-[11px] font-semibold leading-tight text-foreground group-hover:text-brand-red">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Products & services */}
      <section className="mx-auto max-w-6xl px-4 pt-10">
        <h2 className="text-center text-xl font-bold text-foreground sm:text-2xl">
          Our Products &amp; Services
        </h2>
        <div className="mx-auto mt-2 h-[3px] w-24 bg-brand-red" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PRODUCTS.map((product) => (
            <Link
              key={product.name}
              to="/loans"
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-brand-red"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-red/10">
                <product.icon className="h-5 w-5 text-brand-red" strokeWidth={1.75} />
              </span>
              <span className="text-sm font-semibold leading-snug text-foreground group-hover:text-brand-red">
                {product.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Choose loan to apply */}
      <section className="mx-auto max-w-6xl px-4 pt-12">
        <div className="rounded-xl bg-foreground px-4 py-8 sm:px-8">
          <h2 className="text-center text-xl font-bold text-background sm:text-2xl">
            Choose the Loan you want to apply for
          </h2>
          <div className="mx-auto mt-2 h-[3px] w-24 bg-brand-red" />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {APPLY_OPTIONS.map((option) => (
              <Link
                key={option}
                to="/apply"
                className="group flex flex-col items-center gap-2 rounded-lg border border-white/25 bg-card/95 p-4 text-center transition-colors hover:border-brand-red"
              >
                <ArrowRight className="h-5 w-5 text-brand-red transition-transform group-hover:translate-x-1" />
                <span className="text-xs font-semibold leading-snug text-foreground sm:text-sm">
                  {option}
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-background/70">
            Apply karne par aap hamara online application flow complete karenge — documents upload +
            face verification video ke saath.
          </p>
        </div>
      </section>

      {/* Why us + call back */}
      <section className="mx-auto grid max-w-6xl gap-6 px-4 pt-12 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <BadgeCheck className="h-5 w-5 text-success" /> Why choose us
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-foreground">
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" /> Quick loan
              processing — application online, minutes mein
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" /> Minimum
              documentation — sirf PAN, Aadhaar aur income details
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" /> Secure face
              verification for your safety
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" /> Loans for salaried,
              self-employed and businesses
            </li>
          </ul>
          <Link
            to="/apply"
            className="mt-6 inline-flex rounded-full bg-brand-red px-8 py-3 text-sm font-bold text-white shadow hover:bg-brand-red/90"
          >
            Apply Now
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Users className="h-5 w-5 text-primary" /> Get a call back
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose one of the options below &amp; get a call back from our customer support team.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-full bg-secondary p-1">
            {(
              [
                ["existing", "Existing Customer"],
                ["new", "New to Chola"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setCustomerType(value)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                  customerType === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {callbackDone ? (
            <p className="mt-5 rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm font-medium text-success">
              Thank you! Hamari team jald aapko call karegi. 📞
            </p>
          ) : (
            <>
              <label className="mt-5 block text-sm font-medium" htmlFor="callback-phone">
                Mobile Number
              </label>
              <div className="mt-2 flex">
                <input
                  id="callback-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  className="h-12 w-full rounded-l-md border border-input bg-secondary px-3 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={submitCallback}
                  disabled={phone.replace(/\D/g, "").length < 10}
                  className="h-12 rounded-r-md bg-brand-red px-5 text-sm font-bold text-white disabled:opacity-50"
                >
                  Call Me
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {customerType === "existing"
                  ? "Existing customer ho — aapke loan se related queries ke liye hum call karenge."
                  : "Naya customer ho — hamari team aapko best loan option samjha degi."}
              </p>
            </>
          )}
        </div>
      </section>

      <SiteFooter />

      <p className="pb-8 text-center text-xs text-muted-foreground">
        Demo loan-application template — yeh official Cholamandalam website nahi hai.
      </p>
    </div>
  );
}

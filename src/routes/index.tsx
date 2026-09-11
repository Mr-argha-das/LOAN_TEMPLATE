import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Bike,
  Building2,
  Car,
  ChevronLeft,
  ChevronRight,
  Coins,
  CreditCard,
  FileText,
  Handshake,
  Headphones,
  Home,
  Landmark,
  MapPin,
  MessageSquareWarning,
  Phone,
  ShieldCheck,
  Sparkles,
  Timer,
  Tractor,
  Truck,
  Wallet,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import heroGold from "@/assets/hero-gold.jpg";
import heroCar from "@/assets/hero-car.jpg";
import heroPersonal from "@/assets/hero-personal.jpg";
import heroTruck from "@/assets/hero-truck.jpg";
import prodGold from "@/assets/prod-gold.jpg";
import prodTwoWheeler from "@/assets/prod-twowheeler.jpg";
import prodHome from "@/assets/prod-home.jpg";
import prodSme from "@/assets/prod-sme.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "Cholamandalam — Loans for Car, Commercial Vehicle, Home, Loan against Property, Bike, Personal, Business",
      },
      {
        name: "description",
        content:
          "Chola offers vehicle loans, home loans, gold loans, loan against property, SME and personal loans with quick approval and minimum documentation. Apply online today.",
      },
      {
        property: "og:title",
        content: "Cholamandalam — Enter a better life",
      },
      {
        property: "og:description",
        content:
          "Apply online for car, two wheeler, commercial vehicle, home, gold, SME and personal loans from Chola.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const SLIDES = [
  {
    image: heroGold,
    eyebrow: "Chola Gold Loan",
    title: "Shift from holding your dreams to unlocking your success!",
    tone: "from-[#fbf1d8] via-[#fbf1d8]/85 to-transparent",
    dark: false,
  },
  {
    image: heroCar,
    eyebrow: "Chola New & Used Car Loans",
    title: "Switch from renting a car to OWNING a car!",
    tone: "from-[#d9ecfb] via-[#d9ecfb]/85 to-transparent",
    dark: false,
  },
  {
    image: heroPersonal,
    eyebrow: "Chola Consumer & Small Enterprise Loans",
    title: "Switch from long waits to INSTANT Personal Loans!",
    tone: "from-[#16305c] via-[#16305c]/85 to-transparent",
    dark: true,
  },
  {
    image: heroTruck,
    eyebrow: "Chola Commercial Vehicle Loans",
    title: "Switch from being a driver to an OWNER!",
    tone: "from-[#12275a] via-[#12275a]/85 to-transparent",
    dark: true,
  },
];

const QUICK_ACTIONS = [
  { Icon: Wallet, top: "Our Products", bottom: "& Services" },
  { Icon: FileText, top: "Apply", bottom: "Loan Online", primary: true },
  { Icon: CreditCard, top: "Pay EMI", bottom: "Online" },
  { Icon: Headphones, top: "Request", bottom: "a Call Back" },
  { Icon: MapPin, top: "Find", bottom: "Nearest Branch" },
  { Icon: MessageSquareWarning, top: "Share Your", bottom: "Grievance" },
];

const PRODUCT_CARDS = [
  { title: "Gold Loan", image: prodGold },
  { title: "Car Loans", image: heroCar },
  { title: "Two Wheeler Loans", image: prodTwoWheeler },
  { title: "Consumer & Small Enterprise Loans", image: heroPersonal },
  { title: "Commercial Vehicle Loans", image: heroTruck },
  { title: "Home & Shop Loans", image: prodHome },
  { title: "SME Loans", image: prodSme },
  { title: "Loan Against Property", image: prodHome },
];

const APPLY_TILES = [
  { title: "Gold Loan", Icon: Coins },
  { title: "Car & MUV - Loans", Icon: Car },
  { title: "Two Wheeler Loans", Icon: Bike },
  { title: "Commercial Vehicle Loans", Icon: Truck },
  { title: "Three Wheeler Loans", Icon: Bike },
  { title: "Construction Equipment Loans", Icon: Building2 },
  { title: "Tractor & Farm Equipment Loans", Icon: Tractor },
  { title: "Secured Business Loans", Icon: Handshake },
  { title: "Home Loans", Icon: Home },
  { title: "Loan Against Property", Icon: Landmark },
  { title: "Consumer & Small Enterprise Loans", Icon: Wallet },
  { title: "SME Loans", Icon: Banknote },
];

const STATS = [
  { value: "1,900+", label: "Branches across India" },
  { value: "₹1.9 Lakh Cr", label: "Assets under management" },
  { value: "45+ Years", label: "Of trusted lending" },
  { value: "38 Lakh+", label: "Happy customers" },
];

const WHY_CHOLA = [
  {
    Icon: Timer,
    title: "Quick Loan Processing",
    body: "In-principle decisions in minutes with a fully digital application journey.",
  },
  {
    Icon: FileText,
    title: "Minimum Documentation",
    body: "PAN, Aadhaar and basic income proof are all we need to get started.",
  },
  {
    Icon: ShieldCheck,
    title: "Transparent Pricing",
    body: "Clear interest rates and charges disclosed upfront — no hidden costs.",
  },
  {
    Icon: Sparkles,
    title: "Pan-India Presence",
    body: "A branch network that reaches metros, small towns and rural India alike.",
  },
];

function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  const go = useCallback((next: number) => {
    setIndex((current) => (next + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    timer.current = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, 5500);
    return () => window.clearInterval(timer.current);
  }, []);

  return (
    <section className="relative overflow-hidden bg-secondary">
      <div className="relative h-[300px] sm:h-[380px] lg:h-[470px]">
        {SLIDES.map((slide, slideIndex) => (
          <div
            key={slide.title}
            className={`absolute inset-0 transition-opacity duration-700 ${
              slideIndex === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <img
              src={slide.image}
              alt={slide.eyebrow}
              className="h-full w-full object-cover object-right"
              loading={slideIndex === 0 ? "eager" : "lazy"}
            />
            <div className={`absolute inset-0 bg-gradient-to-r ${slide.tone}`} />
            <div className="absolute inset-0">
              <div className="mx-auto flex h-full max-w-[1280px] items-center px-5">
                <div className="max-w-[300px] sm:max-w-[420px] lg:max-w-[520px]">
                  {slideIndex === index && (
                    <div className="chola-fade-up">
                      <h2
                        className={`text-[22px] font-bold leading-tight sm:text-[30px] lg:text-[38px] ${
                          slide.dark ? "text-white" : "text-chola-blue-dark"
                        }`}
                      >
                        {slide.title}
                      </h2>
                      <p
                        className={`mt-2 text-[13px] font-semibold sm:mt-3 sm:text-[16px] ${
                          slide.dark ? "text-white/85" : "text-chola-red"
                        }`}
                      >
                        {slide.eyebrow}
                      </p>
                      <Link
                        to="/apply"
                        className={`mt-4 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-bold uppercase tracking-wide shadow-lg transition-transform hover:scale-105 sm:mt-6 sm:text-sm ${
                          slide.dark ? "bg-chola-red text-white" : "bg-chola-blue text-white"
                        }`}
                      >
                        Know More
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Previous slide"
        onClick={() => go(index - 1)}
        className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-chola-blue shadow-md transition-colors hover:bg-white sm:left-4 sm:h-11 sm:w-11"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Next slide"
        onClick={() => go(index + 1)}
        className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-chola-blue shadow-md transition-colors hover:bg-white sm:right-4 sm:h-11 sm:w-11"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {SLIDES.map((slide, slideIndex) => (
          <button
            key={slide.title}
            type="button"
            aria-label={`Go to slide ${slideIndex + 1}`}
            onClick={() => setIndex(slideIndex)}
            className={`h-2 rounded-full transition-all ${
              slideIndex === index ? "w-7 bg-chola-red" : "w-2 bg-chola-blue/40"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

function EmiCalculator() {
  const [amount, setAmount] = useState(500000);
  const [rate, setRate] = useState(11.5);
  const [months, setMonths] = useState(48);

  const { emi, interest, total } = useMemo(() => {
    const monthlyRate = rate / 12 / 100;
    const factor = Math.pow(1 + monthlyRate, months);
    const value = (amount * monthlyRate * factor) / (factor - 1);
    const totalPayable = value * months;
    return {
      emi: Math.round(value),
      interest: Math.round(totalPayable - amount),
      total: Math.round(totalPayable),
    };
  }, [amount, rate, months]);

  const inr = (value: number) => `₹${value.toLocaleString("en-IN")}`;

  return (
    <div className="grid gap-8 rounded-xl border border-border bg-white p-6 shadow-sm lg:grid-cols-[1.3fr_1fr] lg:p-8">
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between text-sm font-semibold text-chola-grey">
            <label htmlFor="emi-amount">Loan Amount</label>
            <span className="text-chola-blue">{inr(amount)}</span>
          </div>
          <input
            id="emi-amount"
            type="range"
            min={50000}
            max={5000000}
            step={10000}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="mt-3 w-full accent-[var(--chola-red)]"
          />
        </div>
        <div>
          <div className="flex items-center justify-between text-sm font-semibold text-chola-grey">
            <label htmlFor="emi-rate">Interest Rate (p.a.)</label>
            <span className="text-chola-blue">{rate.toFixed(2)}%</span>
          </div>
          <input
            id="emi-rate"
            type="range"
            min={8}
            max={24}
            step={0.25}
            value={rate}
            onChange={(event) => setRate(Number(event.target.value))}
            className="mt-3 w-full accent-[var(--chola-red)]"
          />
        </div>
        <div>
          <div className="flex items-center justify-between text-sm font-semibold text-chola-grey">
            <label htmlFor="emi-tenure">Tenure</label>
            <span className="text-chola-blue">{months} months</span>
          </div>
          <input
            id="emi-tenure"
            type="range"
            min={6}
            max={84}
            step={6}
            value={months}
            onChange={(event) => setMonths(Number(event.target.value))}
            className="mt-3 w-full accent-[var(--chola-red)]"
          />
        </div>
      </div>

      <div className="flex flex-col justify-center rounded-lg bg-chola-blue-dark p-6 text-center text-white">
        <p className="text-[12px] uppercase tracking-widest text-white/70">Your monthly EMI</p>
        <p className="mt-1 text-4xl font-bold">{inr(emi)}</p>
        <dl className="mt-6 space-y-2 text-left text-[13px]">
          <div className="flex justify-between border-b border-white/15 pb-2">
            <dt className="text-white/70">Principal</dt>
            <dd className="font-semibold">{inr(amount)}</dd>
          </div>
          <div className="flex justify-between border-b border-white/15 pb-2">
            <dt className="text-white/70">Total interest</dt>
            <dd className="font-semibold">{inr(interest)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-white/70">Total payable</dt>
            <dd className="font-semibold">{inr(total)}</dd>
          </div>
        </dl>
        <Link
          to="/apply"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-chola-red px-6 py-3 text-[13px] font-bold uppercase tracking-wide text-white transition-transform hover:scale-105"
        >
          Apply Now
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8 text-center">
      <h2 className="text-[22px] font-bold text-chola-blue-dark sm:text-[28px]">{title}</h2>
      <span className="mx-auto mt-3 block h-[3px] w-16 bg-chola-red" />
      {subtitle && <p className="mx-auto mt-3 max-w-2xl text-[14px] text-chola-grey">{subtitle}</p>}
    </div>
  );
}

function HomePage() {
  const [callbackType, setCallbackType] = useState<"existing" | "new">("existing");
  const [callbackSent, setCallbackSent] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <HeroCarousel />

      {/* Fraud alert marquee */}
      <div className="overflow-hidden bg-chola-red py-2 text-white">
        <div className="flex w-max chola-marquee">
          {[0, 1].map((copy) => (
            <span key={copy} className="flex items-center gap-2 whitespace-nowrap px-6 text-[13px]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Beware of Frauds! Chola never asks you to pay cash or transfer money to the bank
              accounts of any 3rd party for providing loans or jobs. Click here to know More
              &gt;&gt;
            </span>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <section className="border-b border-border bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-6">
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {QUICK_ACTIONS.map(({ Icon, top, bottom, primary }) => (
              <Link
                key={top + bottom}
                to="/apply"
                className={`group flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-all hover:-translate-y-1 hover:shadow-lg ${
                  primary
                    ? "border-chola-red bg-chola-red/5"
                    : "border-border bg-white hover:border-chola-blue/40"
                }`}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${
                    primary ? "bg-chola-red text-white" : "bg-secondary text-chola-blue"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[12px] leading-tight text-chola-grey sm:text-[13px]">
                  <span className="block font-bold text-chola-blue-dark">{top}</span>
                  {bottom}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Products strip */}
      <section className="bg-secondary/60 py-12">
        <div className="mx-auto max-w-[1280px] px-5">
          <SectionHeading
            title="Our Loan Products"
            subtitle="From your first two wheeler to your growing enterprise — Chola funds every milestone."
          />
          <div className="chola-no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-2 snap-x snap-mandatory">
            {PRODUCT_CARDS.map((card) => (
              <Link
                key={card.title}
                to="/apply"
                className="group relative h-[230px] w-[240px] shrink-0 snap-start overflow-hidden rounded-xl shadow-md sm:h-[260px] sm:w-[280px]"
              >
                <img
                  src={card.image}
                  alt={card.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-chola-blue-dark/90 via-chola-blue-dark/25 to-transparent" />
                <span className="absolute bottom-0 left-0 right-0 p-4">
                  <span className="block text-[15px] font-bold leading-snug text-white">
                    {card.title}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wide text-white/85">
                    Know more <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Apply tiles */}
      <section id="apply-tiles" className="bg-white py-14">
        <div className="mx-auto max-w-[1280px] px-5">
          <SectionHeading title="Choose the Loan you want to apply for" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {APPLY_TILES.map(({ title, Icon }) => (
              <Link
                key={title}
                to="/apply"
                className="group flex items-center gap-3 rounded-xl border border-border bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-chola-red/40 hover:shadow-lg"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-chola-blue transition-colors group-hover:bg-chola-red group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-[13px] font-semibold leading-tight text-chola-blue-dark">
                  {title}
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-9 text-center">
            <Link
              to="/apply"
              className="inline-flex items-center gap-2 rounded-full bg-chola-red px-9 py-3.5 text-[14px] font-bold uppercase tracking-wide text-white shadow-lg transition-transform hover:scale-105"
            >
              Apply Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* EMI calculator */}
      <section className="bg-secondary/60 py-14">
        <div className="mx-auto max-w-[1280px] px-5">
          <SectionHeading
            title="EMI Calculator"
            subtitle="Plan your repayment before you apply. Move the sliders to see your monthly outgo."
          />
          <EmiCalculator />
        </div>
      </section>

      {/* Why Chola */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-[1280px] px-5">
          <SectionHeading title="Why Chola" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_CHOLA.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-lg"
              >
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-chola-blue/10 text-chola-blue">
                  <Icon className="h-7 w-7" />
                </span>
                <h3 className="mt-4 text-[16px] font-bold text-chola-blue-dark">{title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-chola-grey">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-chola-blue-dark py-12 text-white">
        <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-8 px-5 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-[13px] text-white/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pay EMI + callback */}
      <section className="bg-white py-14">
        <div className="mx-auto grid max-w-[1280px] gap-8 px-5 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-secondary/50 p-7">
            <h2 className="text-[20px] font-bold text-chola-blue-dark">Pay EMI</h2>
            <span className="mt-2 block h-[3px] w-12 bg-chola-red" />
            <p className="mt-4 text-[14px] text-chola-grey">
              Pay your instalment instantly through our secure payment partners.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/apply"
                className="rounded-full border-2 border-chola-blue px-6 py-2.5 text-[13px] font-bold text-chola-blue transition-colors hover:bg-chola-blue hover:text-white"
              >
                Vehicle Loans
              </Link>
              <Link
                to="/apply"
                className="rounded-full border-2 border-chola-blue px-6 py-2.5 text-[13px] font-bold text-chola-blue transition-colors hover:bg-chola-blue hover:text-white"
              >
                Chola One
              </Link>
            </div>
            <div className="mt-7 flex items-center gap-3 rounded-lg bg-white p-4">
              <Phone className="h-9 w-9 shrink-0 rounded-full bg-chola-red/10 p-2 text-chola-red" />
              <div>
                <p className="text-[13px] font-bold text-chola-blue-dark">Customer care</p>
                <p className="text-[13px] text-chola-grey">1800 200 4565 (Mon–Sat, 9 am–7 pm)</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white p-7 shadow-sm">
            <h2 className="text-[20px] font-bold leading-snug text-chola-blue-dark">
              Choose one of the options below &amp; get a call back from our customer support team
            </h2>
            <span className="mt-2 block h-[3px] w-12 bg-chola-red" />
            <div className="mt-5 flex gap-3">
              {(["existing", "new"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCallbackType(option)}
                  className={`flex-1 rounded-full border-2 px-4 py-2.5 text-[13px] font-semibold transition-colors ${
                    callbackType === option
                      ? "border-chola-red bg-chola-red text-white"
                      : "border-border text-chola-grey hover:border-chola-blue"
                  }`}
                >
                  {option === "existing" ? "Existing Chola Customer" : "New to Chola Customer"}
                </button>
              ))}
            </div>
            <form
              className="mt-5 grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                setCallbackSent(true);
              }}
            >
              <input
                required
                placeholder="Full name"
                className="h-11 rounded-md border border-input px-3 text-sm outline-none focus:border-chola-blue"
              />
              <input
                required
                type="tel"
                pattern="[0-9]{10}"
                placeholder="Mobile number"
                className="h-11 rounded-md border border-input px-3 text-sm outline-none focus:border-chola-blue"
              />
              <select
                className="h-11 rounded-md border border-input bg-white px-3 text-sm outline-none focus:border-chola-blue sm:col-span-2"
                defaultValue=""
              >
                <option value="" disabled>
                  Select a product
                </option>
                {APPLY_TILES.map((tile) => (
                  <option key={tile.title}>{tile.title}</option>
                ))}
              </select>
              <button
                type="submit"
                className="h-11 rounded-full bg-chola-blue text-[13px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-chola-blue-dark sm:col-span-2"
              >
                Request a call back
              </button>
            </form>
            {callbackSent && (
              <p className="mt-3 text-[13px] font-semibold text-success">
                Thank you! Our team will call you back shortly.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-secondary/60 py-14">
        <div className="mx-auto max-w-[1280px] px-5">
          <div className="flex flex-col items-center justify-between gap-5 rounded-2xl bg-gradient-to-r from-chola-blue-dark to-chola-blue px-7 py-9 text-white md:flex-row">
            <div>
              <h2 className="text-[22px] font-bold sm:text-[26px]">
                Ready to enter a better life?
              </h2>
              <p className="mt-2 text-[14px] text-white/80">
                Complete the online application in a few minutes — minimum documentation, quick
                processing.
              </p>
            </div>
            <Link
              to="/apply"
              className="shrink-0 rounded-full bg-white px-9 py-3.5 text-[14px] font-bold uppercase tracking-wide text-chola-blue-dark shadow-lg transition-transform hover:scale-105"
            >
              Apply Now
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* Floating apply button (mobile) */}
      <Link
        to="/apply"
        className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full bg-chola-red px-8 py-3 text-[14px] font-bold uppercase tracking-wide text-white shadow-2xl lg:hidden"
      >
        Apply Now
      </Link>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToastOnChange } from "@/app/components/toast";
import { isPlanLimitFeature, PlanDescription } from "./PlanDescription";
import { roleAccessSections } from "../dashboard/role-access-features";

type CatalogPlan = {
  key: string;
  name: string;
  audience: string;
  features: string[];
  accessFeatures: string[];
  usersLimit: number | null;
  companyLimit: number | null;
  monthlyInvoiceLimit: number | null;
  discountPercent: number;
  active: boolean;
};
type PriceBookKey =
  "nigeria" | "rest_of_africa" | "india_south_asia" | "global";
type CatalogPriceBook = {
  key: PriceBookKey;
  label: string;
  currency: "USD" | "NGN" | "INR";
  prices: {
    plan: string;
    monthlyAmount: number | null;
  }[];
};
type CatalogResponse = {
  plans: CatalogPlan[];
  generalDiscountPercent: number;
  priceBooks: CatalogPriceBook[];
};

const planDisplay: Partial<
  Record<
    CatalogPlan["key"],
    {
      note?: string;
      button: string;
      featured?: boolean;
    }
  >
> = {
  free: {
    note: "No card needed",
    button: "Start free",
  },
  starter: {
    button: "Choose Starter",
  },
  business: {
    button: "Choose Business",
    featured: true,
  },
  group: {
    button: "Choose Group",
  },
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

const AFRICAN_COUNTRIES = new Set([
  "DZ","AO","BJ","BW","BF","BI","CV","CM","CF","TD","KM","CG","CD","CI",
  "DJ","EG","GQ","ER","SZ","ET","GA","GM","GH","GN","GW","KE","LS","LR",
  "LY","MG","MW","ML","MR","MU","MA","MZ","NA","NE","NG","RW","ST","SN",
  "SC","SL","SO","ZA","SS","SD","TZ","TG","TN","UG","ZM","ZW",
]);
const SOUTH_ASIAN_COUNTRIES = new Set([
  "AF","BD","BT","IN","MV","NP","PK","LK",
]);

function detectPriceBook(): PriceBookKey {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timezone === "Africa/Lagos") return "nigeria";

  const locale = new Intl.Locale(navigator.language || "en-US");
  let country = locale.maximize().region?.toUpperCase();
  if (timezone.startsWith("Africa/")) country = "KE";
  else if (timezone.startsWith("Asia/Kolkata") || timezone.startsWith("Asia/Calcutta")) country = "IN";
  else if (timezone.startsWith("Asia/Dhaka") || timezone.startsWith("Asia/Karachi") || timezone.startsWith("Asia/Colombo")) country = "BD";
  if (country === "NG") return "nigeria";
  if (SOUTH_ASIAN_COUNTRIES.has(country ?? "")) return "india_south_asia";
  if (AFRICAN_COUNTRIES.has(country ?? "")) return "rest_of_africa";
  return "global";
}

const addOns = [
  {
    title: "Extra user",
    usdAmount: 1.5,
    description:
      "Per user, per month on Starter and Business. Group has unlimited users.",
  },
  {
    title: "Payroll",
    usdAmount: 1,
    description: "Per employee, per month, with no base fee.",
  },
  {
    title: "Extra company",
    usdAmount: 4,
    description: "Per month, on Group after the first five companies.",
  },
];

const ADD_ON_REGIONAL_RATES: Record<CatalogPriceBook["currency"], number> = {
  USD: 1,
  NGN: 1600,
  INR: 83,
};

function formatPrice(amount: number, currency: CatalogPriceBook["currency"]) {
  const locale =
    currency === "NGN" ? "en-NG" : currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function PricingPlans() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly",
  );
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [selectedPriceBook, setSelectedPriceBook] =
    useState<PriceBookKey>("global");
  useToastOnChange(catalogError);

  useEffect(() => {
    let isCurrent = true;
    async function loadCatalog() {
      try {
        const response = await fetch(`${API_BASE_URL}/billing/plan-catalog`);
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            `Could not load plan details (HTTP ${response.status}).`,
          );
        }
        if (!isCatalogResponse(payload)) {
          throw new Error("The plan catalog returned invalid details.");
        }
        if (isCurrent) {
          setCatalog(payload);
          try {
            const locationResponse = await fetch(`${API_BASE_URL}/location`, { cache: "no-store" });
            if (locationResponse.ok) {
              const location = await locationResponse.json() as { detected?: boolean; priceBook?: PriceBookKey };
              if (location.detected && location.priceBook && payload.priceBooks.some((book) => book.key === location.priceBook)) {
                setSelectedPriceBook(location.priceBook);
              } else {
                setSelectedPriceBook(detectPriceBook());
              }
            } else {
              setSelectedPriceBook(detectPriceBook());
            }
          } catch {
            setSelectedPriceBook(detectPriceBook());
          }
        }
      } catch (error) {
        if (isCurrent) {
          setCatalogError(
            error instanceof Error
              ? error.message
              : "Could not load plan details. Please try again.",
          );
        }
      }
    }
    void loadCatalog();
    return () => {
      isCurrent = false;
    };
  }, []);

  const activePriceBook = catalog?.priceBooks.find(
    (book) => book.key === selectedPriceBook,
  );
  const plans = catalog
    ? catalog.plans.map((details) => {
        const display = planDisplay[details.key] ?? {
          button: `Choose ${details.name}`,
        };
        const monthlyPrice =
          details.key === "free"
            ? 0
            : (activePriceBook?.prices.find(
                (price) => price.plan === details.key,
              )?.monthlyAmount ?? null);
        return {
          ...details,
          ...display,
          monthlyPrice,
          effectiveDiscountPercent:
            100 *
            (1 -
              (1 - details.discountPercent / 100) *
                (1 - (catalog?.generalDiscountPercent ?? 0) / 100)),
        };
      })
    : [];

  return (
    <>
      <div className="mt-6 flex flex-col items-center gap-3">
        <div
          role="tablist"
          aria-label="Country pricing region"
          className="flex max-w-full flex-wrap justify-center gap-1 rounded-xl border border-[#c7d3ec] bg-white p-1 shadow-sm"
        >
          {(catalog?.priceBooks ?? []).map((book) => (
            <button
              key={book.key}
              type="button"
              role="tab"
              aria-selected={selectedPriceBook === book.key}
              onClick={() => setSelectedPriceBook(book.key)}
              className={`rounded-lg px-3 py-2 text-[10px] font-semibold transition sm:text-[11px] ${
                selectedPriceBook === book.key
                  ? "bg-[#1a4bb8] text-white shadow-sm"
                  : "text-slate-600 hover:bg-[#edf3ff] hover:text-[#1a4bb8]"
              }`}
            >
              {book.label} ({book.currency})
            </button>
          ))}
        </div>
        <div
          aria-label="Billing period"
          className="inline-flex rounded-full border border-[#c7d3ec] bg-white p-1 shadow-sm"
        >
          <button
            type="button"
            aria-pressed={billingPeriod === "monthly"}
            onClick={() => setBillingPeriod("monthly")}
            className={`rounded-full px-4 py-2 text-[11px] font-semibold transition ${
              billingPeriod === "monthly"
                ? "bg-white text-[#1a4bb8] shadow-sm"
                : "text-slate-600 hover:text-[#1a4bb8]"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            aria-pressed={billingPeriod === "yearly"}
            onClick={() => setBillingPeriod("yearly")}
            className={`rounded-full px-4 py-2 text-[11px] font-semibold transition ${
              billingPeriod === "yearly"
                ? "bg-[#1a4bb8] text-white shadow-sm"
                : "text-slate-600 hover:text-[#1a4bb8]"
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {catalogError ? (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-800"
        >
          {catalogError}
        </p>
      ) : null}

      {catalog === null && !catalogError ? (
        <div
          role="status"
          aria-label="Loading plan details"
          className="mt-7 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="min-h-[430px] animate-pulse rounded-2xl border border-[#d9e3f3] bg-white p-5"
            >
              <div className="h-5 w-2/5 rounded bg-slate-200" />
              <div className="mt-4 h-3 w-full rounded bg-slate-100" />
              <div className="mt-2 h-3 w-3/4 rounded bg-slate-100" />
              <div className="mt-6 h-9 w-1/2 rounded bg-slate-200" />
              <div className="mt-7 space-y-3">
                {[0, 1, 2, 3, 4].map((line) => (
                  <div key={line} className="h-3 rounded bg-slate-100" />
                ))}
              </div>
              <div className="mt-6 h-10 rounded-lg bg-slate-200" />
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-7 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {catalog !== null && plans.map((plan) => {
          const featured = plan.featured === true;
          const discountedMonthly =
            plan.monthlyPrice === null
              ? null
              : discountedCents(
                  Math.round(plan.monthlyPrice * 100),
                  plan.discountPercent,
                  catalog?.generalDiscountPercent ?? 0,
                ) / 100;
          const discountedYearly =
            plan.monthlyPrice === null
              ? null
              : discountedCents(
                  Math.round(plan.monthlyPrice * 100) * 12,
                  plan.discountPercent,
                  catalog?.generalDiscountPercent ?? 0,
                ) / 100;
          const displayedPrice =
            plan.monthlyPrice === null
              ? null
              : billingPeriod === "yearly" && plan.monthlyPrice > 0
                ? formatPrice(
                    discountedYearly ?? 0,
                    activePriceBook?.currency ?? "USD",
                  )
                : formatPrice(
                    discountedMonthly ?? 0,
                    activePriceBook?.currency ?? "USD",
                  );

          return (
            <article
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-5 ${
                featured
                  ? "border-[#1a4bb8] bg-[#1a4bb8] text-white shadow-[0_18px_40px_rgba(26,75,184,0.22)]"
                  : "border-[#c7d3ec] bg-white text-[#08172e] shadow-[0_8px_24px_rgba(15,35,75,0.04)]"
              }`}
            >
              {featured && (
                <span className="absolute -top-3 left-5 rounded-full bg-[#d9f4f2] px-3 py-1 text-[9px] font-extrabold uppercase tracking-wide text-[#075c58]">
                  Most chosen
                </span>
              )}
              <h2 className="font-sora text-[18px] font-bold">{plan.name}</h2>
              <p
                className={`mt-2 min-h-[52px] text-[11px] leading-relaxed ${
                  featured ? "text-slate-300" : "text-slate-600"
                }`}
              >
                <PlanDescription value={plan.audience} />
              </p>
              <div
                className={`mt-2 text-[10px] font-semibold ${
                  featured ? "text-blue-100" : "text-[#1a4bb8]"
                }`}
              >
                <p>
                  {plan.usersLimit === null
                    ? "Unlimited users"
                    : `Up to ${plan.usersLimit} users`}
                </p>
                <p>
                  {plan.companyLimit === null
                    ? "Unlimited companies"
                    : `${plan.companyLimit} ${plan.companyLimit === 1 ? "company" : "companies"}`}
                </p>
                <p>
                  {plan.monthlyInvoiceLimit === null
                    ? "Unlimited invoices per month"
                    : `Up to ${plan.monthlyInvoiceLimit} invoices per month`}
                </p>
              </div>
              {plan.note && (
                <p
                  className={`mt-2 text-[10px] ${
                    featured ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  {plan.note}
                </p>
              )}
              <div className="mt-3">
                <span className="block font-sora text-[30px] font-extrabold leading-none">
                  {displayedPrice ??
                    (activePriceBook
                      ? `${activePriceBook.currency} price not set`
                      : "Price unavailable")}
                </span>
                <span
                  className={`mt-1 block text-[10px] ${
                    featured ? "text-blue-100" : "text-slate-500"
                  }`}
                >
                  {plan.monthlyPrice === 0
                    ? "forever"
                    : plan.monthlyPrice === null
                      ? ""
                      : `${billingPeriod === "monthly" ? "per month" : "per year"} (${activePriceBook?.currency ?? "USD"})`}
                </span>
              </div>
              {plan.effectiveDiscountPercent > 0 &&
                plan.monthlyPrice !== null &&
                plan.monthlyPrice > 0 && (
                  <p
                    className={`mt-1 text-[9px] ${
                      featured ? "text-blue-100" : "text-slate-400"
                    }`}
                  >
                    {plan.effectiveDiscountPercent
                      .toFixed(2)
                      .replace(/\.?0+$/, "")}
                    % discount applied
                  </p>
                )}
              {billingPeriod === "yearly" &&
                plan.monthlyPrice !== null &&
                plan.monthlyPrice > 0 && (
                  <p
                    className={`mt-1 text-[9px] ${
                      featured ? "text-blue-100" : "text-slate-400"
                    }`}
                  >
                    {formatPrice(
                      discountedMonthly ?? 0,
                      activePriceBook?.currency ?? "USD",
                    )}{" "}
                    per month, billed yearly
                  </p>
                )}
              <Link
                href="/signup"
                className={`mt-4 rounded-lg px-3 py-2.5 text-center text-[11px] font-bold transition ${
                  featured
                    ? "bg-white text-[#1a4bb8] hover:bg-blue-50"
                    : "bg-[#1a4bb8] text-white hover:bg-blue-800"
                }`}
              >
                {plan.button}
              </Link>
              <ul className="mt-4 space-y-2.5">
                {plan.features.filter((feature) => !isPlanLimitFeature(feature)).map((feature) => (
                  <li
                    key={feature}
                    className={`flex items-start gap-2 text-[10px] leading-relaxed ${
                      featured ? "text-blue-50" : "text-slate-700"
                    }`}
                  >
                    <CheckMark featured={featured} />
                    <span>{feature}</span>
                  </li>
                ))}
                <li
                  className={`border-t pt-2 text-[9px] leading-relaxed ${
                    featured
                      ? "border-blue-300/40 text-blue-50"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  <span className="font-bold">Included modules: </span>
                  {getFeatureLabels(plan.accessFeatures).join(", ")}
                </li>
              </ul>
            </article>
          );
        })}
      </div>

      {catalog !== null ? (
        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {addOns.map((addOn) => (
          <article
            key={addOn.title}
            className="rounded-xl border border-[#c7d3ec] bg-[#f1f6ff] p-4"
          >
            <h3 className="text-[10px] font-semibold text-[#0b7a75]">
              {addOn.title}
            </h3>
            <p className="mt-1 font-sora text-[20px] font-bold text-[#08172e]">
              {formatPrice(
                Math.round(addOn.usdAmount * ADD_ON_REGIONAL_RATES[activePriceBook?.currency ?? "USD"]),
                activePriceBook?.currency ?? "USD",
              )}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
              {addOn.description}
            </p>
          </article>
        ))}
        </div>
      ) : null}
      <a
        href="#compare-plans-heading"
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#c7d3ec] bg-white px-4 py-2 text-[11px] font-semibold text-[#1a4bb8] transition hover:border-[#1a4bb8] hover:bg-[#f4f7fc]"
      >
        Compare all plans
        <span aria-hidden="true">↓</span>
      </a>
    </>
  );
}

function isCatalogResponse(value: unknown): value is CatalogResponse {
  const expectedPriceBookKeys = [
    "nigeria",
    "rest_of_africa",
    "india_south_asia",
    "global",
  ];
  if (
    !value ||
    typeof value !== "object" ||
    !("plans" in value) ||
    !Array.isArray(value.plans) ||
    !value.plans.every(isCatalogPlan) ||
    !("generalDiscountPercent" in value) ||
    typeof value.generalDiscountPercent !== "number" ||
    !Number.isFinite(value.generalDiscountPercent) ||
    value.generalDiscountPercent < 0 ||
    value.generalDiscountPercent >= 100
  ) {
    return false;
  }
  const plans = value.plans;
  return (
    plans.length >= 4 &&
    plans.every((plan) => plan.active) &&
    "priceBooks" in value &&
    Array.isArray(value.priceBooks) &&
    value.priceBooks.length === expectedPriceBookKeys.length &&
    value.priceBooks.every(
      (book) =>
        !!book &&
        typeof book === "object" &&
        "key" in book &&
        expectedPriceBookKeys.includes(String(book.key)) &&
        "label" in book &&
        typeof book.label === "string" &&
        "currency" in book &&
        (book.currency === "USD" ||
          book.currency === "NGN" ||
          book.currency === "INR") &&
        "prices" in book &&
        Array.isArray(book.prices) &&
        book.prices.length ===
          plans.filter((plan) => plan.key !== "free").length &&
        book.prices.every(
          (price: unknown) =>
            !!price &&
            typeof price === "object" &&
            "plan" in price &&
            typeof price.plan === "string" &&
            /^[a-z0-9][a-z0-9_-]{1,39}$/.test(price.plan) &&
            "monthlyAmount" in price &&
            (price.monthlyAmount === null ||
              (typeof price.monthlyAmount === "number" &&
                Number.isFinite(price.monthlyAmount) &&
                price.monthlyAmount > 0)),
        ),
    )
  );
}

function isCatalogPlan(value: unknown): value is CatalogPlan {
  return (
    !!value &&
    typeof value === "object" &&
    "key" in value &&
    typeof value.key === "string" &&
    /^[a-z0-9][a-z0-9_-]{1,39}$/.test(value.key) &&
    "name" in value &&
    typeof value.name === "string" &&
    "audience" in value &&
    typeof value.audience === "string" &&
    "active" in value &&
    typeof value.active === "boolean" &&
    "features" in value &&
    Array.isArray(value.features) &&
    value.features.every((feature: unknown) => typeof feature === "string") &&
    "accessFeatures" in value &&
    Array.isArray(value.accessFeatures) &&
    value.accessFeatures.every((feature: unknown) =>
      isKnownFeature(feature),
    ) &&
    "usersLimit" in value &&
    (value.usersLimit === null ||
      (typeof value.usersLimit === "number" &&
        Number.isInteger(value.usersLimit) &&
        value.usersLimit > 0)) &&
    "companyLimit" in value &&
    (value.companyLimit === null ||
      (typeof value.companyLimit === "number" &&
        Number.isInteger(value.companyLimit) &&
        value.companyLimit > 0)) &&
    "monthlyInvoiceLimit" in value &&
    (value.monthlyInvoiceLimit === null ||
      (typeof value.monthlyInvoiceLimit === "number" &&
        Number.isInteger(value.monthlyInvoiceLimit) &&
        value.monthlyInvoiceLimit > 0)) &&
    "discountPercent" in value &&
    typeof value.discountPercent === "number" &&
    Number.isFinite(value.discountPercent) &&
    value.discountPercent >= 0 &&
    value.discountPercent < 100
  );
}

function isKnownFeature(value: unknown): value is string {
  return (
    typeof value === "string" &&
    roleAccessSections.some((section) =>
      section.features.some((feature) => feature.key === value),
    )
  );
}

function getFeatureLabels(features: string[]): string[] {
  return features.map((key) => {
    for (const section of roleAccessSections) {
      const feature = section.features.find((item) => item.key === key);
      if (feature) return feature.label;
    }
    return key;
  });
}

function discountedCents(
  amountMinor: number,
  planDiscountPercent: number,
  generalDiscountPercent: number,
): number {
  const planDiscounted = Math.round(
    amountMinor * (1 - planDiscountPercent / 100),
  );
  return Math.round(planDiscounted * (1 - generalDiscountPercent / 100));
}

function CheckMark({ featured }: { featured: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
        featured ? "text-white" : "text-cyan-700"
      }`}
      aria-hidden="true"
    >
      <path
        d="m4 10 4 4 8-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

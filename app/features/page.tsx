import type { Metadata } from "next";
import Link from "next/link";
import FeatureSectionNav from "./FeatureSectionNav";
import {
  RiBankLine,
  RiBarChartBoxLine,
  RiBriefcaseLine,
  RiBuildingLine,
  RiCalendarCheckLine,
  RiExchangeFundsLine,
  RiFileCheckLine,
  RiFileCloudLine,
  RiFileList2Line,
  RiFileTextLine,
  RiFundsLine,
  RiGlobalLine,
  RiLock2Line,
  RiPercentLine,
  RiRobot2Line,
  RiShieldUserLine,
  RiShoppingBag3Line,
  RiTimeLine,
  RiTranslate2,
  RiUserSettingsLine,
  RiWallet3Line,
} from "@remixicon/react";

export const metadata: Metadata = {
  title: "DaroBooks Features: Invoicing, Bank Reconciliation, Payroll and Tax",
  description:
    "See everything DaroBooks does: invoices and quotes, bills, bank reconciliation, multi-currency, country tax packs, payroll, approvals, budgets and reports.",
  alternates: {
    canonical: "https://darobooks.com/features",
  },
  robots: "index, follow, max-image-preview:large",
  openGraph: {
    type: "website",
    siteName: "DaroBooks",
    title: "DaroBooks Features: Invoicing, Bank Reconciliation, Payroll and Tax",
    description:
      "See everything DaroBooks does: invoices and quotes, bills, bank reconciliation, multi-currency, country tax packs, payroll, approvals, budgets and reports.",
    url: "https://darobooks.com/features",
    images: ["https://darobooks.com/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "DaroBooks Features: Invoicing, Bank Reconciliation, Payroll and Tax",
    description:
      "See everything DaroBooks does: invoices and quotes, bills, bank reconciliation, multi-currency, country tax packs, payroll, approvals, budgets and reports.",
    images: ["https://darobooks.com/og-image.png"],
  },
};

const featureSections = [
  {
    id: "inv",
    eyebrow: "Invoicing",
    title: "Bill clearly, get paid sooner",
    description:
      "Create quotes and invoices from your own price list. VAT and WHT are added for you and shown the way customers expect to read them.",
    bullets: [
      "Recurring invoices for retainers and fees",
      "Payment links and part payments",
      "Reminders by email, SMS and WhatsApp",
      "Credit notes, receipts and customer statements",
    ],
    action: "See invoices in the app",
    actionHref: "/signup",
    visual: "invoice",
  },
  {
    id: "bills",
    eyebrow: "Bills and expenses",
    title: "Know what you owe before it is due",
    description:
      "Capture supplier bills and receipts, send them through approval and schedule payment, with a clear trail of who approved what.",
    bullets: [
      "Snap a receipt on your phone and attach it",
      "Approval limits by person or amount",
      "Purchase orders matched to bills",
    ],
    action: "See bills in the app",
    actionHref: "/signup",
    visual: "bills",
  },
  {
    id: "bank",
    eyebrow: "Banking",
    title: "Reconcile without the headache",
    description:
      "Bring in statements as a file from any bank in the world. Matches are suggested for you, and you confirm with one click.",
    bullets: [
      "Rules that learn how you categorise",
      "Many accounts, naira and dollar",
      "Transfers between your own accounts handled",
    ],
    action: "See reconciliation",
    actionHref: "/signup",
    visual: "banking",
  },
  {
    id: "tax",
    eyebrow: "Tax centre",
    title: "Tax your way, in any country",
    description:
      "Tax is recorded as you work, so the figures for each filing period are already there. Pick your country and DaroBooks loads its tax names and rates. Every rate is a setting you control, not fixed in the software.",
    bullets: [],
    action: "See the tax centre",
    actionHref: "/signup",
    visual: "tax",
  },
  {
    id: "group",
    eyebrow: "Groups and branches",
    title: "Several companies, one login",
    description:
      "Each company keeps its own books, tax and bank accounts. Switch between them in a click, or view the group together.",
    bullets: [
      "Intercompany entries tracked and eliminated",
      "Different team access per company",
    ],
    action: "",
    actionHref: "/signup",
    visual: "group",
  },
  {
    id: "reports",
    eyebrow: "Reports",
    title: "Numbers your bank and accountant will accept",
    description:
      "Profit and loss, balance sheet, cash flow, trial balance, receivable and payable ageing. Compare periods, drill into any figure and export to PDF or Excel.",
    bullets: [],
    action: "See reports",
    actionHref: "/signup",
    visual: "reports",
  },
] as const;

const globalFeatures = [
  {
    title: "Any currency",
    description:
      "Invoice and pay in any currency. Rates update daily and gains or losses are booked for you.",
    icon: RiGlobalLine,
  },
  {
    title: "Country tax packs",
    description:
      "Choose a country to load its tax names, rates, filing dates and invoice rules. Edit anything.",
    icon: RiPercentLine,
  },
  {
    title: "Your language",
    description:
      "Use the app and print invoices in the language your customers read.",
    icon: RiTranslate2,
  },
  {
    title: "Local formats",
    description:
      "Dates, numbers, fiscal year and chart of accounts follow the country you pick.",
    icon: RiCalendarCheckLine,
  },
];

const moreFeatures = [
  {
    title: "Payroll and statutory",
    description:
      "Income tax, pension and social contributions worked out each month under your country's rules, with a clear list of what to remit.",
    icon: RiUserSettingsLine,
  },
  {
    title: "Partner payouts",
    description:
      "Revenue shares and per-session fees, WHT handled, and a statement sent to every partner.",
    icon: RiExchangeFundsLine,
  },
  {
    title: "Milestone billing and POs",
    description:
      "Split an invoice, for example 70/30, link it to the customer PO and apply group discounts.",
    icon: RiFileTextLine,
  },
  {
    title: "DaroStock",
    description:
      "Products and services with stock on hand, average cost and low-stock alerts, linked to every invoice and bill.",
    icon: RiShoppingBag3Line,
  },
  {
    title: "DaroCollect",
    description:
      "Get paid by card, bank transfer or mobile money. Payments match their invoices on their own, and recurring invoices send themselves.",
    icon: RiWallet3Line,
  },
  {
    title: "DaroFile",
    description:
      "e-Invoicing and filing connectors for the countries that require them, with a clear readiness checklist for each.",
    icon: RiFileCloudLine,
  },
  {
    title: "DaroAssist",
    description:
      "Suggested categories, bank rules, receipt reading and a plain-language way to ask your books a question.",
    icon: RiRobot2Line,
  },
  {
    title: "DaroTime",
    description:
      "Track hours and costs per project, bill approved time in one click and see which jobs make money.",
    icon: RiTimeLine,
  },
  {
    title: "DaroLedger",
    description:
      "Editable chart of accounts, manual journals, lock dates and a guided month-end and year-end close.",
    icon: RiFileList2Line,
  },
  {
    title: "DaroAssets",
    description:
      "A fixed asset register with automatic monthly depreciation journals.",
    icon: RiBuildingLine,
  },
  {
    title: "DaroPractice",
    description:
      "One login for all your clients, with free accountant seats and a filing calendar across countries.",
    icon: RiBriefcaseLine,
  },
  {
    title: "Requisitions and approvals",
    description:
      "Staff raise a request, each manager up the line approves or rejects it, then finance pays. Everyone involved is emailed.",
    icon: RiFileCheckLine,
  },
  {
    title: "Budgets and forecast",
    description:
      "Compare plan with actuals, and forecast revenue from scheduled work and your pipeline.",
    icon: RiFundsLine,
  },
  {
    title: "Company tax provision",
    description:
      "Provision company income tax monthly and follow a calendar of every filing date.",
    icon: RiPercentLine,
  },
  {
    title: "Revenue by business line",
    description:
      "See income by line of business and by company, with transfers between your own companies removed.",
    icon: RiBarChartBoxLine,
  },
];

const trustFeatures = [
  {
    title: "Roles and permissions",
    description: "Decide who can view, enter, approve and report.",
    icon: RiShieldUserLine,
  },
  {
    title: "Full audit trail",
    description: "Every change is logged with who made it and when.",
    icon: RiFileCheckLine,
  },
  {
    title: "Daily backups",
    description: "Your records are backed up so a bad day never costs you a year.",
    icon: RiBankLine,
  },
  {
    title: "Locked periods",
    description: "Close a month so no one changes it by accident.",
    icon: RiLock2Line,
  },
];

export default function FeaturesPage() {
  return (
    <main className="bg-white font-sora text-[#111827]">
      <section className="bg-gradient-to-b from-[#f1f6ff] to-white">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-6 pb-16 pt-12 sm:pb-20 sm:pt-16 lg:px-0">
          <p className="font-sora text-[12px] font-bold uppercase tracking-[0.14em] text-[#0b7a75]">
            Features
          </p>
          <h1 className="max-w-[820px] font-jakarta text-[38px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[52px]">
            Every part of the books, in one calm workspace
          </h1>
          <p className="max-w-[640px] font-sora text-[14px] leading-[1.65] text-slate-600 sm:text-[16px]">
            From the first quote to the year-end balance sheet. No add-ons to
            buy and no spreadsheets to patch together.
          </p>
          <FeatureSectionNav />
        </div>
      </section>

      <section aria-label="Product features">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-20 px-6 py-8 pb-20 sm:gap-24 lg:px-0">
          {featureSections.map((feature, index) => (
            <FeatureSection
              key={feature.id}
              feature={feature}
              reverse={index % 2 === 1}
            />
          ))}
        </div>
      </section>

      <FeatureCardSection
        title="Built to work anywhere"
        items={globalFeatures}
        background="blue"
      />
      <FeatureCardSection
        title="And the rest of the business"
        items={moreFeatures}
        background="white"
      />
      <FeatureCardSection
        title="Control and safety, built in"
        items={trustFeatures}
        background="grid"
      />

   
    </main>
  );
}

type FeatureSectionProps = {
  feature: (typeof featureSections)[number];
  reverse: boolean;
};

function FeatureSection({ feature, reverse }: FeatureSectionProps) {
  return (
    <article
      id={feature.id}
      className={`grid scroll-mt-28 items-center gap-8 lg:grid-cols-2 lg:gap-14 ${
        reverse ? "lg:[&>*:first-child]:order-2" : ""
      }`}
    >
      <div className="flex flex-col items-start gap-4">
        <p className="font-sora text-[11px] font-bold uppercase tracking-[0.14em] text-[#0b7a75]">
          {feature.eyebrow}
        </p>
        <h2 className="font-jakarta text-[29px] font-bold leading-[1.15] tracking-[-0.02em] text-[#111827] sm:text-[36px]">
          {feature.title}
        </h2>
        <p className="font-sora text-[16px] leading-[1.7] text-slate-600 sm:text-[17px]">
          {feature.description}
        </p>
        {feature.bullets.length > 0 && (
          <ul className="space-y-2.5 font-sora text-[15px] text-[#111827] sm:text-[16px]">
            {feature.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2.5">
                <CheckMark />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}
        {feature.action && (
          <Link
            href={feature.actionHref}
            className="mt-1 inline-flex rounded-xl bg-[#1a4bb8] px-5 py-3 font-sora text-[14px] font-semibold text-white transition hover:bg-blue-800"
          >
            {feature.action}
          </Link>
        )}
      </div>
      <FeaturePreview type={feature.visual} />
    </article>
  );
}

type PreviewType = (typeof featureSections)[number]["visual"];

function FeaturePreview({ type }: { type: PreviewType }) {
  return (
    <div className="rounded-[22px] border border-[#c7d3ec] bg-[#f1f6ff] p-5 shadow-[0_14px_36px_rgba(20,45,90,0.06)] sm:p-7">
      {type === "invoice" && <InvoicePreview />}
      {type === "bills" && <BillsPreview />}
      {type === "banking" && <BankingPreview />}
      {type === "tax" && <TaxPreview />}
      {type === "group" && <GroupPreview />}
      {type === "reports" && <ReportsPreview />}
    </div>
  );
}

function InvoicePreview() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          ["Draft", "bg-slate-200 text-slate-700"],
          ["Sent", "bg-blue-100 text-blue-800"],
          ["Due soon", "bg-amber-100 text-amber-800"],
          ["Overdue", "bg-red-100 text-red-700"],
          ["Paid", "bg-emerald-100 text-emerald-800"],
        ].map(([label, color]) => (
          <span
            key={label}
            className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${color}`}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="space-y-3 rounded-xl border border-[#dce6fb] bg-white p-4 text-[12px] sm:p-5 sm:text-[13px]">
        <div className="flex justify-between gap-4 font-semibold">
          <span>Reminder schedule</span>
          <span className="text-slate-500">Automatic</span>
        </div>
        <Reminder color="bg-blue-700">3 days before due date · Email</Reminder>
        <Reminder color="bg-amber-600">On due date · Email and SMS</Reminder>
        <Reminder color="bg-red-600">7 days overdue · WhatsApp</Reminder>
      </div>
    </div>
  );
}

function Reminder({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 text-slate-700">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {children}
    </div>
  );
}

function BillsPreview() {
  const stages = [
    ["1", "Captured", "bg-slate-200 text-slate-700"],
    ["2", "Approved", "bg-blue-100 text-blue-800"],
    ["3", "Scheduled", "bg-amber-100 text-amber-800"],
    ["4", "Paid", "bg-emerald-100 text-emerald-800"],
  ];

  return (
    <div>
      <ol className="grid grid-cols-2 gap-5 text-center sm:grid-cols-4">
        {stages.map(([number, label, color]) => (
          <li key={label} className="flex flex-col items-center gap-2">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full text-[14px] font-bold ${color}`}
            >
              {number}
            </span>
            <span className="text-[11px] font-semibold text-slate-700 sm:text-[12px]">
              {label}
            </span>
          </li>
        ))}
      </ol>
      <div className="my-5 h-1 rounded-full bg-gradient-to-r from-blue-700 to-[#0b7a75]" />
      <div className="flex flex-col justify-between gap-2 rounded-xl border border-[#dce6fb] bg-white p-4 text-[12px] sm:flex-row sm:items-center">
        <span className="font-semibold">Your bills</span>
        <span className="text-slate-500">Live workspace data</span>
      </div>
    </div>
  );
}

function BankingPreview() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-8">
      <div
        className="flex h-40 w-40 shrink-0 items-center justify-center rounded-full"
        style={{
          background:
            "conic-gradient(#1a4bb8 0deg 313deg, #dce8ff 313deg 360deg)",
        }}
        role="img"
        aria-label="87 percent of bank lines matched"
      >
        <div className="flex h-[116px] w-[116px] flex-col items-center justify-center rounded-full bg-[#f1f6ff]">
          <span className="font-sora text-[25px] font-bold text-[#1a4bb8]">
            —
          </span>
          <span className="text-[11px] text-slate-600">live data</span>
        </div>
      </div>
      <div className="space-y-3 text-[12px] text-slate-700">
        <Legend color="bg-[#1a4bb8]">Matched automatically</Legend>
        <Legend color="border border-[#1a4bb8] bg-[#dce8ff]">
          Needs your review
        </Legend>
        <p className="pt-1 text-[11px] text-slate-500">
          Match rates are calculated from your imported statements.
        </p>
      </div>
    </div>
  );
}

function Legend({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`h-3 w-3 rounded-[3px] ${color}`} />
      {children}
    </div>
  );
}

function TaxPreview() {
  const metrics = [
    ["Sales tax payable", "—", "Calculated from your records"],
    ["Withholding credits", "—", "Calculated from your records"],
    ["Payroll tax due", "—", "Calculated from your records"],
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {metrics.map(([label, value, detail]) => (
        <div
          key={label}
          className="rounded-xl border border-[#dce6fb] bg-white p-4"
        >
          <p className="text-[11px] font-bold text-[#0b7a75]">{label}</p>
          <p className="mt-2 font-sora text-[20px] font-semibold tabular-nums">
            {value}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
            {detail}
          </p>
        </div>
      ))}
    </div>
  );
}

function GroupPreview() {
  return (
    <div className="rounded-xl bg-white p-4 sm:p-6">
      <div className="mx-auto w-fit rounded-lg bg-[#1a4bb8] px-6 py-3 text-[12px] font-semibold text-white">
        Group view
      </div>
      <div className="mx-auto h-6 w-px border-l-2 border-dashed border-[#0b7a75]" />
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {["Primary workspace", "Additional workspace", "Additional workspace"].map(
          (company, index) => (
          <div
            key={`${company}-${index}`}
            className={`rounded-xl border bg-white p-3 text-center sm:p-4 ${
              index === 1 ? "border-2 border-[#1a4bb8]" : "border-[#c7d3ec]"
            }`}
          >
            <p className="text-[10px] font-semibold sm:text-[12px]">
              {company}
            </p>
            <p className="mt-2 text-[9px] text-slate-500 sm:text-[11px]">
              Own books
            </p>
          </div>
          ),
        )}
      </div>
    </div>
  );
}

function ReportsPreview() {
  const reportRows = [
    ["Revenue", "—"],
    ["Cost of sales", "—"],
    ["Operating costs", "—"],
  ];

  return (
    <div className="space-y-3 rounded-xl border border-[#dce6fb] bg-white p-4 text-[12px] sm:p-5 sm:text-[13px]">
      <div className="flex justify-between gap-3 font-bold">
        <span>Profit and loss</span>
        <span className="font-normal text-slate-500">Current reporting period</span>
      </div>
      {reportRows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 text-slate-700">
          <span>{label}</span>
          <span className="tabular-nums">{value}</span>
        </div>
      ))}
      <div className="flex justify-between gap-3 border-t-2 border-[#1a4bb8] pt-3 font-bold">
        <span>Net profit</span>
        <span className="tabular-nums">—</span>
      </div>
    </div>
  );
}

type CardFeature = {
  title: string;
  description: string;
  icon: typeof RiGlobalLine;
};

function FeatureCardSection({
  title,
  items,
  background,
}: {
  title: string;
  items: CardFeature[];
  background: "blue" | "white" | "grid";
}) {
  const sectionClass =
    background === "blue"
      ? "bg-[#f1f6ff]"
      : background === "grid"
        ? "bg-[#f1f6ff]"
        : "bg-white";

  return (
    <section
      className={sectionClass}
      style={
        background === "grid"
          ? {
              backgroundImage:
                "linear-gradient(rgba(26,75,184,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(26,75,184,0.07) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }
          : undefined
      }
    >
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-6 py-14 sm:py-20 lg:px-0">
        <h2 className="font-jakarta text-[28px] font-bold tracking-[-0.02em] sm:text-[36px]">
          {title}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className={`rounded-[18px] border border-[#c7d3ec] p-5 sm:p-6 ${
                  background === "white" ? "bg-[#f1f6ff]" : "bg-white"
                }`}
              >
                <Icon
                  size={26}
                  aria-hidden="true"
                  className="text-[#0b7a75]"
                />
                <h3 className="mt-3 font-jakarta text-[16px] font-semibold sm:text-[18px]">
                  {item.title}
                </h3>
                <p className="mt-2 font-sora text-[14px] leading-[1.65] text-slate-600">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CheckMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="mt-0.5 h-5 w-5 shrink-0 text-[#0b7a75]"
      aria-hidden="true"
    >
      <path
        d="m5 12 4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

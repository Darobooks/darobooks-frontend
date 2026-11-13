import {
  RiArrowRightLine,
  RiArrowLeftRightLine,
  RiBankLine,
  RiBankCardLine,
  RiBarChartLine,
  RiBarChartBoxLine,
  RiBillLine,
  RiExchangeFundsLine,
  RiFileCheckLine,
  RiFileCloudLine,
  RiFileList2Line,
  RiFileTextLine,
  RiFundsLine,
  RiGitBranchLine,
  RiGraduationCapLine,
  RiPercentLine,
  RiReceiptLine,
  RiRobot2Line,
  RiServiceLine,
  RiShoppingBagLine,
  RiShieldUserLine,
  RiShoppingBag3Line,
  RiToolsLine,
  RiUserSettingsLine,
  RiWallet3Line,
} from "@remixicon/react";

const features = [
  {
    title: "Invoices and quotes",
    description:
      "Branded invoices with VAT and WHT worked out, payment links and automatic reminders.",
    icon: RiFileList2Line,
  },
  {
    title: "Bills and expenses",
    description:
      "Capture supplier bills, approve them, schedule payment and keep receipts attached.",
    icon: RiReceiptLine,
  },
  {
    title: "Bank reconciliation",
    description:
      "Match bank lines to invoices and bills, and close the month with zero differences.",
    icon: RiBankLine,
  },
  {
    title: "Tax tracking",
    description:
      "Track VAT, GST, sales tax and withholding, configured for the countries you work in.",
    icon: RiPercentLine,
  },
  {
    title: "Groups and branches",
    description:
      "Run several companies from one login and see a combined view whenever you need it.",
    icon: RiGitBranchLine,
  },
  {
    title: "Payroll and statutory",
    description:
      "Run payroll with local income tax, pension and social contributions worked out.",
    icon: RiUserSettingsLine,
  },
  {
    title: "Partner payouts",
    description:
      "Manage revenue shares and per-session fees, with withholding and clear statements.",
    icon: RiExchangeFundsLine,
  },
  {
    title: "Budgets and forecast",
    description:
      "Plan against actuals and forecast revenue from scheduled work and your pipeline.",
    icon: RiFundsLine,
  },
  {
    title: "DaroStock",
    description:
      "Track products, stock on hand, average costs and low-stock alerts across invoices and bills.",
    icon: RiShoppingBag3Line,
  },
  {
    title: "DaroCollect",
    description:
      "Get paid by card, bank transfer or mobile money, with payments matched to invoices.",
    icon: RiWallet3Line,
  },
  {
    title: "DaroFile",
    description:
      "Connect e-invoicing and filing tools, with a clear readiness checklist for each country.",
    icon: RiFileCloudLine,
  },
  {
    title: "DaroAssist",
    description:
      "Get suggested categorizations, bank rules, receipt reading and plain-language help.",
    icon: RiRobot2Line,
  },
  {
    title: "Requisitions and approvals",
    description:
      "Staff raise requests, managers approve them and finance pays with everyone in sync.",
    icon: RiFileCheckLine,
  },
  {
    title: "Roles and audit trail",
    description:
      "Set approval limits and view-only access, with a log of who did what.",
    icon: RiShieldUserLine,
  },
  {
    title: "Reports you can trust",
    description:
      "See profit and loss, balance sheet, cash flow, aging and trial balance, ready to export.",
    icon: RiBarChartBoxLine,
  },
];

const workflowSteps = [
  {
    title: "Quote",
    description: "Price the work and get approval",
    icon: RiFileTextLine,
  },
  {
    title: "Invoice",
    description: "Bill with tax added correctly",
    icon: RiBillLine,
  },
  {
    title: "Payment",
    description: "Pay link, transfer or cash",
    icon: RiBankCardLine,
  },
  {
    title: "Reconcile",
    description: "Match against the bank",
    icon: RiArrowLeftRightLine,
  },
  {
    title: "Tax",
    description: "Sales tax and payroll tax tracked",
    icon: RiPercentLine,
  },
  {
    title: "Report",
    description: "Profit, cash and balance sheet",
    icon: RiBarChartLine,
  },
];

const audiences = [
  {
    title: "Small businesses",
    description:
      "Replace the notebook and spreadsheet with books you can hand to a bank or an investor.",
    icon: RiShoppingBagLine,
  },
  {
    title: "Contractors and service firms",
    description:
      "Bill by milestone, track costs per project and see margin as work progresses.",
    icon: RiToolsLine,
  },
  {
    title: "Schools and institutions",
    description:
      "Handle fees, receipts, staff payroll and grants with clear records for management.",
    icon: RiGraduationCapLine,
  },
  {
    title: "Accountants and groups",
    description:
      "Work across many clients or companies with one login and a combined view.",
    icon: RiServiceLine,
  },
];

export default function Home() {
  return (
    <main className="soft-page-enter min-h-screen bg-[#f0f7fb] font-jakarta text-[#08172e]">

      {/* Hero section */}
      <section className="mx-auto grid min-h-[490px] w-full max-w-[1180px] grid-cols-1 items-center gap-12 px-6 pb-16 pt-10 lg:grid-cols-2 lg:gap-10 lg:px-0 lg:pb-20 lg:pt-8">
        {/* Hero content */}
        <div className="max-w-[500px]">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1.5 text-[11px] font-medium text-cyan-800">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-700" />
            Accounting for businesses in any country
          </div>

          <h1 className="font-sora text-[42px] font-extrabold leading-[1.08] tracking-[-1.8px] sm:text-[48px] lg:text-[47px]">
            Know where your
            <br className="hidden sm:block" /> money stands,
            <br />
            <span className="text-blue-700">every day.</span>
          </h1>

          <p className="mt-6 max-w-[455px] text-[16px] leading-[1.65] text-slate-600">
            Invoices, bills, bank reconciliation, VAT and WHT,
            and clear reports. For one company or a whole group,
            in one place.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href="/signup"
              className="inline-flex items-center gap-3 rounded-xl bg-blue-700 px-6 py-3.5 text-[13px] font-semibold text-white transition hover:bg-blue-800"
            >
              See the app
              <span aria-hidden="true" className="text-lg leading-none">
                 <RiArrowRightLine size={18} />
              </span>
            </a>

            <a
              href="/pricing"
              className="rounded-xl border border-slate-400/80 bg-white px-6 py-3.5 text-[13px] font-semibold text-slate-900 transition hover:border-blue-700 hover:text-blue-700"
            >
              View pricing
            </a>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-[11px] font-medium text-slate-700">
            <span className="flex items-center gap-1.5">
              <CheckIcon />
              Naira and multi-currency
            </span>
            <span className="flex items-center gap-1.5">
              <CheckIcon />
              VAT and WHT built in
            </span>
            <span className="flex items-center gap-1.5">
              <CheckIcon />
              Works on phone
            </span>
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="w-full min-w-0 lg:pl-1">
          <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_25px_65px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/80">
            {/* Browser bar */}
            <div className="flex h-[31px] items-center gap-2 bg-[#0b1323] px-3">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="ml-2 text-[10px] text-slate-400">
                books.daroware.com/dashboard
              </span>
            </div>

            <div className="flex min-h-[335px] bg-[#f4f8fc]">
              {/* Sidebar */}
              <aside className="flex w-[45px] shrink-0 flex-col items-center gap-[14px] bg-[#101d35] py-[14px] sm:w-[45px] sm:gap-[14px]">
                <div className="h-6 w-6 rounded-[8px] bg-blue-700" />
                <div className="h-[18px] w-[18px] rounded-md bg-[#304a71]" />
                <div className="h-[18px] w-[18px] rounded-md bg-[#304a71]" />
                <div className="h-[18px] w-[18px] rounded-md bg-[#304a71]" />
                <div className="h-[18px] w-[18px] rounded-md bg-[#304a71]" />
              </aside>

              {/* Dashboard content */}
              <div className="min-w-0 flex-1 p-3 sm:p-4">
                {/* Financial summary cards */}
                <div className="grid grid-cols-3 gap-2">
                  <SummaryCard
                    label="Cash in bank"
                    value="$184,205"
                  />
                  <SummaryCard label="Owed to you" value="$69,050" />
                  <SummaryCard label="You owe" value="$23,108" />
                </div>

                {/* Chart card */}
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2 text-[10px] text-slate-700">
                    <span>Money in and out</span>
                    <span className="shrink-0">Last 6 months</span>
                  </div>

                  <div className="relative mt-4 h-[120px] overflow-hidden">
                    {/* Chart grid lines */}
                    <div className="absolute inset-x-0 top-[8px] border-t border-slate-200" />
                    <div className="absolute inset-x-0 top-[42px] border-t border-slate-200" />
                    <div className="absolute inset-x-0 top-[76px] border-t border-slate-200" />
                    <div className="absolute inset-x-0 top-[110px] border-t border-slate-200" />

                    {/* Chart bars */}
                    <div className="absolute inset-0 flex items-end justify-around gap-1 px-1">
                      {[
                        [68, 46],
                        [78, 50],
                        [60, 42],
                        [84, 55],
                        [74, 48],
                        [94, 61],
                      ].map(([income, expense], index) => (
                        <div
                          key={index}
                          className="flex h-full flex-1 items-end justify-center gap-1"
                        >
                          <div
                            className="w-[45%] max-w-[22px] rounded-t-[4px] bg-blue-700"
                            style={{ height: `${income}%` }}
                          />
                          <div
                            className="w-[45%] max-w-[22px] rounded-t-[4px] bg-cyan-300"
                            style={{ height: `${expense}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent invoices */}
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white px-3">
                  <InvoiceRow
                    invoice="INV-0148"
                    customer="Brightway Schools"
                    amount="$12,500"
                    status="Paid"
                    paid
                  />
                  <InvoiceRow
                    invoice="INV-0149"
                    customer="Lekki Harbour Foods"
                    amount="$8,170"
                    status="Due in 5 days"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Global business features"
        className="w-full bg-[#0b1323] text-white"
      >
        <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-x-8 gap-y-4 px-6 py-5 text-[12px] font-medium sm:text-[13px] lg:px-0">
          <h2 className="font-sora text-[11px] font-bold tracking-[1.2px] text-cyan-300">
            MADE FOR HOW THE WORLD TRADES
          </h2>
          <p>VAT, GST and sales tax</p>
          <p>Withholding tax</p>
          <p>Payroll rules by country</p>
          <p>Any currency, live rates</p>
          <p>Bank files from any bank</p>
        </div>
      </section>

      <section id="features" className="w-full bg-white">
        <div className="mx-auto w-full max-w-[1180px] px-6 py-14 sm:py-16 lg:px-0">
          <div className="mb-7 flex items-end justify-between gap-5">
            <div>
              <p className="font-sora text-[10px] font-bold tracking-[1.4px] text-cyan-700">
                WHAT&apos;S INSIDE
              </p>
              <h2 className="mt-2 max-w-[650px] text-[27px] font-extrabold leading-[1.1] tracking-[-0.8px] text-[#08172e] sm:text-[34px]">
                Everything your accountant asks for, ready when they ask
              </h2>
            </div>
            <a
              href="#features"
              className="mb-1 shrink-0 rounded-lg bg-blue-700 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-800"
            >
              All features
            </a>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="rounded-xl border border-[#d5e1ee] bg-[#f4f8fc] p-4"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-white">
                    <Icon size={19} aria-hidden="true" />
                  </div>
                  <h3 className="text-[15px] font-bold text-[#08172e]">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-[1.55] text-slate-600">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="workflow-heading"
        className="w-full bg-[#f4f8fc] text-[#08172e]"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, #ffffff 0%, rgba(255, 255, 255, 0) 30%), linear-gradient(to bottom, transparent 65%, #f4f8fc 100%), linear-gradient(to right, rgba(65, 112, 185, 0.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(65, 112, 185, 0.09) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 100% 100%, 56px 56px, 56px 56px",
          backgroundRepeat: "no-repeat, no-repeat, repeat, repeat",
        }}
      >
        <div className="mx-auto w-full max-w-[1180px] px-6 py-16 sm:py-20 lg:px-0">
          <p className="font-sora text-[10px] font-bold tracking-[1.4px] text-cyan-700">
            ONE TRAIL FROM SALE TO REPORT
          </p>
          <h2
            id="workflow-heading"
            className="mt-3 max-w-[620px] text-[28px] font-extrabold leading-[1.12] tracking-[-0.8px] sm:text-[38px]"
          >
            Enter it once. It flows everywhere it should.
          </h2>

          <div className="relative mt-10 font-sora text-[13px] sm:mt-12">
            <div
              aria-hidden="true"
              className="absolute left-[8%] right-[8%] top-7 hidden h-[2px] bg-gradient-to-r from-blue-700 to-cyan-400 lg:block"
            />
            <ol className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-3">
              {workflowSteps.map((step) => {
                const Icon = step.icon;

                return (
                  <li
                    key={step.title}
                    className="relative flex flex-col items-center text-center"
                  >
                    <div className="z-10 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-700 bg-white text-cyan-700">
                      <Icon size={20} aria-hidden="true" />
                    </div>
                    <h3 className="mt-2 text-[12px] font-semibold">
                      {step.title}
                    </h3>
                    <p className="mt-2 max-w-[150px] text-[12px] leading-relaxed text-slate-600">
                      {step.description}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      <section className="w-full bg-[#f4f8fc]">
        <div className="mx-auto grid w-full max-w-[1180px] gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-x-10 lg:gap-y-16 lg:px-0">
          <div>
            <p className="font-sora text-[10px] font-bold tracking-[1.4px] text-cyan-700">
              GET PAID FASTER
            </p>
            <h2 className="mt-3 max-w-[480px] text-[27px] font-extrabold leading-[1.12] tracking-[-0.8px] text-[#08172e] sm:text-[34px]">
              Invoices that look professional and chase themselves
            </h2>
            <p className="mt-3 max-w-[490px] text-[13px] leading-[1.65] text-slate-600">
              Send an invoice with VAT and WHT worked out, add a payment link,
              and let gentle reminders go out before and after the due date.
              See who has opened it.
            </p>
            <ul className="mt-4 space-y-2 text-[12px] font-medium text-slate-700">
              <li className="flex items-center gap-2">
                <CheckIcon />
                Quotes that convert to invoices in one click
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon />
                Automatic reminders by email, SMS and WhatsApp
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon />
                Part payments and credit notes handled properly
              </li>
            </ul>
          </div>

          <article
            aria-label="Invoice preview"
            className="rounded-2xl border border-[#d5e1ee] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.10)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-[14px] font-bold text-[#08172e]">
                  Invoice INV-0149
                </h3>
                <p className="mt-1 text-[10px] text-slate-500">
                  Lekki Harbour Foods · Due 21 Oct 2026
                </p>
              </div>
              <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[9px] font-semibold text-orange-700">
                Sent
              </span>
            </div>

            <div className="space-y-2.5 py-4 text-[11px]">
              <InvoiceAmount label="Network cabling, Phase 1" amount="$6,200" />
              <InvoiceAmount label="Switch and access points" amount="$1,400" />
              <InvoiceAmount label="VAT, GST and sales tax" amount="$570" />
              <InvoiceAmount
                label="WHT 5% (deducted by customer)"
                amount="−$380"
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 py-4">
              <span className="text-[11px] font-semibold text-[#08172e]">
                Amount to receive
              </span>
              <span className="text-[22px] font-extrabold tracking-tight text-[#08172e]">
                $7,790
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-lg bg-blue-700 px-3 py-2.5 text-[10px] font-semibold text-white"
              >
                Copy payment link
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-[10px] font-semibold text-[#08172e]"
              >
                Send reminder
              </button>
            </div>
          </article>

          <article
            aria-label="Bank reconciliation preview"
            className="rounded-2xl border border-[#d5e1ee] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.10)] sm:p-6"
          >
            <div className="space-y-2">
              <BankMatchRow
                dot="bg-cyan-700"
                title="Transfer · Brightway Schools"
                amount="$12,500"
                status="Matched INV-0148"
              />
              <BankMatchRow
                dot="bg-cyan-700"
                title="POS settlement · Daily"
                amount="$3,124"
                status="Matched sales"
              />
              <BankMatchRow
                dot="bg-amber-600"
                title="Debit · Fuel and diesel"
                amount="−$480"
                status="Needs a category"
                needsAttention
              />
            </div>
            <div className="mt-4 flex items-center justify-between text-[9px] text-slate-500">
              <span>2 of 3 lines matched</span>
              <span className="font-semibold text-[#08172e]">
                Difference: $0
              </span>
            </div>
          </article>

          <div>
            <p className="font-sora text-[10px] font-bold tracking-[1.4px] text-cyan-700">
              CLOSE THE MONTH QUICKLY
            </p>
            <h2 className="mt-3 max-w-[480px] text-[27px] font-extrabold leading-[1.12] tracking-[-0.8px] text-[#08172e] sm:text-[34px]">
              Reconcile the bank in minutes, not days
            </h2>
            <p className="mt-3 max-w-[490px] text-[13px] leading-[1.65] text-slate-600">
              Upload a statement from your bank. DaroBooks matches lines to
              invoices and bills, suggests the rest, and shows what is still
              unmatched.
            </p>
            <a
              href="#features"
              className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2.5 text-[11px] font-semibold text-white transition hover:bg-blue-800"
            >
              See reconciliation
            </a>
          </div>
        </div>
      </section>

      <section id="who-its-for" className="w-full bg-white">
        <div className="mx-auto w-full max-w-[1180px] px-6 py-14 sm:py-16 lg:px-0">
          <p className="font-sora text-[10px] font-bold tracking-[1.4px] text-cyan-700">
            WHO IT IS FOR
          </p>
          <h2 className="mt-2 max-w-[700px] text-[27px] font-extrabold leading-[1.12] tracking-[-0.8px] text-[#08172e] sm:text-[34px]">
            Built for people who keep the books, and people who read them
          </h2>

          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 font-sora text-[12px] text-slate-700">
            {audiences.map((audience) => {
              const Icon = audience.icon;

              return (
                <article
                  key={audience.title}
                  className="rounded-xl border border-[#d5e1ee] bg-white p-4"
                >
                  <Icon
                    size={20}
                    aria-hidden="true"
                    className="mb-3 text-cyan-700"
                  />
                  <h3 className="text-[14px] font-bold leading-snug text-[#08172e]">
                    {audience.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-[1.55] text-slate-600">
                    {audience.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-3.5 w-3.5 shrink-0 text-cyan-700"
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

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[10px] border border-slate-200 bg-white px-2 py-2.5 sm:px-3">
      <p className="truncate text-[9px] text-slate-600 sm:text-[10px]">
        {label}
      </p>
      <p className="truncate text-[13px] font-bold leading-5 tracking-tight text-slate-900 sm:text-[15px]">
        {value}
      </p>
    </div>
  );
}

function InvoiceAmount({
  label,
  amount,
}: {
  label: string;
  amount: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-slate-600">
      <span>{label}</span>
      <span className="shrink-0 font-medium text-[#08172e]">{amount}</span>
    </div>
  );
}

function BankMatchRow({
  dot,
  title,
  amount,
  status,
  needsAttention = false,
}: {
  dot: string;
  title: string;
  amount: string;
  status: string;
  needsAttention?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-3 py-3 text-[9px] sm:grid-cols-[minmax(0,1fr)_auto_auto] ${
        needsAttention
          ? "border border-amber-300 bg-amber-50"
          : "bg-[#f4f8fc]"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2 font-medium text-[#08172e]">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
        <span className="truncate">{title}</span>
      </span>
      <span className="font-semibold text-[#08172e]">{amount}</span>
      <span
        className={`col-span-2 pl-3.5 text-[8px] sm:col-span-1 sm:pl-0 ${
          needsAttention ? "text-amber-700" : "text-cyan-800"
        }`}
      >
        {status}
      </span>
    </div>
  );
}

function InvoiceRow({
  invoice,
  customer,
  amount,
  status,
  paid = false,
}: {
  invoice: string;
  customer: string;
  amount: string;
  status: string;
  paid?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 border-b border-slate-100 py-3 last:border-0">
      <p className="min-w-0 flex-1 truncate text-[10px] font-medium text-slate-900">
        {invoice} · {customer}
      </p>

      <p className="shrink-0 text-[10px] font-semibold text-slate-900">
        {amount}
      </p>

      <span
        className={`ml-1 shrink-0 rounded-full px-2 py-1 text-[8px] font-semibold ${
          paid
            ? "bg-emerald-100 text-emerald-700"
            : "bg-orange-100 text-orange-700"
        }`}
      >
        {status}
      </span>
    </div>
  );
}

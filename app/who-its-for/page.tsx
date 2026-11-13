import type { Metadata } from "next";
import Link from "next/link";
import {
  RiArrowRightLine,
  RiGraduationCapLine,
  RiServiceLine,
  RiShoppingBagLine,
  RiToolsLine,
} from "@remixicon/react";

export const metadata: Metadata = {
  title: "Who DaroBooks Is For",
  description:
    "DaroBooks helps small businesses, contractors, schools, and accountants manage their books with clear records and less manual work.",
  alternates: {
    canonical: "https://darobooks.com/who-its-for",
  },
};

const audiences = [
  {
    title: "Small businesses",
    description:
      "Replace the notebook and spreadsheet with books you can confidently share with a bank, investor, or accountant.",
    details: [
      "Send quotes and invoices, and track what is due",
      "Keep bills, expenses, and receipts together",
      "See cash flow and reports in one place",
    ],
    icon: RiShoppingBagLine,
  },
  {
    title: "Contractors and service firms",
    description:
      "Keep project costs and customer billing connected, so you can see how each job is progressing.",
    details: [
      "Bill by milestone and track customer purchase orders",
      "Record project time and costs",
      "Review project margins as work progresses",
    ],
    icon: RiToolsLine,
  },
  {
    title: "Schools and institutions",
    description:
      "Keep fees, receipts, payroll, and grant records organized for staff and management.",
    details: [
      "Record incoming fees and other payments",
      "Track expenses and approvals",
      "Prepare clear reports for management",
    ],
    icon: RiGraduationCapLine,
  },
  {
    title: "Accountants and groups",
    description:
      "Work across client books or multiple companies from one login, with a clear view of each set of records.",
    details: [
      "Switch between companies while keeping books separate",
      "Give team members access appropriate to their role",
      "Review combined group reporting and intercompany entries",
    ],
    icon: RiServiceLine,
  },
];

export default function WhoItsForPage() {
  return (
    <main className="min-h-screen bg-white font-jakarta text-[#08172e]">
      <section className="bg-gradient-to-b from-[#f1f6ff] to-white">
        <div className="mx-auto w-full max-w-[1180px] px-6 py-16 sm:py-20 lg:px-0">
          <p className="font-sora text-[11px] font-bold uppercase tracking-[1.4px] text-[#0b7a75]">
            Who it is for
          </p>
          <h1 className="mt-3 max-w-[760px] font-jakarta text-[34px] font-extrabold leading-[1.1] tracking-[-1px] sm:text-[48px]">
            Built for people who keep the books, and people who read them
          </h1>
          <p className="mt-5 max-w-[650px] font-sora text-[15px] leading-[1.7] text-slate-600 sm:text-[17px]">
            Whether you run one business or support many, DaroBooks brings
            everyday accounting into one clear workspace.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1a4bb8] px-5 py-3 text-[13px] font-semibold text-white transition hover:bg-blue-800"
            >
              Start free <RiArrowRightLine size={17} aria-hidden="true" />
            </Link>
            <Link
              href="/features"
              className="rounded-xl border border-[#c7d3ec] bg-white px-5 py-3 text-[13px] font-semibold text-[#1a4bb8] transition hover:border-[#1a4bb8]"
            >
              Explore features
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Businesses DaroBooks supports">
        <div className="mx-auto w-full max-w-[1180px] px-6 py-12 sm:py-16 lg:px-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {audiences.map((audience) => {
              const Icon = audience.icon;

              return (
                <article
                  key={audience.title}
                  className="rounded-2xl border border-[#d5e1ee] bg-[#f8fbff] p-6 sm:p-8"
                >
                  <Icon
                    size={28}
                    aria-hidden="true"
                    className="text-[#0b7a75]"
                  />
                  <h2 className="mt-4 font-jakarta text-[20px] font-bold sm:text-[23px]">
                    {audience.title}
                  </h2>
                  <p className="mt-2 font-sora text-[14px] leading-[1.7] text-slate-600 sm:text-[15px]">
                    {audience.description}
                  </p>
                  <ul className="mt-5 space-y-3 font-sora text-[13px] text-slate-700 sm:text-[14px]">
                    {audience.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-2.5">
                        <CheckMark />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#f1f6ff]">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-6 py-12 sm:flex-row sm:items-center sm:justify-between sm:py-14 lg:px-0">
          <div>
            <h2 className="font-jakarta text-[24px] font-bold sm:text-[29px]">
              Ready to get your books in order?
            </h2>
            <p className="mt-2 font-sora text-[14px] text-slate-600">
              Start free and bring your business records together.
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#1a4bb8] px-5 py-3 text-[13px] font-semibold text-white transition hover:bg-blue-800"
          >
            View pricing <RiArrowRightLine size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function CheckMark() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="mt-0.5 h-4 w-4 shrink-0 text-[#0b7a75]"
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

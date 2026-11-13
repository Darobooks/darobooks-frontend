"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RiArrowRightLine, RiCalendarLine } from "@remixicon/react";
import { showToast } from "@/app/components/toast";

type TaxCenterData = {
  period: string;
  currency: string;
  taxRates: { vat: number; wht: number };
  sources: {
    invoices: { date: string; customer: string; invoice: string; subtotal: number; vat: number; withholding: number; status: string }[];
    bills: { date: string; supplier: string; bill: string; amount: number; inputVat: number; status: string }[];
    payouts: { period: string; partner: string; owed: number; withholding: number; vat: number; activityWithholding: number; status: string }[];
    payroll: { period: string; paye: number; employeePension: number; employerPension: number; vat: number; withholding: number; status: string }[];
  };
  vat: { output: number; input: number; payable: number };
  withholding: { total: number; credits: { customer: string; invoice: string; amount: number; status: "Requested" | "Received" }[] };
  payroll: { paye: number; pension: number; status: string };
  incomeTax: { profitBeforeTax: number; rate: number; provision: number };
};
const API_BASE_URL = (process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000").replace(/\/+$/, "");

export default function DashboardTaxCenter({ search = "" }: { search?: string }) {
  const [data, setData] = useState<TaxCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<"vat" | "withholding" | "payroll" | null>(null);
  const router = useRouter();
  const money = (value: number) => `${data?.currency ?? "USD"} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const load = useCallback(async () => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/tax-center`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as TaxCenterData & { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Could not load the tax centre.");
      setData(payload);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Could not load the tax centre.", "error");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const monthLabel = data ? new Date(`${data.period}-01T00:00:00`).toLocaleString(undefined, { month: "long", year: "numeric" }) : "Current period";
  const calculated = useMemo(() => {
    if (!data) return null;
    const output = data.sources.invoices.reduce((total, invoice) => total + invoice.vat, 0)
      + data.sources.payouts.reduce((total, payout) => total + payout.vat, 0);
    const input = data.sources.bills.reduce((total, bill) => total + bill.inputVat, 0);
    const withholding = data.sources.invoices.reduce((total, invoice) => total + invoice.withholding, 0)
      + data.sources.payouts.reduce((total, payout) => total + payout.withholding + payout.activityWithholding, 0);
    const profitBeforeTax = data.sources.invoices.reduce((total, invoice) => total + invoice.subtotal, 0)
      - data.sources.bills.reduce((total, bill) => total + bill.amount, 0)
      - data.sources.payouts.reduce((total, payout) => total + payout.owed, 0);
    return {
      vat: { output, input, payable: output - input },
      withholding,
      credits: data.sources.invoices
        .filter((invoice) => invoice.withholding > 0 && invoice.status !== "cancelled")
        .map((invoice) => ({
          customer: invoice.customer,
          invoice: invoice.invoice,
          amount: invoice.withholding,
          status: invoice.status === "paid" ? "Received" as const : "Requested" as const,
        })),
      payroll: {
        paye: data.sources.payroll.reduce((total, run) => total + run.paye, 0),
        pension: data.sources.payroll.reduce((total, run) => total + run.employeePension + run.employerPension, 0),
        status: data.sources.payroll[0]?.status ?? "No payroll run",
      },
      incomeTax: {
        profitBeforeTax,
        provision: Math.max(profitBeforeTax, 0) * data.incomeTax.rate / 100,
      },
    };
  }, [data]);
  if (loading) return <div className="rounded-xl border border-[#dfe7f4] bg-white px-4 py-12 text-center text-[10px] text-slate-500">Loading tax centre…</div>;
  if (!data) return <p role="alert" className="text-[11px] text-slate-700">Tax centre data could not be loaded. Please reload or try again.</p>;
  if (!calculated) return null;
  return (
    <section aria-labelledby="tax-centre-heading" className="space-y-3">
      <header><p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#087b74]">DaroTax</p><h1 id="tax-centre-heading" className="font-jakarta text-[19px] font-bold text-[#10213c] sm:text-[21px]">Tax centre</h1><p className="mt-1 text-[10px] text-slate-600">Year-to-date figures through {monthLabel}, built from your invoices, bills, payouts and payroll.</p></header>
      <div className="grid gap-2 lg:grid-cols-3">
        <TaxCard label="VAT" value={money(calculated.vat.payable)} badge="Review ready" detail={`Output ${money(calculated.vat.output)} · Input ${money(calculated.vat.input)}`} due="21 days" onReview={() => setReview("vat")} />
        <TaxCard label="Withholding tax" value={money(calculated.withholding)} badge="Tracking" detail={`Credits across ${calculated.credits.length} invoice${calculated.credits.length === 1 ? "" : "s"}`} due="21 days" onReview={() => setReview("withholding")} />
        <TaxCard label="PAYE and pension" value={money(calculated.payroll.paye + calculated.payroll.pension)} badge={calculated.payroll.status === "No payroll run" ? "Awaiting payroll" : "Tracking"} detail={`PAYE ${money(calculated.payroll.paye)} · Pension ${money(calculated.payroll.pension)}`} due="10 days" onReview={() => setReview("payroll")} />
      </div>
      {review ? <ReviewPanel review={review} data={data} calculated={calculated} money={money} onClose={() => setReview(null)} onOpen={(path) => router.push(path)} /> : null}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-[#dfe7f4] bg-white p-3"><h2 className="text-[10px] font-bold text-[#10213c]">VAT calculation</h2><div className="mt-3 space-y-2 text-[9px]"><Row label="VAT on sales (output)" value={money(calculated.vat.output)} /><Row label="VAT on purchases (input)" value={`−${money(calculated.vat.input)}`} /><Row label="VAT payable" value={money(calculated.vat.payable)} strong /></div><div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[#1e4fc1]"><span className="bg-[#1e4fc1]" style={{ width: `${calculated.vat.output ? Math.max(10, (calculated.vat.payable / calculated.vat.output) * 100) : 0}%` }} /><span className="bg-[#087b74]" style={{ width: `${calculated.vat.output ? (calculated.vat.input / calculated.vat.output) * 100 : 0}%` }} /></div><p className="mt-2 text-[8px] text-slate-500">Configured VAT rate: {data.taxRates.vat}% · Input VAT is shown only when recorded on bills.</p></section>
        <section className="rounded-xl border border-[#dfe7f4] bg-white p-3"><div className="flex items-center justify-between"><h2 className="text-[10px] font-bold text-[#10213c]">Withholding tax credits</h2><button type="button" onClick={() => setReview("withholding")} className="text-[8px] font-bold text-[#1e4fc1]">Review <RiArrowRightLine className="inline h-3 w-3" /></button></div>{calculated.credits.filter((credit) => `${credit.customer} ${credit.invoice}`.toLowerCase().includes(search.trim().toLowerCase())).length ? <div className="mt-2 divide-y divide-[#edf1f7]">{calculated.credits.filter((credit) => `${credit.customer} ${credit.invoice}`.toLowerCase().includes(search.trim().toLowerCase())).map((credit) => <div key={credit.invoice} className="flex items-center justify-between gap-2 py-2 text-[8px]"><div><p className="font-semibold text-[#10213c]">{credit.customer}</p><p className="text-slate-500">{credit.invoice}</p></div><strong>{money(credit.amount)}</strong><span className={`rounded-full px-2 py-1 text-[7px] font-bold ${credit.status === "Received" ? "bg-[#e6f7f3] text-[#087b74]" : "bg-[#fff0d9] text-[#9a5600]"}`}>{credit.status}</span></div>)}</div> : <p className="mt-4 rounded-lg bg-[#f8faff] px-3 py-5 text-center text-[9px] text-slate-500">No withholding credits recorded this period.</p>}</section>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><section className="rounded-xl border border-[#dfe7f4] bg-white p-3"><h2 className="text-[10px] font-bold text-[#10213c]">Company income tax provision</h2><div className="mt-3 space-y-2 text-[9px]"><Row label="Profit before tax, year to date" value={money(calculated.incomeTax.profitBeforeTax)} /><Row label="Estimated rate (tax setting)" value={`${data.incomeTax.rate}%`} /><Row label="Provision to date" value={money(calculated.incomeTax.provision)} strong /></div><p className="mt-3 text-[8px] text-slate-500">This estimate is calculated from year-to-date invoice revenue less recorded bills.</p></section><ComplianceCalendar period={data.period} /></div>
      <p className="text-[9px] leading-relaxed text-slate-500">Tax rates and due dates vary by country. Update your tax settings in Settings so these calculations match your filing obligations.</p>
    </section>
  );
}

function ReviewPanel({
  review,
  data,
  calculated,
  money,
  onClose,
  onOpen,
}: {
  review: "vat" | "withholding" | "payroll";
  data: TaxCenterData;
  calculated: {
    vat: { output: number; input: number; payable: number };
    withholding: number;
    credits: { customer: string; invoice: string; amount: number; status: "Requested" | "Received" }[];
    payroll: { paye: number; pension: number; status: string };
  };
  money: (value: number) => string;
  onClose: () => void;
  onOpen: (path: string) => void;
}) {
  const title = review === "vat" ? "VAT source records" : review === "withholding" ? "Withholding source records" : "Payroll source records";
  const openPath = review === "vat" ? "/dashboard/invoices" : review === "withholding" ? "/dashboard/invoices" : "/dashboard/payroll";
  const records = review === "vat"
    ? [
        ...data.sources.invoices.map((item) => ({ label: item.invoice, detail: item.customer, amount: item.vat, status: item.status })),
        ...data.sources.bills.map((item) => ({ label: item.bill, detail: item.supplier, amount: item.inputVat, status: item.status })),
        ...data.sources.payouts.map((item) => ({ label: item.partner, detail: item.period, amount: item.vat, status: item.status })),
      ]
    : review === "withholding"
      ? [
          ...data.sources.invoices.map((item) => ({ label: item.invoice, detail: item.customer, amount: item.withholding, status: item.status })),
          ...data.sources.payouts.map((item) => ({ label: item.partner, detail: item.period, amount: item.withholding + item.activityWithholding, status: item.status })),
        ]
      : data.sources.payroll.map((item) => ({ label: item.period, detail: item.status, amount: item.paye + item.employeePension + item.employerPension, status: item.status }));
  return (
    <section className="rounded-xl border border-[#b9ccef] bg-[#f8faff] p-3" aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <div><h2 className="text-[10px] font-bold text-[#10213c]">{title}</h2><p className="mt-1 text-[8px] text-slate-500">Values loaded from the Spending records available to this workspace.</p></div>
        <button type="button" onClick={onClose} className="text-[9px] font-bold text-slate-500">Close</button>
      </div>
      {records.length ? <div className="mt-2 divide-y divide-[#dfe7f4]">{records.slice(0, 20).map((record, index) => <div key={`${record.label}-${index}`} className="flex items-center justify-between gap-2 py-2 text-[8px]"><div><p className="font-semibold text-[#10213c]">{record.label}</p><p className="text-slate-500">{record.detail} · {record.status}</p></div><strong>{money(record.amount)}</strong></div>)}</div> : <p className="mt-3 rounded-lg bg-white px-3 py-4 text-center text-[9px] text-slate-500">No {review} records are available for the current period.</p>}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#dfe7f4] pt-3 text-[8px]"><span>{review === "vat" ? `Output ${money(calculated.vat.output)} · Input ${money(calculated.vat.input)}` : review === "withholding" ? `Total ${money(calculated.withholding)}` : `PAYE ${money(calculated.payroll.paye)} · Pension ${money(calculated.payroll.pension)}`}</span><button type="button" onClick={() => onOpen(openPath)} className="font-bold text-[#1e4fc1]">Open Spending page <RiArrowRightLine className="inline h-3 w-3" /></button></div>
    </section>
  );
}

function TaxCard({ label, value, badge, detail, due, onReview }: { label: string; value: string; badge: string; detail: string; due: string; onReview: () => void }) {
  return <article className="rounded-xl border border-[#dfe7f4] bg-white p-3"><div className="flex items-center justify-between"><h2 className="text-[10px] font-bold text-[#10213c]">{label}</h2><span className="rounded-full bg-[#e6efff] px-2 py-1 text-[7px] font-bold text-[#1e4fc1]">{badge}</span></div><p className="mt-3 text-[17px] font-bold text-[#10213c]">{value}</p><p className="mt-1 text-[8px] text-slate-500">{detail}</p><div className="mt-3 flex items-center justify-between text-[8px]"><strong>Due in {due}</strong><button type="button" onClick={onReview} className="rounded-md bg-[#1e4fc1] px-2.5 py-1.5 font-bold text-white">Review</button></div></article>;
}
function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div className={`flex justify-between gap-3 ${strong ? "border-t border-[#1e4fc1] pt-2 font-bold text-[#10213c]" : "text-slate-600"}`}><span>{label}</span><span>{value}</span></div>; }
function ComplianceCalendar({ period }: { period: string }) {
  const month = new Date(`${period}-01T00:00:00`);
  const due = (day: number) => new Date(month.getFullYear(), month.getMonth() + 1, day).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return <section className="rounded-xl border border-[#dfe7f4] bg-white p-3"><h2 className="text-[10px] font-bold text-[#10213c]">Compliance calendar</h2><div className="mt-2 space-y-2 text-[9px]"><CalendarRow label="PAYE remittance" date={due(10)} /><CalendarRow label="Pension remittance" date={due(9)} /><CalendarRow label="NSITF" date={due(16)} /><CalendarRow label="VAT and WHT returns" date={due(21)} /></div></section>;
}
function CalendarRow({ label, date }: { label: string; date: string }) { return <div className="flex items-center justify-between"><span className="font-semibold text-[#10213c]"><RiCalendarLine className="mr-1 inline h-3 w-3 text-slate-500" />{label}</span><span className="rounded-full bg-[#e6efff] px-2 py-1 text-[7px] font-bold text-[#1e4fc1]">{date}</span></div>; }

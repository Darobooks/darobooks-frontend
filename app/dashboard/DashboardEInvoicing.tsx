"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RiArrowRightLine, RiCheckLine, RiCloseLine, RiSettings3Line } from "@remixicon/react";
import { showToast } from "@/app/components/toast";

type EInvoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  currency: string;
  total: number;
  status: string;
  filingStatus: "not_submitted" | "ready" | "submitted";
  taxAuthorityReference: string | null;
  externalSubmissionReference: string | null;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000").replace(/\/+$/, "");

type EInvoicingPayload = {
  countryCode: string;
  submissionMode: "self_managed";
  taxIdentificationNumber: string | null;
  readiness: {
    taxIdentificationNumber: boolean;
    companyRegistered: boolean;
    systemConfigured: boolean;
    testInvoicesCleared: boolean;
  };
  invoices: EInvoice[];
  message?: string;
};
const countries = [
  { code: "NG", name: "Nigeria", authority: "Nigeria Revenue Service" },
  { code: "KE", name: "Kenya", authority: "Kenya Revenue Authority" },
  { code: "GH", name: "Ghana", authority: "Ghana Revenue Authority" },
  { code: "IN", name: "India", authority: "Goods and Services Tax Network" },
  { code: "GB", name: "United Kingdom", authority: "HM Revenue & Customs" },
] as const;

export default function DashboardEInvoicing({ search = "" }: { search?: string }) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<EInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("NG");
  const [taxIdentificationNumber, setTaxIdentificationNumber] = useState("");
  const [readiness, setReadiness] = useState<EInvoicingPayload["readiness"]>({
    taxIdentificationNumber: false,
    companyRegistered: false,
    systemConfigured: false,
    testInvoicesCleared: false,
  });

  const load = useCallback(async () => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/e-invoicing`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as EInvoicingPayload;
      if (!response.ok) throw new Error(payload.message ?? "Could not load invoices.");
      setInvoices(Array.isArray(payload.invoices) ? payload.invoices : []);
      setSelectedCountry(payload.countryCode);
      setTaxIdentificationNumber(payload.taxIdentificationNumber ?? "");
      setReadiness(payload.readiness);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not load invoices.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const country = countries.find((item) => item.code === selectedCountry) ?? countries[0];
  const setupComplete = readiness.taxIdentificationNumber && readiness.companyRegistered && readiness.systemConfigured;
  const selectCountry = async (countryCode: string) => {
    setSelectedCountry(countryCode);
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/e-invoicing/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({
          countryCode,
          taxIdentificationNumber,
          companyRegistered: readiness.companyRegistered,
          testInvoicesCleared: readiness.testInvoicesCleared,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message ?? "Could not save filing country.");
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not save filing country.", "error");
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visibleInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return invoices.filter((invoice) => !query || `${invoice.invoiceNumber} ${invoice.customerName}`.toLowerCase().includes(query));
  }, [invoices, search]);

  return (
    <section className="space-y-3" aria-labelledby="e-invoicing-heading">
      <header>
        <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#087b74]">DaroFile</p>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 id="e-invoicing-heading" className="font-jakarta text-[19px] font-bold text-[#10213c] sm:text-[21px]">e-Invoicing and tax filing</h1>
            <p className="mt-1 text-[10px] text-slate-600">Prepare invoices for electronic submission and keep filing activity in one place.</p>
          </div>
          <button type="button" onClick={() => setSettingsOpen((open) => !open)} className="flex items-center gap-1.5 rounded-lg border border-[#cbd8ef] bg-white px-3 py-2 text-[9px] font-bold text-[#10213c]"><RiSettings3Line className="h-3.5 w-3.5" />Connection settings</button>
        </div>
      </header>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filing country">
        {countries.map((item) => <button key={item.code} type="button" role="tab" aria-selected={selectedCountry === item.code} onClick={() => void selectCountry(item.code)} className={`rounded-full border px-3 py-1.5 text-[8px] font-bold ${selectedCountry === item.code ? "border-[#1e4fc1] bg-[#1e4fc1] text-white" : "border-[#cbd8ef] bg-white text-[#10213c]"}`}>{item.name}</button>)}
      </div>
      {settingsOpen ? <section className="rounded-xl border border-[#cbd8ef] bg-white p-3"><div className="flex items-center justify-between"><h2 className="text-[10px] font-bold text-[#10213c]">e-Invoicing settings</h2><button type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><RiCloseLine className="h-4 w-4 text-slate-500" /></button></div><p className="mt-2 text-[9px] text-slate-600">This workspace prepares and tracks e-Invoices directly. No external provider connection is required.</p><button type="button" onClick={() => router.push("/dashboard/settings?tab=e-invoicing")} className="mt-3 rounded-md bg-[#1e4fc1] px-3 py-2 text-[9px] font-bold text-white">Open e-Invoicing settings</button></section> : null}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(240px,.75fr)]">
        <section className="rounded-xl border border-[#dfe7f4] bg-white p-3">
          <div className="flex items-start justify-between gap-2"><div><p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#087b74]">{country.name}, {country.authority}</p><h2 className="text-[13px] font-bold text-[#10213c]">Self-managed e-Invoicing</h2><p className="mt-2 text-[9px] leading-relaxed text-slate-600">DaroBooks prepares and tracks electronic invoices for {country.name} directly. No external provider connection is required.</p></div><span className="rounded-full bg-[#e6f7f3] px-2 py-1 text-[7px] font-bold text-[#087b74]">Self-managed</span></div>
          <h3 className="mt-3 text-[9px] font-bold text-[#10213c]">Readiness</h3>
          <div className="mt-2 grid gap-2 text-[9px] sm:grid-cols-2"><ReadinessItem label="Tax identification number" ready={readiness.taxIdentificationNumber} /><ReadinessItem label="Company registered" ready={readiness.companyRegistered} /><ReadinessItem label="DaroBooks filing system ready" ready={readiness.systemConfigured} /><ReadinessItem label="Test invoices cleared" ready={readiness.testInvoicesCleared} /></div>
          <div className="mt-3 rounded-lg bg-[#f8faff] p-2 text-[9px] text-slate-600">{setupComplete ? "Next: create or select an invoice, then review its tax details before filing." : "Next: complete the tax ID and company registration details in e-Invoicing setup."}</div>
        </section>
        <section className="rounded-xl border border-[#dfe7f4] bg-white p-3"><h2 className="text-[10px] font-bold text-[#10213c]">Key dates</h2><div className="mt-2 divide-y divide-[#edf1f7] text-[9px]"><DateRow label="Large taxpayers" value="Confirm with tax authority" /><DateRow label="Medium taxpayers go live" value="Confirm locally" /><DateRow label="Smaller taxpayers go live" value="Confirm locally" /></div><p className="mt-3 rounded-lg bg-[#fff4dc] p-2 text-[8px] leading-relaxed text-[#8b5700]">Deadlines and thresholds change. Confirm them with a tax adviser or the tax authority.</p></section>
      </div>
      <section className="overflow-hidden rounded-xl border border-[#dfe7f4] bg-white">
        <div className="flex items-center justify-between border-b border-[#edf1f7] px-3 py-2"><h2 className="text-[10px] font-bold text-[#10213c]">Invoice readiness</h2><button type="button" onClick={() => router.push("/dashboard/invoices")} className="text-[8px] font-bold text-[#1e4fc1]">Manage invoices <RiArrowRightLine className="inline h-3 w-3" /></button></div>
        {loading ? <p className="px-3 py-8 text-center text-[9px] text-slate-500">Loading invoices…</p> : visibleInvoices.length ? <div className="divide-y divide-[#edf1f7]">{visibleInvoices.map((invoice) => { const filed = invoice.filingStatus !== "not_submitted"; const submitted = invoice.filingStatus === "submitted"; return <button key={invoice.id} type="button" onClick={() => router.push(`/dashboard/invoices/${encodeURIComponent(invoice.id)}`)} className="grid w-full gap-1 px-3 py-2 text-left text-[8px] transition hover:bg-[#f8faff] sm:grid-cols-[.8fr_1.2fr_1fr_.7fr_.65fr] sm:items-center sm:gap-2"><strong className="text-[#10213c]">{invoice.invoiceNumber}</strong><span className="text-slate-700">{invoice.customerName}</span><span className="text-slate-700">{invoice.currency} {invoice.total.toLocaleString()}</span><span className={filed ? "font-semibold text-[#087b74]" : "text-slate-500"}>{submitted ? `Submitted · ${invoice.externalSubmissionReference ?? "External authority"}` : filed ? `Ready · ${invoice.taxAuthorityReference ?? "Internal filing"}` : "Not submitted"}</span><span className={`justify-self-start rounded-full px-2 py-1 text-[7px] font-bold ${filed ? "bg-[#e6f7f3] text-[#087b74]" : "bg-[#fff0d9] text-[#9a5600]"}`}>{invoice.status} · {submitted ? "Submitted" : filed ? "Ready" : "Review"}</span></button>; })}</div> : <div className="px-3 py-8 text-center"><p className="text-[9px] text-slate-500">No invoices are available for e-Invoicing yet.</p><button type="button" onClick={() => router.push("/dashboard/invoices/new")} className="mt-3 rounded-md bg-[#1e4fc1] px-3 py-2 text-[9px] font-bold text-white">Create invoice</button></div>}
      </section>
    </section>
  );
}

function ReadinessItem({ label, ready }: { label: string; ready: boolean }) {
  return <div className="flex items-center gap-1.5 text-slate-700">{ready ? <RiCheckLine className="h-4 w-4 rounded-full bg-[#087b74] p-0.5 text-white" /> : <span className="h-4 w-4 rounded-full border border-[#aebfdf]" />}<span>{label}</span></div>;
}

function DateRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-2 py-2"><span className="text-slate-700">{label}</span><strong className="text-right text-[#10213c]">{value}</strong></div>;
}

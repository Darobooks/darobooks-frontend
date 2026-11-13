"use client";

import { useEffect, useState } from "react";
import { RiSearchLine } from "@remixicon/react";

type RevenueLine = { label: string; amount: number };
type GroupCompany = { id: string; name: string; revenue: number; profit: number; cash: number; revenueByLine: RevenueLine[] };
type GroupViewData = {
  currency: string;
  periodLabel: string;
  totals: { revenue: number; profit: number; margin: number; cash: number };
  companies: GroupCompany[];
  revenueByLine: RevenueLine[];
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

export default function DashboardGroupView() {
  const [data, setData] = useState<GroupViewData | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadGroupView() {
    setLoading(true);
    setError("");
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setLoading(false);
      setError("Sign in again to view the group overview.");
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/group-view`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as GroupViewData & { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Could not load the group overview.");
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load the group overview.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadGroupView();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const formatMoney = (value: number) => new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: data?.currency ?? "USD",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(value);
  const selectedCompany = data?.companies.find((company) => company.id === selectedCompanyId);
  const displayedRevenue = selectedCompany?.revenue ?? data?.totals.revenue ?? 0;
  const displayedProfit = selectedCompany?.profit ?? data?.totals.profit ?? 0;
  const displayedCash = selectedCompany?.cash ?? data?.totals.cash ?? 0;
  const displayedRevenueByLine = selectedCompany?.revenueByLine ?? data?.revenueByLine ?? [];
  const displayedMargin = displayedRevenue ? (displayedProfit / displayedRevenue) * 100 : 0;
  const maxLineAmount = Math.max(...displayedRevenueByLine.map((line) => line.amount), 1);

  if (loading) return <GroupViewSkeleton />;
  if (error) return <section className="reports-card py-12 text-center text-[11px] text-red-700" role="alert">{error}</section>;

  return (
    <section className="group-view-page" aria-labelledby="group-view-heading">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="group-view-heading" className="font-jakarta text-[20px] font-bold tracking-[-0.3px] text-[#10213c]">Group view</h1>
          <p className="mt-1 text-[10px] text-slate-500">One set of books per company, one view across all of them. {data?.periodLabel}.</p>
        </div>
        <button type="button" className="group-view-search" aria-label="Search group view">
          <RiSearchLine className="h-3.5 w-3.5" />
          <span>Search group</span>
        </button>
      </header>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Group companies">
        <CompanyPill active={selectedCompanyId === "all"} onClick={() => setSelectedCompanyId("all")}>All companies</CompanyPill>
        {data?.companies.map((company) => (
          <CompanyPill key={company.id} active={selectedCompanyId === company.id} onClick={() => setSelectedCompanyId(company.id)}>
            {company.name}
          </CompanyPill>
        ))}
      </div>

      <div className="group-view-metrics">
        <Metric label="Revenue" value={formatMoney(displayedRevenue)} />
        <Metric label="Net profit" value={formatMoney(displayedProfit)} />
        <Metric label="Margin" value={`${Math.round(selectedCompany ? displayedMargin : data?.totals.margin ?? 0)}%`} />
        <Metric label="Cash across banks" value={formatMoney(displayedCash)} />
      </div>

      <div className="group-view-grid">
        <section className="reports-card" aria-labelledby="revenue-by-line-heading">
          <h2 id="revenue-by-line-heading" className="group-view-card-title">Revenue by business line</h2>
          <div className="mt-3 space-y-3">
            {displayedRevenueByLine.length ? displayedRevenueByLine.map((line) => (
              <div key={line.label}>
                <div className="flex items-center justify-between gap-3 text-[9px] font-bold text-[#10213c]">
                  <span>{line.label}</span><span>{formatMoney(line.amount)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-[#dbe5f8]">
                  <div className="h-1.5 rounded-full bg-[#07877d]" style={{ width: `${Math.min((line.amount / maxLineAmount) * 100, 100)}%` }} />
                </div>
              </div>
            )) : <p className="text-[10px] text-slate-500">No revenue activity recorded this year.</p>}
          </div>
        </section>

        <section className="reports-card overflow-hidden p-0" aria-labelledby="by-company-heading">
          <div className="px-4 pb-2 pt-3">
            <h2 id="by-company-heading" className="group-view-card-title">By company</h2>
          </div>
          <div className="group-view-table-head"><span>Company</span><span>Revenue</span><span>Profit</span></div>
          <div>
            {(selectedCompany ? [selectedCompany] : data?.companies ?? []).map((company) => (
              <div key={company.id} className="group-view-company-row">
                <strong>{company.name}</strong><span>{formatMoney(company.revenue)}</span><b>{formatMoney(company.profit)}</b>
              </div>
            ))}
          </div>
          <p className="px-4 pb-3 pt-2 text-[8px] leading-3 text-slate-500">Transfers between your own companies are eliminated in the consolidated view.</p>
        </section>
      </div>
    </section>
  );
}

function CompanyPill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`group-view-pill ${active ? "group-view-pill-active" : ""}`}>{children}</button>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="group-view-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function GroupViewSkeleton() {
  return <div className="space-y-3" role="status" aria-label="Loading group view"><div className="dashboard-skeleton-block h-7 w-48 rounded" /><div className="grid grid-cols-4 gap-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="dashboard-skeleton-block h-16 rounded-xl" />)}</div><div className="dashboard-skeleton-block h-48 rounded-xl" /></div>;
}

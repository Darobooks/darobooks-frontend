"use client";

import { useEffect, useMemo, useState } from "react";
import { RiDownload2Line, RiFileChartLine } from "@remixicon/react";

type CashFlow = { month: string; moneyIn: number; moneyOut: number };
type InvoiceSummary = {
  currency: string;
  outstandingAmount: number;
  overdueAmount: number;
  paidThisMonthAmount: number;
};

type ReportData = {
  cashFlow: CashFlow[];
  invoiceSummary?: InvoiceSummary[];
  currency: string;
  rows?: ReportRowData[];
};
type ReportRowData = {
  label: string;
  kind: "section" | "line" | "total";
  value: number;
  comparison: number;
  changePercent: number;
};
const API_BASE_URL = (process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000").replace(/\/+$/, "");

const reportNames = [
  "Profit and loss",
  "Balance sheet",
  "Cash flow",
  "Trial balance",
  "Receivables ageing",
  "Payables ageing",
  "Sales by customer",
  "Group summary",
];
const reportKeys: Record<string, string> = {
  "Profit and loss": "profit-and-loss",
  "Balance sheet": "balance-sheet",
  "Cash flow": "cash-flow",
  "Trial balance": "trial-balance",
  "Receivables ageing": "receivables-ageing",
  "Payables ageing": "payables-ageing",
  "Sales by customer": "sales-by-customer",
  "Group summary": "group-summary",
};
function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getPeriodOptions() {
  const today = new Date();
  const year = today.getUTCFullYear();
  const monthStart = new Date(Date.UTC(year, today.getUTCMonth(), 1));
  const previousMonthStart = new Date(Date.UTC(year, today.getUTCMonth() - 1, 1));
  const quarterStart = new Date(Date.UTC(year, today.getUTCMonth() - 2, 1));
  const monthEnd = new Date(Date.UTC(year, today.getUTCMonth() + 1, 0));

  return [
    { value: "fortnight", label: `1 to 15 ${monthStart.toLocaleString("en", { month: "long", timeZone: "UTC" })} ${year}`, from: formatDate(monthStart), to: formatDate(new Date(Date.UTC(year, today.getUTCMonth(), 15))) },
    { value: "month", label: `${monthStart.toLocaleString("en", { month: "long", timeZone: "UTC" })} ${year}`, from: formatDate(monthStart), to: formatDate(monthEnd) },
    { value: "quarter", label: `Last 3 months of ${year}`, from: formatDate(quarterStart), to: formatDate(monthEnd) },
    { value: "ytd", label: `Year to date ${year}`, from: `${year}-01-01`, to: formatDate(today) },
    { value: "previous-month", label: `Previous month (${previousMonthStart.toLocaleString("en", { month: "long", timeZone: "UTC" })} ${previousMonthStart.getUTCFullYear()})`, from: formatDate(previousMonthStart), to: formatDate(new Date(Date.UTC(year, today.getUTCMonth(), 0))) },
  ];
}

export default function DashboardReports({ data }: { data: ReportData }) {
  const [activeReport, setActiveReport] = useState("Profit and loss");
  const [period, setPeriod] = useState("ytd");
  const [comparison, setComparison] = useState("Compare: same period last month");
  const [basis, setBasis] = useState("Accrual basis");
  const [reportData, setReportData] = useState(data);
  const [loading, setLoading] = useState(true);
  const [reportError, setReportError] = useState("");
  const periodOptions = useMemo(() => getPeriodOptions(), []);

  useEffect(() => {
    let active = true;
    async function loadReport() {
      setLoading(true);
      setReportError("");
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) {
        setLoading(false);
        setReportError("Sign in again to view reports.");
        return;
      }
      try {
        const selectedPeriod = periodOptions.find((item) => item.value === period) ?? periodOptions[0];
        const response = await fetch(`${API_BASE_URL}/dashboard/reports?basis=${encodeURIComponent(basis)}&report=${encodeURIComponent(reportKeys[activeReport])}&from=${selectedPeriod.from}&to=${selectedPeriod.to}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as ReportData & { message?: string };
        if (!response.ok) throw new Error(payload.message ?? "Could not load reports.");
        if (active) setReportData(payload);
      } catch (error) {
        if (active) setReportError(error instanceof Error ? error.message : "Could not load reports.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadReport();
    return () => { active = false; };
  }, [activeReport, basis, period, periodOptions]);

  const currency = reportData.currency || reportData.invoiceSummary?.[0]?.currency || "USD";
  const netProfitRow = reportData.rows?.find((row) => row.label === "Net profit");
  const change = netProfitRow?.changePercent ?? 0;
  const chartRows = (reportData.rows ?? []).filter((row) => row.kind !== "section");
  const chartPeak = Math.max(...chartRows.map((row) => Math.abs(row.value)), 1);

  function money(value: number) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,      currencyDisplay: "code",      maximumFractionDigits: 0,
    }).format(value);
  }

  function exportCsv() {
    const rows = [
      ["Account", period, "Last month", "Change"],
      ...(reportData.rows ?? []).map((row) => [
        row.label,
        row.value,
        row.comparison,
        row.changePercent,
      ]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "darobooks-profit-and-loss.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="reports-page" aria-labelledby="reports-heading">
      <aside className="reports-nav">
        <p className="reports-kicker">Reports</p>
        <nav aria-label="Report types">
          {reportNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveReport(name)}
              className={activeReport === name ? "reports-nav-active" : ""}
            >
              {name}
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 id="reports-heading" className="font-jakarta text-[20px] font-bold tracking-[-0.3px] text-[#10213c]">
              {activeReport}
            </h1>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={exportCsv} className="reports-action">
              <RiDownload2Line className="h-3.5 w-3.5" /> Export Excel
            </button>
            <button type="button" onClick={() => window.print()} className="reports-action reports-action-primary">
              <RiFileChartLine className="h-3.5 w-3.5" /> Export PDF
            </button>
          </div>
        </header>

        <div className="mb-3 flex flex-wrap gap-2">
          <select value={period} onChange={(event) => setPeriod(event.target.value)} className="reports-select">
            {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={comparison} onChange={(event) => setComparison(event.target.value)} className="reports-select">
            <option>Compare: same period last month</option>
            <option>Compare: same period last year</option>
            <option>Compare: no comparison</option>
          </select>
          <select value={basis} onChange={(event) => setBasis(event.target.value)} className="reports-select">
            <option>Accrual basis</option>
            <option>Cash basis</option>
          </select>
        </div>

        {loading ? (
          <ReportSkeleton />
        ) : reportError ? (
          <section role="alert" className="reports-card py-12 text-center text-[10px] text-red-700">{reportError}</section>
        ) : (
          <>
            <section className="reports-card mb-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold text-[#10213c]">
                  {activeReport === "Profit and loss" ? "Net profit, last 6 months" : `${activeReport} overview`}
                </h2>
                <span className="text-[9px] font-bold text-[#087b74]">+{change.toFixed(1)}% on last period</span>
              </div>
              <div className="mt-4 h-28">
                <svg viewBox="0 0 720 130" className="h-full w-full" role="img" aria-label="Net profit trend">
                  {[25, 65, 105].map((y) => <line key={y} x1="20" x2="700" y1={y} y2={y} stroke="#e5ebf5" />)}
                  <polyline
                    fill="#dfe8f7"
                    points={`20,105 ${chartRows.map((row, index) => `${index * (680 / Math.max(chartRows.length - 1, 1)) + 20},${105 - (Math.abs(row.value) / chartPeak) * 75}`).join(" ")} 700,105`}
                  />
                  <polyline
                    fill="none"
                    stroke="#1e4fc1"
                    strokeWidth="3"
                    points={chartRows.map((row, index) => `${index * (680 / Math.max(chartRows.length - 1, 1)) + 20},${105 - (Math.abs(row.value) / chartPeak) * 75}`).join(" ")}
                  />
                  {chartRows.map((row, index) => {
                    const x = index * (680 / Math.max(chartRows.length - 1, 1)) + 20;
                    const y = 105 - (Math.abs(row.value) / chartPeak) * 75;
                    return <circle key={`${row.label}-${index}`} cx={x} cy={y} r="4" fill="#fff" stroke="#1e4fc1" strokeWidth="2" />;
                  })}
                </svg>
              </div>
              <div className="flex justify-between px-2 text-[8px] text-slate-500">
                {chartRows.length ? chartRows.map((row) => <span key={row.label} className="max-w-20 truncate">{row.label}</span>) : <span>No report data for this period</span>}
              </div>
            </section>

            <section className="reports-card overflow-hidden p-0">
              <div className="reports-table-row reports-table-head">
                <span>Account</span><span>{periodOptions.find((option) => option.value === period)?.label}</span><span>Last period</span><span>Change</span>
              </div>
              {(reportData.rows ?? []).map((row) => (
                <ReportRow
                  key={row.label}
                  label={row.label}
                  section={row.kind === "section"}
                  total={row.kind === "total"}
                  highlight={row.label === "Net profit"}
                  value={row.kind === "section" ? undefined : money(row.value)}
                  comparison={row.kind === "section" ? undefined : money(row.comparison)}
                  change={row.kind === "section" ? undefined : `${row.changePercent >= 0 ? "+" : ""}${row.changePercent.toFixed(1)}%`}
                />
              ))}
            </section>
          </>
        )}
      </div>
    </section>
  );
}

function ReportRow({
  label, value, comparison, change, section, total, highlight,
}: {
  label: string; value?: string; comparison?: string; change?: string;
  section?: boolean; total?: boolean; highlight?: boolean;
}) {
  if (section) return <div className="border-t border-[#dbe4f3] bg-[#f7f9fc] px-3 py-2 text-[9px] font-bold tracking-[0.08em] text-[#10213c]">{label}</div>;
  return (
    <div className={`reports-table-row ${total ? "font-bold" : ""} ${highlight ? "bg-[#e6f7f3]" : ""}`}>
      <span className={total ? "text-[#10213c]" : "text-slate-700"}>{label}</span>
      <span>{value}</span><span>{comparison}</span><span className="text-[#087b74]">{change}</span>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading report">
      <section className="reports-card">
        <div className="dashboard-skeleton-block h-3 w-44 rounded" />
        <div className="dashboard-skeleton-block mt-4 h-28 w-full rounded" />
      </section>
      <section className="reports-card overflow-hidden p-0">
        <div className="dashboard-skeleton-block h-9 w-full rounded-none" />
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="flex min-h-[2.1rem] items-center justify-between gap-4 border-t border-[#edf1f7] px-3"
          >
            <div className="dashboard-skeleton-block h-2.5 w-32 rounded" />
            <div className="dashboard-skeleton-block h-2.5 w-16 rounded" />
            <div className="dashboard-skeleton-block h-2.5 w-16 rounded" />
            <div className="dashboard-skeleton-block h-2.5 w-12 rounded" />
          </div>
        ))}
      </section>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { RiAddLine, RiCloseLine, RiDeleteBinLine, RiDownload2Line, RiEdit2Line } from "@remixicon/react";
import { showToast } from "@/app/components/toast";
import { useConfirmDialog } from "@/app/components/ConfirmDialog";

type BudgetLine = {
  id: string;
  label: string;
  type: "revenue" | "expense";
  budget: number;
  manualActual: number | null;
  actual: number;
  percentage: number;
};
type Budget = {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  totalBudget: number;
  totalActual: number;
  revenueActual: number;
  spendActual: number;
  lines: BudgetLine[];
};
type ForecastItem = { label: string; detail: string; amount: number };
type BudgetResponse = { currency: string; forecast: ForecastItem[]; budgets: Budget[] };
type NewLine = { label: string; amount: string; actualAmount: string; type: "revenue" | "expense" };
type AggregatedBudgetLine = BudgetLine & { sourceCount: number };

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

function formatPeriod(start: string, end: string) {
  return `${new Date(`${start}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })} - ${new Date(`${end}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`;
}

export default function DashboardBudgets() {
  const [data, setData] = useState<BudgetResponse | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewBudget, setShowNewBudget] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [expandedBudgetIds, setExpandedBudgetIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [periodStart, setPeriodStart] = useState(`${new Date().getUTCFullYear()}-01-01`);
  const [periodEnd, setPeriodEnd] = useState(`${new Date().getUTCFullYear()}-12-31`);
  const [lines, setLines] = useState<NewLine[]>([{ label: "", amount: "", actualAmount: "", type: "expense" }]);
  const { confirm, dialog } = useConfirmDialog();

  const loadBudgets = useCallback(async () => {
    setLoading(true);
    setError("");
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setLoading(false);
      setError("Sign in again to view budgets.");
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/budgets`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as BudgetResponse & { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Could not load budgets.");
      setData(payload);
      setSelectedId((current) => current || payload.budgets[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load budgets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadBudgets(), 0);
    return () => window.clearTimeout(timer);
  }, [loadBudgets]);

  const selectedBudget = data?.budgets.find((budget) => budget.id === selectedId) ?? data?.budgets[0];
  const currency = data?.currency ?? "USD";
  const formatMoney = (value: number) => new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(value);
  const forecastTotal = data?.forecast.reduce((sum, item) => sum + item.amount, 0) ?? 0;

  const allBudgetTotals = (data?.budgets ?? []).reduce(
    (totals, budget) => ({
      budget: totals.budget + budget.totalBudget,
      actual: totals.actual + budget.totalActual,
      revenueBudget: totals.revenueBudget + budget.lines
        .filter((line) => line.type === "revenue")
        .reduce((sum, line) => sum + line.budget, 0),
      revenueActual: totals.revenueActual + budget.lines
        .filter((line) => line.type === "revenue")
        .reduce((sum, line) => sum + line.actual, 0),
      spendBudget: totals.spendBudget + budget.lines
        .filter((line) => line.type === "expense")
        .reduce((sum, line) => sum + line.budget, 0),
      spendActual: totals.spendActual + budget.lines
        .filter((line) => line.type === "expense")
        .reduce((sum, line) => sum + line.actual, 0),
      overBudget: totals.overBudget + budget.lines.filter((line) => line.actual > line.budget).length,
    }),
    {
      budget: 0,
      actual: 0,
      revenueBudget: 0,
      revenueActual: 0,
      spendBudget: 0,
      spendActual: 0,
      overBudget: 0,
    },
  );
  const allBudgetMetrics = {
    revenuePercent: allBudgetTotals.revenueBudget
      ? Math.round((allBudgetTotals.revenueActual / allBudgetTotals.revenueBudget) * 100)
      : 0,
    spendPercent: allBudgetTotals.spendBudget
      ? Math.round((allBudgetTotals.spendActual / allBudgetTotals.spendBudget) * 100)
      : 0,
  };
  const allBudgetLines = (data?.budgets ?? []).reduce<AggregatedBudgetLine[]>((lines, budget) => {
    budget.lines.forEach((line) => {
      const key = `${line.type}:${line.label.trim().toLowerCase()}`;
      const existing = lines.find((item) => item.id === key);
      if (existing) {
        existing.budget += line.budget;
        existing.actual += line.actual;
        existing.percentage = existing.budget === 0 ? 0 : (existing.actual / existing.budget) * 100;
        existing.sourceCount += 1;
        return;
      }
      lines.push({ ...line, id: key, sourceCount: 1 });
    });
    return lines;
  }, []);
  const allBudgetPeriod = data?.budgets.length
    ? {
      start: data.budgets.reduce((start, budget) => budget.periodStart < start ? budget.periodStart : start, data.budgets[0].periodStart),
      end: data.budgets.reduce((end, budget) => budget.periodEnd > end ? budget.periodEnd : end, data.budgets[0].periodEnd),
    }
    : null;

  async function createBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    setSaving(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/budgets${editingBudgetId ? `/${editingBudgetId}` : ""}`,
        {
        method: editingBudgetId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          periodStart,
          periodEnd,
          lines: lines.map((line) => ({
            label: line.label,
            amount: Number(line.amount),
            actualAmount: line.actualAmount === "" ? null : Number(line.actualAmount),
            type: line.type,
          })),
        }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Could not save budget.");
      setShowNewBudget(false);
      setEditingBudgetId(null);
      setName("");
      setLines([{ label: "", amount: "", actualAmount: "", type: "expense" }]);
      await loadBudgets();
      showToast(editingBudgetId ? "Budget updated." : "Budget created.", "success");
    } catch (saveError) {
      showToast(saveError instanceof Error ? saveError.message : "Could not save budget.", "error");
    } finally {
      setSaving(false);
    }
  }

  function openCreateBudget() {
    setEditingBudgetId(null);
    setName("");
    setPeriodStart(`${new Date().getUTCFullYear()}-01-01`);
    setPeriodEnd(`${new Date().getUTCFullYear()}-12-31`);
    setLines([{ label: "", amount: "", actualAmount: "", type: "expense" }]);
    setShowNewBudget(true);
  }

  function openEditBudget(budget: Budget) {
    setEditingBudgetId(budget.id);
    setName(budget.name);
    setPeriodStart(budget.periodStart);
    setPeriodEnd(budget.periodEnd);
    setLines(budget.lines.map((line) => ({
      label: line.label,
      amount: String(line.budget),
      actualAmount: line.manualActual === null ? "" : String(line.manualActual),
      type: line.type,
    })));
    setShowNewBudget(true);
  }

  function exportBudget() {
    if (!data?.budgets.length) return;
    const header = ["Budget", "Period", "Line", "Type", "Budget", "Actual", "Percentage"];
    const rows = data.budgets.flatMap((budget) => budget.lines.map((line) => [
      budget.name,
      formatPeriod(budget.periodStart, budget.periodEnd),
      line.label,
      line.type,
      line.budget,
      line.actual,
      `${Math.round(line.percentage)}%`,
    ]));
    const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "all-budgets.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("Budget CSV exported.", "success");
  }

  async function deleteBudget(budget: Budget) {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || !await confirm({ title: "Delete budget?", message: `Delete "${budget.name}" and all its budget lines? This cannot be undone.`, confirmLabel: "Delete budget", destructive: true })) return;
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/budgets/${budget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Could not delete budget.");
      await loadBudgets();
      showToast("Budget deleted.", "success");
    } catch (deleteError) {
      showToast(deleteError instanceof Error ? deleteError.message : "Could not delete budget.", "error");
    }
  }

  if (loading) return <BudgetSkeleton />;
  if (error) return <section className="reports-card py-12 text-center text-[11px] text-red-700" role="alert">{error}</section>;

  return (
    <section className="budgets-page" aria-labelledby="budgets-heading">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 id="budgets-heading" className="font-jakarta text-[20px] font-bold tracking-[-0.3px] text-[#10213c]">Budgets &amp; forecast</h1>
          <p className="mt-1 text-[10px] text-slate-500">Plan spending, track actuals, and forecast revenue from your workspace.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="budgets-secondary-button budgets-export-button" onClick={exportBudget} disabled={!data?.budgets.length} title="Download all budget items as a CSV file" aria-label="Export all budget items as CSV">
            <RiDownload2Line className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button type="button" className="budgets-primary-button" onClick={openCreateBudget}><RiAddLine className="h-3.5 w-3.5" /> Create budget</button>
        </div>
      </header>

      {data?.budgets.length ? (
        <>
          {selectedBudget && (
            <>
              <div className="budgets-metrics">
                <Metric label="Revenue to budget" value={`${allBudgetMetrics.revenuePercent}%`} />
                <Metric label="Spend used" value={`${allBudgetMetrics.spendPercent}%`} />
                <Metric label="Total budget" value={formatMoney(allBudgetTotals.budget)} />
                <Metric label="Over-budget lines" value={String(allBudgetTotals.overBudget)} />
              </div>
              <div className="budgets-grid">
                <section className="reports-card">
                  <div className="flex items-center justify-between gap-2">
                    <div><h2 className="budgets-section-title">Budget vs actual, year to date</h2><p className="budgets-period">{allBudgetPeriod ? formatPeriod(allBudgetPeriod.start, allBudgetPeriod.end) : "All budget periods"}</p></div>
                    <span className="budgets-card-label">{formatMoney(allBudgetTotals.actual)} of {formatMoney(allBudgetTotals.budget)}</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {allBudgetLines.map((line) => <BudgetLineView key={line.id} line={line} currency={currency} sourceCount={line.sourceCount} />)}
                  </div>
                </section>
                <section className="reports-card budgets-forecast-card" aria-labelledby="budget-forecast-heading">
                  <div className="budgets-list-header">
                    <div>
                      <h2 id="budget-forecast-heading" className="budgets-section-title">Revenue forecast</h2>
                      <p className="budgets-period">Recorded and projected revenue from your workspace</p>
                    </div>
                    <strong className="budgets-forecast-total">{formatMoney(forecastTotal)}</strong>
                  </div>
                  <div className="budgets-forecast-grid">
                    {data.forecast.length ? data.forecast.map((item) => (
                      <div key={item.label} className="budgets-forecast-item">
                        <strong>{item.label}</strong><span>{item.detail}</span><b>{formatMoney(item.amount)}</b>
                      </div>
                    )) : <p className="budgets-period">No recorded forecast activity for this period.</p>}
                  </div>
                </section>
              </div>
              <section className="reports-card mb-3 p-0 budgets-items-card" aria-labelledby="budget-items-heading">
                <div className="budgets-list-header">
                  <div>
                    <h2 id="budget-items-heading" className="budgets-section-title">All budget items</h2>
                    <p className="budgets-period">Expand an item to see all lines, then edit or delete it.</p>
                  </div>
                  <span className="budgets-items-count">{data.budgets.length} budgets</span>
                </div>
                <div className="budgets-item-table-head">
                  <span>Budget</span><span>Period</span><span>Lines</span><span>Total</span><span>Actual</span><span>Actions</span>
                </div>
                {data.budgets.map((budget) => (
                  <div key={budget.id} className="budgets-accordion">
                    <div className="budgets-item-row">
                      <button type="button" className="budgets-accordion-trigger" onClick={() => setExpandedBudgetIds((ids) => ids.includes(budget.id) ? ids.filter((id) => id !== budget.id) : [...ids, budget.id])} aria-expanded={expandedBudgetIds.includes(budget.id)}>
                        <span className="budgets-item-name"><strong>{budget.name}</strong><small>{expandedBudgetIds.includes(budget.id) ? "Hide line details" : "Show line details"}</small></span>
                      </button>
                      <span>{formatPeriod(budget.periodStart, budget.periodEnd)}</span>
                      <span>{budget.lines.length}</span>
                      <span>{formatMoney(budget.totalBudget)}</span>
                      <span>{formatMoney(budget.totalActual)}</span>
                      <span className="budgets-row-actions">
                        <button type="button" onClick={() => openEditBudget(budget)} title={`Edit ${budget.name}`} aria-label={`Edit ${budget.name}`}><RiEdit2Line className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => void deleteBudget(budget)} title={`Delete ${budget.name}`} aria-label={`Delete ${budget.name}`}><RiDeleteBinLine className="h-3.5 w-3.5" /></button>
                      </span>
                    </div>
                    {expandedBudgetIds.includes(budget.id) && <div className="budgets-accordion-details">
                      {budget.lines.map((line) => <BudgetLineView key={line.id} line={line} currency={currency} />)}
                    </div>}
                  </div>
                ))}
              </section>
              <div className="budgets-note">Forecast values are calculated from invoices, recurring billing, and unbilled active project work recorded in DaroBooks.</div>
            </>
          )}
        </>
      ) : (
        <section className="reports-card py-14 text-center">
          <h2 className="text-[13px] font-bold text-[#10213c]">No budgets yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-[10px] text-slate-500">Create a budget and compare its lines with invoices and bills recorded in your database.</p>
          <button type="button" className="budgets-primary-button mx-auto mt-4" onClick={openCreateBudget}><RiAddLine className="h-3.5 w-3.5" /> New budget</button>
        </section>
      )}

      {showNewBudget && (
        <div className="budgets-modal-backdrop" role="presentation">
          <form className="budgets-modal" onSubmit={createBudget}>
            <div className="flex items-center justify-between"><h2 className="text-[14px] font-bold text-[#10213c]">{editingBudgetId ? "Edit budget" : "Create budget"}</h2><button type="button" onClick={() => { setShowNewBudget(false); setEditingBudgetId(null); }} aria-label="Close"><RiCloseLine className="h-4 w-4" /></button></div>
            <label className="budgets-field">Budget name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="2026 operating budget" /></label>
            <div className="grid grid-cols-2 gap-2"><label className="budgets-field">Starts<input required type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} /></label><label className="budgets-field">Ends<input required type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} /></label></div>
            <div className="flex items-center justify-between"><h3 className="text-[11px] font-bold text-[#10213c]">Budget lines</h3><button type="button" className="text-[10px] font-bold text-[#1e4fc1]" onClick={() => setLines((current) => [...current, { label: "", amount: "", actualAmount: "", type: "expense" }])}>+ Add line</button></div>
            <div className="max-h-52 space-y-2 overflow-auto">
              {lines.map((line, index) => <div key={index} className="grid grid-cols-[1fr_5.5rem_5.5rem_5.5rem] gap-1"><input required placeholder="Line label" value={line.label} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} /><input required min="0" step="0.01" type="number" placeholder="Budget" value={line.amount} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item))} /><input min="0" step="0.01" type="number" placeholder="Actual" value={line.actualAmount} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, actualAmount: event.target.value } : item))} /><select value={line.type} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value as NewLine["type"] } : item))}><option value="expense">Expense</option><option value="revenue">Revenue</option></select></div>)}
            </div>
            <button disabled={saving} className="budgets-primary-button w-full justify-center" type="submit">{saving ? "Saving..." : editingBudgetId ? "Save changes" : "Create budget"}</button>
          </form>
        </div>
      )}
      {dialog}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="budgets-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function BudgetLineView({ line, currency, sourceCount = 1 }: { line: BudgetLine; currency: string; sourceCount?: number }) {
  const formatMoney = (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  const width = Math.min(line.percentage, 100);
  const over = line.actual > line.budget;
  const progressColor = over || line.percentage < 40
    ? "bg-[#c62828]"
    : line.percentage < 70
      ? "bg-[#e0a000]"
      : "bg-[#087e75]";
  return <div><div className="flex items-center justify-between gap-2 text-[10px]"><strong className="text-[#10213c]">{line.label}{sourceCount > 1 ? ` (${sourceCount} budget lines)` : ""}</strong><span className={over ? "font-bold text-[#c62828]" : "text-slate-500"}>{formatMoney(line.actual)} of {formatMoney(line.budget)} <b>{Math.round(line.percentage)}%</b></span></div><div className="mt-1 h-1.5 rounded-full bg-[#dfe8f7]"><div className={`h-1.5 rounded-full ${progressColor}`} style={{ width: `${width}%` }} /></div></div>;
}

function BudgetSkeleton() {
  return <div className="space-y-3" role="status" aria-label="Loading budgets"><div className="dashboard-skeleton-block h-7 w-56 rounded" /><div className="grid grid-cols-4 gap-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="dashboard-skeleton-block h-16 rounded-xl" />)}</div><div className="dashboard-skeleton-block h-56 rounded-xl" /></div>;
}

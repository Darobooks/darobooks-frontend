"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RiAddLine, RiDeleteBinLine, RiFileUploadLine, RiLockLine } from "@remixicon/react";
import { useConfirmDialog } from "@/app/components/ConfirmDialog";
import { showToast } from "@/app/components/toast";

type Asset = {
  id: string;
  name: string;
  category: string;
  purchaseDate: string;
  cost: number;
  usefulLifeMonths: number;
  monthlyCharge: number;
  accumulatedDepreciation: number;
  netBookValue: number;
};
type AssetResponse = {
  assets?: Asset[];
  summary?: { count: number; originalCost: number; netBookValue: number; monthlyCharge: number };
  message?: string;
};
type AssetForm = {
  name: string;
  category: string;
  purchaseDate: string;
  cost: string;
  usefulLifeMonths: string;
  residualValue: string;
};
const emptyForm: AssetForm = { name: "", category: "", purchaseDate: "", cost: "", usefulLifeMonths: "", residualValue: "0" };
const API_BASE_URL = (process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000").replace(/\/+$/, "");

export default function DashboardAssets({ search = "", currency = "USD" }: { search?: string; currency?: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [summary, setSummary] = useState({ count: 0, originalCost: 0, netBookValue: 0, monthlyCharge: 0 });
  const [form, setForm] = useState<AssetForm>(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog } = useConfirmDialog();
  const money = (value: number) => `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const visibleAssets = assets.filter((asset) => `${asset.name} ${asset.category}`.toLowerCase().includes(search.trim().toLowerCase()));

  const loadAssets = useCallback(async () => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/assets`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as AssetResponse;
      if (!response.ok) throw new Error(payload.message ?? "Could not load assets.");
      setAssets(payload.assets ?? []);
      setSummary(payload.summary ?? { count: 0, originalCost: 0, netBookValue: 0, monthlyCharge: 0 });
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Could not load assets.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadAssets(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAssets]);

  const saveAsset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/assets`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, cost: Number(form.cost), usefulLifeMonths: Number(form.usefulLifeMonths), residualValue: Number(form.residualValue) }),
      });
      const payload = (await response.json().catch(() => ({}))) as AssetResponse;
      if (!response.ok) throw new Error(payload.message ?? "Could not add asset.");
      setForm(emptyForm);
      setIsFormOpen(false);
      await loadAssets();
      showToast("Asset added.");
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Could not add asset.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAsset = async (asset: Asset) => {
    if (!await confirm({ title: "Delete asset?", message: `Delete "${asset.name}"? This cannot be undone.`, confirmLabel: "Delete asset", destructive: true })) return;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/assets/${encodeURIComponent(asset.id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Could not delete asset.");
      await loadAssets();
      showToast("Asset deleted.");
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Could not delete asset.", "error");
    }
  };

  const postDepreciation = async () => {
    if (!assets.length) return;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    setIsPosting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/assets/depreciation`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; total?: number };
      if (!response.ok) throw new Error(payload.message ?? "Could not post depreciation.");
      await loadAssets();
      showToast(payload.total ? `${payload.message ?? "Depreciation posted."} ${money(payload.total)}.` : payload.message ?? "Depreciation posted.", payload.total ? "success" : "info");
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Could not post depreciation.", "error");
    } finally {
      setIsPosting(false);
    }
  };

  const importRegister = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const text = await file.text();
    const rows = text.split(/\r?\n/).filter(Boolean).slice(1);
    const records: AssetForm[] = [];
    for (const row of rows) {
      const [name, category, purchaseDate, cost, usefulLifeMonths, residualValue] = row.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
      if (!name || !purchaseDate || !cost || !usefulLifeMonths) continue;
      records.push({ name, category: category ?? "", purchaseDate, cost, usefulLifeMonths, residualValue: residualValue || "0" });
    }
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || !records.length) {
      showToast("Use a CSV with columns: name, category, purchaseDate, cost, usefulLifeMonths, residualValue.", "info");
      return;
    }
    try {
      let imported = 0;
      for (const record of records) {
        const response = await fetch(`${API_BASE_URL}/dashboard/assets`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ...record, cost: Number(record.cost), usefulLifeMonths: Number(record.usefulLifeMonths), residualValue: Number(record.residualValue) }),
        });
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        if (!response.ok) throw new Error(payload.message ?? `Could not import "${record.name}".`);
        imported += 1;
      }
      await loadAssets();
      showToast(`${imported} asset${imported === 1 ? "" : "s"} imported.`);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Could not import the asset register.", "error");
    }
  };

  return (
    <section aria-labelledby="assets-heading" className="space-y-3">
      {dialog}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#087b74]">DaroAssets</p><h1 id="assets-heading" className="font-jakarta text-[19px] font-bold text-[#10213c] sm:text-[21px]">Fixed assets</h1><p className="mt-1 text-[10px] text-slate-600">Keep a register of what the business owns and post depreciation each month.</p></div>
        <div className="flex flex-wrap gap-2"><input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => void importRegister(event)} /><button type="button" onClick={() => fileRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#b9ccef] bg-white px-3 text-[9px] font-bold text-[#10213c]"><RiFileUploadLine className="h-3.5 w-3.5" /> Import register</button><button type="button" onClick={() => setIsFormOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1e4fc1] px-3 text-[9px] font-bold text-white hover:bg-blue-800"><RiAddLine className="h-3.5 w-3.5" /> Add asset</button></div>
      </header>
      {isFormOpen ? <AssetForm form={form} setForm={setForm} saving={isSaving} onClose={() => setIsFormOpen(false)} onSave={saveAsset} /> : null}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard label="Assets" value={String(summary.count)} /><SummaryCard label="Original cost" value={money(summary.originalCost)} /><SummaryCard label="Net book value" value={money(summary.netBookValue)} /><SummaryCard label="Charge this month" value={money(summary.monthlyCharge)} /></div>
      <section className="overflow-hidden rounded-xl border border-[#dfe7f4] bg-white" aria-label="Fixed asset register">
        <div className="flex items-center justify-between border-b border-[#edf1f7] px-3 py-2"><h2 className="text-[10px] font-bold text-[#10213c]">Asset register</h2>{isLoading ? <span className="text-[8px] text-slate-500">Loading…</span> : null}</div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-[9px]"><thead className="bg-[#f8faff] text-[8px] font-semibold text-slate-500"><tr><th className="px-3 py-2">Asset</th><th className="px-3 py-2">Bought</th><th className="px-3 py-2 text-right">Cost</th><th className="px-3 py-2">Life</th><th className="px-3 py-2 text-right">Monthly charge</th><th className="px-3 py-2 text-right">Net book value</th><th className="px-3 py-2" /></tr></thead><tbody className="divide-y divide-[#edf1f7] text-[#10213c]">{visibleAssets.length ? visibleAssets.map((asset) => <tr key={asset.id} className="hover:bg-[#f8faff]"><td className="px-3 py-2.5"><p className="font-bold">{asset.name}</p><p className="text-[8px] text-slate-500">{asset.category || "Uncategorised"}</p></td><td className="px-3 py-2.5">{asset.purchaseDate}</td><td className="px-3 py-2.5 text-right">{money(asset.cost)}</td><td className="px-3 py-2.5">{Math.round(asset.usefulLifeMonths / 12)} years</td><td className="px-3 py-2.5 text-right">{money(asset.monthlyCharge)}</td><td className="px-3 py-2.5 text-right font-semibold">{money(asset.netBookValue)}</td><td className="px-3 py-2.5 text-right"><button type="button" onClick={() => void deleteAsset(asset)} aria-label={`Delete ${asset.name}`} className="rounded p-1 text-red-600 hover:bg-red-50"><RiDeleteBinLine className="h-3.5 w-3.5" /></button></td></tr>) : <tr><td colSpan={7} className="px-3 py-12 text-center"><RiLockLine className="mx-auto h-5 w-5 text-[#1e4fc1]" /><p className="mt-2 text-[10px] font-semibold text-[#10213c]">No fixed assets yet</p><p className="mt-1 text-[9px] text-slate-500">Add your first asset to start tracking depreciation.</p></td></tr>}</tbody></table></div>
      </section>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]"><section className="rounded-xl border border-[#dfe7f4] bg-white p-3"><p className="text-[9px] font-bold text-[#10213c]">{new Date().toLocaleString(undefined, { month: "long" })} depreciation</p><p className="mt-1 text-[9px] text-slate-500">{assets.length ? `Post one monthly depreciation entry covering ${assets.length} asset${assets.length === 1 ? "" : "s"}.` : "Add assets before posting monthly depreciation."}</p><button type="button" disabled={!assets.length || isPosting} onClick={() => void postDepreciation()} className="mt-3 rounded-md bg-[#1e4fc1] px-3 py-2 text-[9px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{isPosting ? "Posting…" : "Post depreciation"}</button></section><aside className="rounded-xl border border-[#bfe5e1] bg-[#eaf9f7] p-3 text-[9px] leading-relaxed text-[#185e5a]">Straight-line depreciation is used by default. Tax allowances differ by country, so configure your tax treatment separately.</aside></div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#dfe7f4] bg-white px-3 py-3"><p className="text-[8px] font-semibold text-slate-500">{label}</p><p className="mt-1 text-[14px] font-bold text-[#10213c]">{value}</p></div>;
}

function AssetForm({ form, setForm, saving, onClose, onSave }: { form: AssetForm; setForm: React.Dispatch<React.SetStateAction<AssetForm>>; saving: boolean; onClose: () => void; onSave: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const update = (key: keyof AssetForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <form onSubmit={onSave} className="rounded-xl border border-[#b9ccef] bg-white p-3 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#1e4fc1]">Asset register</p><h2 className="mt-1 text-[12px] font-bold text-[#10213c]">Add fixed asset</h2></div><button type="button" onClick={onClose} className="text-[9px] font-bold text-[#1e4fc1]">Close</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><AssetInput label="Asset name" value={form.name} onChange={(value) => update("name", value)} required /><AssetInput label="Category" value={form.category} onChange={(value) => update("category", value)} /><AssetInput label="Purchase date" type="date" value={form.purchaseDate} onChange={(value) => update("purchaseDate", value)} required /><AssetInput label="Cost" type="number" min="0.01" step="0.01" value={form.cost} onChange={(value) => update("cost", value)} required /><AssetInput label="Useful life (months)" type="number" min="1" step="1" value={form.usefulLifeMonths} onChange={(value) => update("usefulLifeMonths", value)} required /><AssetInput label="Residual value" type="number" min="0" step="0.01" value={form.residualValue} onChange={(value) => update("residualValue", value)} /></div><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-md border border-[#dbe4f3] px-3 py-2 text-[9px] font-bold text-slate-700">Cancel</button><button type="submit" disabled={saving} className="rounded-md bg-[#1e4fc1] px-3 py-2 text-[9px] font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save asset"}</button></div></form>;
}

function AssetInput({ label, value, onChange, type = "text", required = false, min, step }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; min?: string; step?: string }) {
  return <label className="text-[8px] font-semibold text-slate-600">{label}<input required={required} type={type} min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-8 w-full rounded-md border border-[#dbe4f3] px-2 text-[9px]" /></label>;
}

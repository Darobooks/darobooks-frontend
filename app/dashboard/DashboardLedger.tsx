"use client";

import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  RiAddLine,
  RiArrowDownSLine,
  RiDownload2Line,
  RiFileList3Line,
  RiLockLine,
} from "@remixicon/react";
import { useConfirmDialog } from "@/app/components/ConfirmDialog";
import { showToast } from "@/app/components/toast";

type LedgerAccount = {
  code: string;
  account: string;
  balance: number;
  debit: number;
  credit: number;
  journalCount: number;
};
type JournalLine = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
};
type Journal = {
  id: string;
  date: string;
  reference: string;
  description: string;
  status: "draft" | "posted";
  amount: number;
  lines: JournalLine[];
};
type LedgerPayload = {
  accounts?: LedgerAccount[];
  journals?: Journal[];
  message?: string;
};
type LedgerPeriod = {
  periodStart: string;
  periodEnd: string;
  journalCount: number;
  total: number;
  closed: boolean;
  closedAt: string | null;
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

export default function DashboardLedger({ currency = "USD" }: { currency?: string }) {
  const [activeTab, setActiveTab] = useState("Chart of accounts");
  const [search, setSearch] = useState("");
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [deletingJournalId, setDeletingJournalId] = useState("");
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [ledgerError, setLedgerError] = useState("");
  const [ledgerPeriod, setLedgerPeriod] = useState<LedgerPeriod | null>(null);
  const [isReviewingPeriod, setIsReviewingPeriod] = useState(false);
  const { confirm, dialog } = useConfirmDialog();
  const [journalForm, setJournalForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    reference: "",
    description: "",
    debitAccount: "",
    creditAccount: "",
    amount: "",
  });
  const visibleAccounts = accounts.filter((entry) =>
    `${entry.code} ${entry.account}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const loadLedger = async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/dashboard/ledger`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as LedgerPayload;
    if (!response.ok) throw new Error(payload.message ?? "Could not load the ledger.");
    setAccounts(payload.accounts ?? []);
    setJournals(payload.journals ?? []);
  };

  useEffect(() => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    const timer = window.setTimeout(() => {
      void loadLedger(token).catch((error: unknown) =>
        setLedgerError(error instanceof Error ? error.message : "Could not load the ledger."),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const toggleItem = (key: string) =>
    setExpandedItems((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );

  const exportLedger = () => {
    try {
      const escapeCsv = (value: string | number) => {
        const text = String(value);
        return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      };
      const rows: (string | number)[][] = [
        ["DaroBooks ledger export", new Date().toISOString()],
        [],
        ["Chart of accounts"],
        ["Code", "Account", "Debit", "Credit", "Balance", "Journal count"],
        ...accounts.map((account) => [
          account.code,
          account.account,
          account.debit.toFixed(2),
          account.credit.toFixed(2),
          account.balance.toFixed(2),
          account.journalCount,
        ]),
        [],
        ["Journals"],
        ["Journal ID", "Date", "Reference", "Description", "Status", "Account code", "Account", "Debit", "Credit"],
        ...journals.flatMap((journal) =>
          journal.lines.map((line) => [
            journal.id,
            journal.date,
            journal.reference,
            journal.description,
            journal.status,
            line.accountCode,
            line.accountName,
            line.debit.toFixed(2),
            line.credit.toFixed(2),
          ]),
        ),
      ];
      const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
      const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `darobooks-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast("Ledger exported successfully.");
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Could not export the ledger.", "error");
    }
  };

  const saveJournal = async () => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/ledger/journals`, {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify(journalForm),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        showToast(payload.message ?? "Could not post journal.", "error");
        return;
      }
      setIsJournalOpen(false);
      setActiveTab("Journals");
      setJournalForm((current) => ({ ...current, reference: "", description: "", debitAccount: "", creditAccount: "", amount: "" }));
      await loadLedger(token);
      showToast("Journal posted successfully.");
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Could not post journal.", "error");
    }
  };

  const deleteJournal = async (journal: Journal) => {
    const confirmed = await confirm({
      title: "Delete journal?",
      message: `Delete "${journal.description}"? This action cannot be undone.`,
      confirmLabel: "Delete journal",
      destructive: true,
    });
    if (!confirmed) return;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    setDeletingJournalId(journal.id);
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/ledger/journals/${encodeURIComponent(journal.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        showToast(payload.message ?? "Could not delete journal.", "error");
        return;
      }
      await loadLedger(token);
      showToast("Journal deleted.");
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Could not delete journal.", "error");
    } finally {
      setDeletingJournalId("");
    }
  };

  const reviewCurrentPeriod = async () => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    setIsReviewingPeriod(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/ledger/period`, {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as LedgerPeriod & { message?: string };
      if (!response.ok) {
        showToast(payload.message ?? "Could not review the current period.", "error");
        return;
      }
      setLedgerPeriod(payload);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Could not review the current period.", "error");
    } finally {
      setIsReviewingPeriod(false);
    }
  };

  const closeCurrentPeriod = async () => {
    if (!ledgerPeriod || ledgerPeriod.closed) return;
    const confirmed = await confirm({
      title: "Close ledger period?",
      message: "Close the ledger period ending " + ledgerPeriod.periodEnd + "?\n\nNew entries and deletions for this period will be blocked.",
      confirmLabel: "Close period",
    });
    if (!confirmed) return;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    setIsReviewingPeriod(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/ledger/period/close`, {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ periodEnd: ledgerPeriod.periodEnd }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        showToast(payload.message ?? "Could not close the period.", "error");
        return;
      }
      await reviewCurrentPeriod();
      showToast("Ledger period closed.");
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : "Could not close the period.", "error");
    } finally {
      setIsReviewingPeriod(false);
    }
  };

  return (
    <section aria-labelledby="ledger-heading" className="space-y-3">
      {dialog}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#087b74]">DaroLedger</p>
          <h1 id="ledger-heading" className="font-jakarta text-[19px] font-bold text-[#10213c] sm:text-[21px]">Ledger</h1>
          <p className="mt-1 text-[10px] text-slate-600">Review accounts and journals created in this workspace.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportLedger} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dbe4f3] bg-white px-3 text-[9px] font-bold text-[#10213c] hover:bg-slate-50"><RiDownload2Line className="h-3.5 w-3.5" /> Export ledger</button>
          <button type="button" onClick={() => setIsJournalOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1e4fc1] px-3 text-[9px] font-bold text-white hover:bg-blue-800"><RiAddLine className="h-3.5 w-3.5" /> New journal</button>
        </div>
      </header>
      <nav aria-label="Ledger views" className="flex flex-wrap gap-1.5">
        {["Chart of accounts", "Journals", "Period close"].map((tab) => <button key={tab} type="button" aria-pressed={activeTab === tab} onClick={() => setActiveTab(tab)} className={`rounded-full px-3 py-1.5 text-[8px] font-bold ${activeTab === tab ? "bg-[#1e4fc1] text-white" : "border border-[#dbe4f3] bg-white text-[#10213c]"}`}>{tab}</button>)}
      </nav>
      {ledgerError ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[9px] text-red-700">{ledgerError}</p> : null}
      {isJournalOpen ? <JournalForm form={journalForm} setForm={setJournalForm} onClose={() => setIsJournalOpen(false)} onSave={() => void saveJournal()} /> : null}
      {activeTab === "Chart of accounts" ? (
        <section className="overflow-hidden rounded-xl border border-[#dfe7f4] bg-white" aria-label="Chart of accounts">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf1f7] px-3 py-2"><div className="flex items-center gap-2"><RiFileList3Line className="h-4 w-4 text-[#1e4fc1]" /><h2 className="text-[10px] font-bold text-[#10213c]">Chart of accounts</h2></div><div className="flex items-center gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search accounts" className="h-7 w-[180px] rounded-md border border-[#dbe4f3] px-2 text-[8px]" /><RiArrowDownSLine className="h-3 w-3 text-slate-500" /></div></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[560px] border-collapse text-left text-[9px]"><thead className="bg-[#f8faff] text-[8px] font-semibold text-slate-500"><tr><th className="px-3 py-2">Code</th><th className="px-3 py-2">Account</th><th className="px-3 py-2 text-right">Balance</th></tr></thead><tbody className="divide-y divide-[#edf1f7] text-[#10213c]">{visibleAccounts.length ? visibleAccounts.map((account) => <AccountRow key={account.code} account={account} journals={journals} currency={currency} expanded={expandedItems.includes(`account:${account.code}`)} onToggle={() => toggleItem(`account:${account.code}`)} />) : <tr><td colSpan={3} className="px-3 py-10 text-center text-slate-500">No accounts yet. Post a journal to create your first accounts.</td></tr>}</tbody></table></div>
        </section>
      ) : activeTab === "Journals" ? <section className="space-y-2" aria-label="Manual journals">{journals.length ? journals.map((journal) => <JournalRow key={journal.id} journal={journal} currency={currency} expanded={expandedItems.includes(`journal:${journal.id}`)} onToggle={() => toggleItem(`journal:${journal.id}`)} onDelete={() => void deleteJournal(journal)} deleting={deletingJournalId === journal.id} />) : <EmptyLedgerView icon={<RiFileList3Line className="h-5 w-5" />} title="Manual journals" message="No journals have been posted in this workspace." action="New journal" />}</section> : <PeriodCloseView period={ledgerPeriod} currency={currency} loading={isReviewingPeriod} onReview={() => void reviewCurrentPeriod()} onClose={() => void closeCurrentPeriod()} />}
    </section>
  );
}

function AccountRow({ account, journals, currency, expanded, onToggle }: { account: LedgerAccount; journals: Journal[]; currency: string; expanded: boolean; onToggle: () => void }) {
  const related = journals.filter((journal) => journal.lines.some((line) => line.accountCode === account.code));
  return (
    <>
      <tr className="cursor-pointer transition-colors hover:bg-[#f8faff]" onClick={onToggle}>
        <th className="px-3 py-3 font-bold text-[#1e4fc1]">{account.code}</th>
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${expanded ? "bg-[#1e4fc1]" : "bg-slate-300"}`} />
            <span className="font-semibold">{account.account}</span>
          </div>
        </td>
        <td className="px-3 py-3 text-right font-bold text-[#10213c]">{currency} {account.balance.toLocaleString()}</td>
      </tr>
      {expanded ? (
        <tr>
          <td colSpan={3} className="bg-[#f7f9fd] px-3 py-4">
            <div className="rounded-xl border border-[#dfe7f4] bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#1e4fc1]">Account details</p>
                  <h3 className="mt-1 text-[13px] font-bold text-[#10213c]">{account.account}</h3>
                  <p className="mt-0.5 text-[9px] text-slate-500">Account code {account.code}</p>
                </div>
                <div className="rounded-lg bg-[#edf3ff] px-3 py-2 text-right">
                  <p className="text-[8px] text-slate-500">Current balance</p>
                  <p className="mt-0.5 text-[13px] font-bold text-[#1e4fc1]">{currency} {account.balance.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <DetailStat label="Debit total" value={`${currency} ${account.debit.toLocaleString()}`} />
                <DetailStat label="Credit total" value={`${currency} ${account.credit.toLocaleString()}`} />
                <DetailStat label="Journal entries" value={String(account.journalCount)} />
              </div>
              {related.length ? (
                <div className="mt-4">
                  <p className="mb-2 text-[9px] font-bold text-[#10213c]">Related journals</p>
                  <div className="divide-y divide-[#edf1f7] rounded-lg border border-[#edf1f7]">
                    {related.map((journal) => (
                      <div key={journal.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-[9px]">
                        <div>
                          <p className="font-semibold text-[#10213c]">{journal.description}</p>
                          <p className="mt-0.5 text-[8px] text-slate-500">{journal.date}{journal.reference ? ` · ${journal.reference}` : ""}</p>
                        </div>
                        <span className="font-bold text-[#10213c]">{currency} {journal.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="mt-4 rounded-lg bg-[#f8faff] px-3 py-2 text-[9px] text-slate-500">No related journal entries.</p>}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function JournalRow({ journal, currency, expanded, onToggle, onDelete, deleting }: { journal: Journal; currency: string; expanded: boolean; onToggle: () => void; onDelete: () => void; deleting: boolean }) {
  return (
    <article className={`overflow-hidden rounded-xl border bg-white transition-shadow ${expanded ? "border-[#b9ccef] shadow-sm" : "border-[#dfe7f4]"}`}>
      <button type="button" className="w-full px-3 py-3 text-left transition-colors hover:bg-[#f8faff]" onClick={onToggle}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${journal.status === "posted" ? "bg-emerald-500" : "bg-amber-400"}`} />
            <div className="min-w-0">
              <h2 className="truncate text-[11px] font-bold text-[#10213c]">{journal.description}</h2>
              <p className="mt-1 text-[8px] text-slate-500">{journal.date}{journal.reference ? ` · Ref ${journal.reference}` : " · No reference"}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[8px] text-slate-500">Journal total</p>
            <strong className="text-[12px] text-[#10213c]">{currency} {journal.amount.toLocaleString()}</strong>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 pl-4.5">
          <span className="rounded-full bg-[#edf3ff] px-2 py-1 text-[7px] font-bold text-[#1e4fc1]">{journal.status}</span>
          <span className="rounded-full bg-[#f1f5f9] px-2 py-1 text-[7px] text-slate-600">{journal.lines.length} lines</span>
        </div>
      </button>
      {expanded ? (
        <div className="border-t border-[#edf1f7] bg-[#f7f9fd] px-3 py-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <DetailStat label="Journal ID" value={journal.id} />
            <DetailStat label="Date" value={journal.date} />
            <DetailStat label="Reference" value={journal.reference || "None"} />
            <DetailStat label="Status" value={journal.status} />
          </div>
          <div className="mt-4 rounded-xl border border-[#dfe7f4] bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[9px] font-bold text-[#10213c]">Journal lines</p>
              <span className="text-[8px] text-slate-500">{journal.lines.length} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] text-left text-[8px]">
                <thead className="border-b border-[#edf1f7] text-slate-500"><tr><th className="px-2 py-2">Account</th><th className="px-2 py-2 text-right">Debit</th><th className="px-2 py-2 text-right">Credit</th></tr></thead>
                <tbody className="divide-y divide-[#edf1f7]">
                  {journal.lines.map((line) => <tr key={line.accountCode}><td className="px-2 py-2 font-medium text-[#10213c]">{line.accountCode} · {line.accountName}</td><td className="px-2 py-2 text-right">{line.debit ? `${currency} ${line.debit.toLocaleString()}` : "—"}</td><td className="px-2 py-2 text-right">{line.credit ? `${currency} ${line.credit.toLocaleString()}` : "—"}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[9px] text-slate-500">Description: <span className="font-medium text-slate-700">{journal.description}</span></p>
            <button type="button" disabled={deleting} onClick={onDelete} className="rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">{deleting ? "Deleting…" : "Delete journal"}</button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-[#edf1f7] bg-white px-2.5 py-2"><p className="text-[7px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 break-words text-[9px] font-semibold text-[#10213c]">{value}</p></div>;
}

function JournalForm({ form, setForm, onClose, onSave }: { form: { date: string; reference: string; description: string; debitAccount: string; creditAccount: string; amount: string }; setForm: Dispatch<SetStateAction<{ date: string; reference: string; description: string; debitAccount: string; creditAccount: string; amount: string }>>; onClose: () => void; onSave: () => void }) {
  return <section aria-labelledby="new-journal-heading" className="rounded-xl border border-[#dfe7f4] bg-white p-3"><div className="flex items-center justify-between"><h2 id="new-journal-heading" className="text-[10px] font-bold text-[#10213c]">New journal</h2><button type="button" onClick={onClose} className="text-[9px] font-bold text-[#1e4fc1]">Close</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-[8px] font-semibold text-slate-600">Date<input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="mt-1 h-8 w-full rounded-md border px-2 text-[9px]" /></label><label className="text-[8px] font-semibold text-slate-600">Reference<input value={form.reference} onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))} className="mt-1 h-8 w-full rounded-md border px-2 text-[9px]" /></label><label className="text-[8px] font-semibold text-slate-600 sm:col-span-2">Description<input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="mt-1 h-8 w-full rounded-md border px-2 text-[9px]" /></label><label className="text-[8px] font-semibold text-slate-600">Debit account<input value={form.debitAccount} onChange={(event) => setForm((current) => ({ ...current, debitAccount: event.target.value }))} placeholder="Code · account name" className="mt-1 h-8 w-full rounded-md border px-2 text-[9px]" /></label><label className="text-[8px] font-semibold text-slate-600">Credit account<input value={form.creditAccount} onChange={(event) => setForm((current) => ({ ...current, creditAccount: event.target.value }))} placeholder="Code · account name" className="mt-1 h-8 w-full rounded-md border px-2 text-[9px]" /></label><label className="text-[8px] font-semibold text-slate-600">Amount<input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} className="mt-1 h-8 w-full rounded-md border px-2 text-[9px]" /></label></div><div className="mt-3 flex justify-end"><button type="button" onClick={onSave} className="rounded-md bg-[#1e4fc1] px-3 py-2 text-[9px] font-bold text-white">Post journal</button></div></section>;
}

function EmptyLedgerView({ icon, title, message, action, onAction }: { icon: ReactNode; title: string; message: string; action: string; onAction?: () => void }) {
  return <section className="rounded-xl border border-dashed border-[#dbe4f3] bg-white px-4 py-12 text-center"><span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#e8eefb] text-[#1e4fc1]">{icon}</span><h2 className="mt-3 text-[12px] font-bold text-[#10213c]">{title}</h2><p className="mx-auto mt-1 max-w-[360px] text-[9px] leading-relaxed text-slate-500">{message}</p><button type="button" onClick={onAction} className="mt-4 rounded-md bg-[#1e4fc1] px-3 py-2 text-[9px] font-bold text-white">{action}</button></section>;
}

function PeriodCloseView({ period, loading, onReview, onClose, currency }: { period: LedgerPeriod | null; loading: boolean; onReview: () => void; onClose: () => void; currency: string }) {
  if (!period) {
    return <EmptyLedgerView icon={<RiLockLine className="h-5 w-5" />} title="Period close" message="Review the current period before closing it. The review checks posted journals and the period total." action={loading ? "Reviewing…" : "Review current period"} onAction={onReview} />;
  }
  return <section className="rounded-xl border border-[#dfe7f4] bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#1e4fc1]">Current period</p><h2 className="mt-1 text-[14px] font-bold text-[#10213c]">{period.periodStart} to {period.periodEnd}</h2><p className="mt-1 text-[9px] text-slate-500">{period.journalCount} journal {period.journalCount === 1 ? "entry" : "entries"} are included.</p></div>
      <span className={`rounded-full px-2.5 py-1 text-[8px] font-bold ${period.closed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{period.closed ? "Closed" : "Open"}</span>
    </div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2"><DetailStat label="Period total" value={`${currency} ${period.total.toLocaleString()}`} /><DetailStat label="Status" value={period.closed ? `Closed ${period.closedAt ? new Date(period.closedAt).toLocaleDateString() : ""}` : "Ready for review"} /></div>
    <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={onReview} disabled={loading} className="rounded-md border border-[#dbe4f3] px-3 py-2 text-[9px] font-bold text-[#10213c] disabled:opacity-50">Refresh review</button>{!period.closed ? <button type="button" onClick={onClose} disabled={loading} className="rounded-md bg-[#1e4fc1] px-3 py-2 text-[9px] font-bold text-white disabled:opacity-50">{loading ? "Closing…" : "Close period"}</button> : null}</div>
  </section>;
}

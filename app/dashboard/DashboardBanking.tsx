"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  RiArrowDownSLine,
  RiBankLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiLinkM,
  RiPriceTag3Line,
  RiUpload2Line,
} from "@remixicon/react";
import { useConfirmDialog } from "@/app/components/ConfirmDialog";

type BankLine = {
  id: string;
  kind: "Transfer" | "POS settlement" | "Debit" | "Bank charges";
  merchant: string;
  date: string;
  amount: number;
  match: string | null;
  category: string | null;
  state: "suggested" | "matched" | "unmatched";
};

type BankingPayload = {
  account: { id: string; name: string; currency: string } | null;
  statementPeriod: string | null;
  statementBalance: number;
  booksBalance: number;
  lines: BankLine[];
};
type ManualBankingEntryResponse = {
  account: { id: string; name: string; currency: string };
  line: BankLine;
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

const DEFAULT_BANK_CATEGORIES = [
  "Bank charges",
  "Office and operating costs",
  "Office supplies",
  "Professional fees",
  "Rent",
  "Software and subscriptions",
  "Travel",
  "Utilities",
];

function formatMoney(value: number, currency = "USD") {
  return `${value < 0 ? "−" : ""}${currency} ${Math.abs(value).toLocaleString()}`;
}

type ParsedStatement = {
  accountName: string;
  currency: string;
  openingBalance: number | null;
  lines: Omit<BankLine, "id" | "state" | "category">[];
};

function parseStatementDate(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

function getLocalDate() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function isManualBankingEntryResponse(
  value: unknown,
): value is ManualBankingEntryResponse {
  if (!value || typeof value !== "object" || !("account" in value) || !("line" in value)) {
    return false;
  }
  const { account, line } = value;
  return (
    !!account &&
    typeof account === "object" &&
    "id" in account &&
    typeof account.id === "string" &&
    "name" in account &&
    typeof account.name === "string" &&
    "currency" in account &&
    typeof account.currency === "string" &&
    !!line &&
    typeof line === "object" &&
    "id" in line &&
    typeof line.id === "string" &&
    "kind" in line &&
    (line.kind === "Transfer" || line.kind === "Debit") &&
    "merchant" in line &&
    typeof line.merchant === "string" &&
    "date" in line &&
    typeof line.date === "string" &&
    "amount" in line &&
    typeof line.amount === "number" &&
    Number.isFinite(line.amount) &&
    "match" in line &&
    line.match === null &&
    "category" in line &&
    (typeof line.category === "string" || line.category === null) &&
    "state" in line &&
    line.state === "matched"
  );
}

function parseStatementText(text: string): ParsedStatement {
  const accountName = text.match(/Account Name\s*:\s*([^\n]+)/i)?.[1]?.trim() ?? "";
  const currency = text.match(/Currency\s*:\s*([A-Z]{3})/i)?.[1]?.toUpperCase() ?? "USD";
  const lines: ParsedStatement["lines"] = [];
  const openingBalance = text.match(/Opening Balance\s*:?\s*([\d,]+\.\d{2})/i)?.[1];
  const openingBalanceValue = openingBalance ? Number(openingBalance.replaceAll(",", "")) : null;
  let previousBalance: number | null = openingBalanceValue;
  for (const rawLine of text.split(/\r?\n/)) {
    const dateMatch = rawLine.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(.+)$/);
    if (!dateMatch) continue;
    const numbers = [...dateMatch[3].matchAll(/\d[\d,]*\.\d{2}/g)].map((match) => Number(match[0].replaceAll(",", "")));
    if (numbers.length < 2) continue;
    const balance = numbers[numbers.length - 1];
    const body = dateMatch[3].replace(/\d[\d,]*\.\d{2}/g, " ").replace(/\s+/g, " ").trim();
    const refMatch = body.match(/(\d{8,})\s*$/);
    const match = refMatch?.[1] ?? null;
    const merchant = body.replace(/\d{8,}\s*$/, "").trim();
    const change = previousBalance === null ? 0 : balance - previousBalance;
    const amount = numbers.length >= 3
      ? numbers[numbers.length - 3] || numbers[numbers.length - 2]
      : Math.abs(change) || numbers[0];
    const signedAmount = change < 0 ? -Math.abs(amount) : Math.abs(amount);
    const kind = /POS|settlement/i.test(merchant)
      ? "POS settlement"
      : /charge|maintenance|fee/i.test(merchant)
        ? "Bank charges"
        : signedAmount < 0
          ? "Debit"
          : "Transfer";
    lines.push({
      kind,
      merchant: merchant || "Bank transaction",
      date: parseStatementDate(dateMatch[1]),
      amount: signedAmount,
      match,
    });
    previousBalance = balance;
  }
  return { accountName, currency, openingBalance: openingBalanceValue, lines };
}

async function extractStatement(
  file: File,
  requestPassword: () => Promise<string | null>,
): Promise<ParsedStatement> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    });
    loadingTask.onPassword = async (callback: (password: string) => void) => {
      callback((await requestPassword()) ?? "");
    };
    const document = await loadingTask.promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const rows = new Map<number, string[]>();
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const y = "transform" in item ? Math.round(item.transform[5]) : 0;
        const row = rows.get(y) ?? [];
        row.push(item.str.trim());
        rows.set(y, row);
      }
      pages.push(
        [...rows.entries()]
          .sort(([first], [second]) => second - first)
          .map(([, row]) => row.join(" "))
          .join("\n"),
      );
    }
    return parseStatementText(pages.join("\n"));
  }
  if (file.type.startsWith("image/")) {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    try {
      const result = await worker.recognize(file);
      return parseStatementText(result.data.text);
    } finally {
      await worker.terminate();
    }
  }
  throw new Error("Upload a PDF or image statement.");
}

export default function DashboardBanking({
  currency = "USD",
  canImportStatements,
}: {
  currency?: string;
  canImportStatements: boolean;
}) {
  const [lines, setLines] = useState<BankLine[]>([]);
  const [period, setPeriod] = useState("");
  const [accountName, setAccountName] = useState("");
  const [statementBalance, setStatementBalance] = useState(0);
  const [booksBalance, setBooksBalance] = useState(0);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isSavingManualEntry, setIsSavingManualEntry] = useState(false);
  const [manualAccountName, setManualAccountName] = useState("");
  const [manualDate, setManualDate] = useState(getLocalDate);
  const [manualKind, setManualKind] = useState<"Transfer" | "Debit">(
    "Transfer",
  );
  const [manualMerchant, setManualMerchant] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualCategory, setManualCategory] = useState(
    DEFAULT_BANK_CATEGORIES[0],
  );
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [statementPassword, setStatementPassword] = useState("");
  const [categoryEditorLineId, setCategoryEditorLineId] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const passwordResolverRef = useRef<((password: string | null) => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog } = useConfirmDialog();
  const matchedCount = lines.filter((line) => line.state === "matched").length;
  const progress = lines.length ? Math.round((matchedCount / lines.length) * 100) : 0;

  const requestPassword = () =>
    new Promise<string | null>((resolve) => {
      passwordResolverRef.current = resolve;
      setStatementPassword("");
      setIsPasswordDialogOpen(true);
    });

  const closePasswordDialog = (password: string | null) => {
    const resolve = passwordResolverRef.current;
    passwordResolverRef.current = null;
    setIsPasswordDialogOpen(false);
    setStatementPassword("");
    resolve?.(password);
  };

  const saveManualEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isSavingManualEntry) return;
    setIsSavingManualEntry(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/banking/entries`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountName: manualAccountName.trim(),
          currency,
          kind: manualKind,
          merchant: manualMerchant.trim(),
          date: manualDate,
          amount: Number(manualAmount),
          category: manualCategory,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "message" in payload &&
          typeof payload.message === "string"
            ? payload.message
            : `Could not save manual bank entry (HTTP ${response.status}).`;
        throw new Error(message);
      }
      if (!isManualBankingEntryResponse(payload)) {
        throw new Error("The banking service returned invalid entry data.");
      }
      setAccountName(payload.account.name);
      setLines((current) =>
        [payload.line, ...current]
          .sort((first, second) => second.date.localeCompare(first.date))
          .slice(0, 500),
      );
      setStatementBalance((current) => current + payload.line.amount);
      setBooksBalance((current) => current + payload.line.amount);
      setPeriod(`${payload.line.date.slice(0, 7)}-15`);
      setManualMerchant("");
      setManualAmount("");
      setIsManualEntryOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save manual bank entry.",
      );
    } finally {
      setIsSavingManualEntry(false);
    }
  };

  useEffect(() => {
    const loadBanking = async () => {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) {
        setError("Your session has expired. Please sign in again.");
        setIsLoading(false);
        return;
      }
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(`${API_BASE_URL}/dashboard/banking`, {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as Partial<BankingPayload> & { message?: string };
        if (!response.ok) throw new Error(payload.message ?? "Could not load banking.");
        setAccountName(payload.account?.name ?? "");
        setPeriod(payload.statementPeriod ? `${payload.statementPeriod}-15` : "");
        setStatementBalance(payload.statementBalance ?? 0);
        setBooksBalance(payload.booksBalance ?? 0);
        setLines(payload.lines ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load banking.");
      } finally {
        window.clearTimeout(timeout);
        setIsLoading(false);
      }
    };
    void loadBanking();
  }, []);

  const updateLine = async (id: string, action: "confirm" | "category", category?: string) => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return false;
    try {
      const selectedCategory = action === "category" ? category : undefined;
      const response = await fetch(
        `${API_BASE_URL}/dashboard/banking/lines/${encodeURIComponent(id)}/${action === "confirm" ? "confirm" : "category"}`,
        {
          method: "PATCH",
          headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
          body: selectedCategory ? JSON.stringify({ category: selectedCategory }) : undefined,
        },
      );
      if (!response.ok) throw new Error("Could not update bank line.");
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not update bank line.");
      return false;
    }
  };

  const confirmLine = (id: string) => {
    void updateLine(id, "confirm");
    setLines((current) =>
      current.map((line) =>
        line.id === id ? { ...line, state: "matched", match: line.match ?? "Matched manually" } : line,
      ),
    );
  };

  const chooseCategory = (id: string) => {
    const line = lines.find((item) => item.id === id);
    setCategoryEditorLineId(id);
    setCategoryDraft(line?.category ?? DEFAULT_BANK_CATEGORIES[0]);
    setCustomCategory("");
  };

  const saveCategory = async (id: string) => {
    const selectedCategory = categoryDraft === "__custom__"
      ? customCategory.trim()
      : categoryDraft.trim();
    if (!selectedCategory) {
      setError("Enter a category name.");
      return;
    }
    const saved = await updateLine(id, "category", selectedCategory);
    if (!saved) return;
    setLines((current) =>
      current.map((line) =>
        line.id === id ? { ...line, category: selectedCategory, state: "unmatched" } : line,
      ),
    );
    setCategoryEditorLineId(null);
    setCustomCategory("");
  };

  const importStatement = async (file: File) => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isImporting) return;
    setIsImporting(true);
    setError("");
    try {
      const parsed = await extractStatement(file, requestPassword);
      if (!parsed.lines.length) throw new Error("No bank transactions were found in this statement.");
      const response = await fetch(`${API_BASE_URL}/dashboard/banking/import`, {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ accountName: parsed.accountName || accountName || "Imported bank account", currency: parsed.currency, openingBalance: parsed.openingBalance, lines: parsed.lines }),
      });
      const payload = (await response.json()) as { message?: string; statementPeriod?: string };
      if (!response.ok) throw new Error(payload.message ?? "Could not import statement.");
      setAccountName(parsed.accountName || accountName || "Imported bank account");
      setPeriod(payload.statementPeriod ? `${payload.statementPeriod}-15` : period);
      const loaded = await fetch(`${API_BASE_URL}/dashboard/banking`, {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
      });
      const refreshed = await loaded.json() as Partial<BankingPayload>;
      setAccountName(refreshed.account?.name ?? parsed.accountName);
      setPeriod(refreshed.statementPeriod ? `${refreshed.statementPeriod}-15` : period);
      setStatementBalance(refreshed.statementBalance ?? 0);
      setBooksBalance(refreshed.booksBalance ?? 0);
      setLines(refreshed.lines ?? []);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Could not import statement.");
    } finally {
      setIsImporting(false);
    }
  };

  const clearStatement = async () => {
    const confirmed = await confirm({
      title: "Clear imported statement?",
      message: "Remove all imported bank lines and their generated ledger entries. This cannot be undone.",
      confirmLabel: "Clear statement",
      destructive: true,
    });
    if (!confirmed) return;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    setIsClearing(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/banking/statements`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Could not clear the statement.");
      setLines([]);
      setAccountName("");
      setPeriod("");
      setStatementBalance(0);
      setBooksBalance(0);
      setError("");
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Could not clear the statement.");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <section aria-labelledby="banking-heading" className="space-y-3">
      {dialog}
      {isLoading ? (
        <div aria-busy="true" aria-label="Loading bank reconciliation" className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="mb-2 h-2 w-16 animate-pulse rounded bg-slate-200" />
              <div className="h-6 w-44 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-3 w-32 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-200" />
              <div className="h-9 w-36 animate-pulse rounded-lg bg-slate-200" />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-[74px] animate-pulse rounded-xl border border-[#e7edf6] bg-white p-3">
                <div className="h-2 w-20 rounded bg-slate-200" />
                <div className="mt-3 h-4 w-28 rounded bg-slate-200" />
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-xl border border-[#dfe7f4] bg-white">
            <div className="flex h-[41px] items-center border-b border-[#edf1f7] px-3">
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
            </div>
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="grid gap-3 border-b border-[#edf1f7] px-3 py-3 sm:grid-cols-[1.35fr_100px_1fr_auto] sm:items-center">
                <div className="h-3 animate-pulse rounded bg-slate-200" />
                <div className="h-3 animate-pulse rounded bg-slate-200" />
                <div className="h-3 animate-pulse rounded bg-slate-200" />
                <div className="h-7 w-16 animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {!isLoading ? (
        <>
      {isPasswordDialogOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="statement-password-title"
            onSubmit={(event) => {
              event.preventDefault();
              closePasswordDialog(statementPassword);
            }}
            className="w-full max-w-[390px] rounded-2xl border border-[#e1e8f4] bg-white p-5 shadow-2xl"
          >
            <h2 id="statement-password-title" className="text-[13px] font-bold text-[#10213c]">
              Enter statement password
            </h2>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
              This PDF is protected. Enter its password to read the statement.
            </p>
            <label className="mt-4 block text-[9px] font-semibold text-slate-600">
              PDF password
              <input
                autoFocus
                type="password"
                value={statementPassword}
                onChange={(event) => setStatementPassword(event.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-[#dbe4f3] px-3 text-[10px] text-[#10213c] outline-none focus:border-[#1e4fc1]"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => closePasswordDialog(null)} className="rounded-lg border border-[#dbe4f3] px-3 py-2 text-[10px] font-semibold text-slate-700">
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-[#1e4fc1] px-3 py-2 text-[10px] font-semibold text-white">
                Unlock statement
              </button>
            </div>
          </form>
        </div>
      ) : null}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#087b74]">Banking</p>
          <h1 id="banking-heading" className="font-jakarta text-[19px] font-bold text-[#10213c] sm:text-[21px]">{canImportStatements ? "Bank reconciliation" : "Manual bank entries"}</h1>
          <p className="mt-1 text-[10px] text-slate-600">Statement month {period ? period.slice(0, 7) : "Not imported"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="bank-period">Statement period</label>
          <input id="bank-period" type="date" value={period} onChange={(event) => setPeriod(event.target.value)} className="h-9 rounded-lg border border-[#dbe4f3] bg-white px-2 text-[9px] text-[#10213c]" />
          <button type="button" disabled={!accountName} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dbe4f3] bg-white px-3 text-[9px] font-bold text-[#10213c] disabled:cursor-default disabled:text-slate-500">{accountName || "No bank account imported"} {accountName ? <RiArrowDownSLine className="h-3.5 w-3.5" /> : null}</button>
          <input ref={fileInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importStatement(file); event.target.value = ""; }} />
          <button type="button" onClick={() => setIsManualEntryOpen((open) => !open)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dbe4f3] bg-white px-3 text-[9px] font-bold text-[#10213c] hover:bg-slate-50">{isManualEntryOpen ? "Cancel entry" : "Add manual entry"}</button>
          {canImportStatements ? (
            <button type="button" disabled={isImporting} onClick={() => fileInputRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1e4fc1] px-3 text-[9px] font-bold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"><RiUpload2Line className="h-3.5 w-3.5" /> {isImporting ? "Reading statement…" : "Import statement"}</button>
          ) : null}
          {canImportStatements && (accountName || lines.length) ? (
            <button type="button" disabled={isClearing} onClick={() => void clearStatement()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-[9px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-60">
              <RiDeleteBinLine className="h-3.5 w-3.5" /> {isClearing ? "Clearing…" : "Clear statement"}
            </button>
          ) : null}
        </div>
      </header>

      {isManualEntryOpen ? (
        <form
          onSubmit={(event) => void saveManualEntry(event)}
          className="grid gap-3 rounded-xl border border-[#dfe7f4] bg-white p-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="text-[9px] font-semibold text-slate-600">
            Bank account
            <input
              required
              maxLength={120}
              value={manualAccountName || accountName}
              onChange={(event) => setManualAccountName(event.target.value)}
              placeholder="Account name"
              className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-2 text-[10px] text-[#10213c]"
            />
          </label>
          <label className="text-[9px] font-semibold text-slate-600">
            Date
            <input
              required
              type="date"
              value={manualDate}
              onChange={(event) => setManualDate(event.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-2 text-[10px] text-[#10213c]"
            />
          </label>
          <label className="text-[9px] font-semibold text-slate-600">
            Direction
            <select
              value={manualKind}
              onChange={(event) =>
                setManualKind(event.target.value as "Transfer" | "Debit")
              }
              className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] bg-white px-2 text-[10px] text-[#10213c]"
            >
              <option value="Transfer">Money in</option>
              <option value="Debit">Money out</option>
            </select>
          </label>
          <label className="text-[9px] font-semibold text-slate-600">
            Description
            <input
              required
              maxLength={160}
              value={manualMerchant}
              onChange={(event) => setManualMerchant(event.target.value)}
              placeholder="Transaction description"
              className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-2 text-[10px] text-[#10213c]"
            />
          </label>
          <label className="text-[9px] font-semibold text-slate-600">
            Amount ({currency})
            <input
              required
              min="0.01"
              step="0.01"
              type="number"
              value={manualAmount}
              onChange={(event) => setManualAmount(event.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-2 text-[10px] text-[#10213c]"
            />
          </label>
          <label className="text-[9px] font-semibold text-slate-600">
            Category
            <select
              value={manualCategory}
              onChange={(event) => setManualCategory(event.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] bg-white px-2 text-[10px] text-[#10213c]"
            >
              {DEFAULT_BANK_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center justify-end gap-2 sm:col-span-2 lg:col-span-3">
            <button
              type="button"
              onClick={() => setIsManualEntryOpen(false)}
              className="rounded-md border border-[#dbe4f3] px-3 py-2 text-[9px] font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingManualEntry}
              className="rounded-md bg-[#1e4fc1] px-3 py-2 text-[9px] font-bold text-white disabled:cursor-wait disabled:opacity-60"
            >
              {isSavingManualEntry ? "Saving…" : "Save bank entry"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-4">
        <SummaryCard label="Statement balance" value={`${currency} ${statementBalance.toLocaleString()}`} />
        <SummaryCard label="Books balance" value={`${currency} ${booksBalance.toLocaleString()}`} />
        <SummaryCard label="Difference" value={`${currency} ${Math.abs(statementBalance - booksBalance).toLocaleString()}`} tone="amber" />
        <SummaryCard label={`${matchedCount} of ${lines.length} lines matched`} value={`${progress}%`} progress={progress} />
      </div>

      <section className="overflow-hidden rounded-xl border border-[#dfe7f4] bg-white" aria-label="Bank statement lines">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf1f7] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <RiBankLine className="h-4 w-4 text-[#1e4fc1]" />
            <h2 className="text-[10px] font-bold text-[#10213c]">Bank lines</h2>
          </div>
          <span className="text-[8px] text-slate-500">Confirm a suggestion or pick another record</span>
        </div>
        <div className="divide-y divide-[#edf1f7]">
          {lines.map((line) => (
            <article key={line.id} className={`grid gap-2 px-3 py-2.5 text-[9px] sm:grid-cols-[minmax(190px,1.35fr)_100px_minmax(190px,1fr)_auto] sm:items-center ${line.state === "matched" ? "bg-[#f3fbf9]" : line.state === "unmatched" ? "bg-[#fff8e9]" : "bg-white"}`}>
              <div className="flex min-w-0 items-start gap-2">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${line.state === "matched" ? "bg-[#087b74]" : line.state === "unmatched" ? "bg-[#c56a00]" : "bg-[#1e4fc1]"}`} />
                <div className="min-w-0">
                  <p className="truncate font-bold text-[#10213c]">{line.kind} · {line.merchant}</p>
                  <p className="mt-0.5 text-[8px] text-slate-500">{line.date}</p>
                </div>
              </div>
              <strong className={`text-left sm:text-right ${line.amount < 0 ? "text-[#10213c]" : "text-[#087b74]"}`}>{formatMoney(line.amount, currency)}</strong>
              <div className="flex min-w-0 items-center gap-2 text-[8px]">
                {line.state === "matched" ? (
                  <span className="font-bold text-[#087b74]">Matched</span>
                ) : categoryEditorLineId === line.id ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <label className="sr-only" htmlFor={`category-${line.id}`}>Category</label>
                    <select
                      id={`category-${line.id}`}
                      value={categoryDraft}
                      onChange={(event) => setCategoryDraft(event.target.value)}
                      className="h-7 rounded-md border border-[#dbe4f3] bg-white px-2 text-[8px] text-[#10213c]"
                    >
                      {Array.from(new Set([...DEFAULT_BANK_CATEGORIES, line.category].filter(Boolean) as string[])).map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                      <option value="__custom__">Add custom category...</option>
                    </select>
                    {categoryDraft === "__custom__" ? (
                      <input
                        autoFocus
                        value={customCategory}
                        onChange={(event) => setCustomCategory(event.target.value)}
                        maxLength={120}
                        placeholder="New category"
                        className="h-7 w-28 rounded-md border border-[#dbe4f3] px-2 text-[8px] text-[#10213c]"
                      />
                    ) : null}
                  </div>
                ) : line.category ? (
                  <span className="font-semibold text-[#946000]">Category: {line.category}</span>
                ) : line.match ? (
                  <>
                    <span className="text-slate-500">Matches {line.match}</span>
                    <RiLinkM className="h-3 w-3 text-[#1e4fc1]" />
                  </>
                ) : (
                  <span className="font-semibold text-[#b65b00]">No match found</span>
                )}
              </div>
              <div className="flex justify-start gap-1.5 sm:justify-end">
                {line.state === "matched" ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#dff4ef] px-2 py-1 text-[8px] font-bold text-[#087b74]"><RiCheckLine className="h-3 w-3" /> Confirmed</span>
                ) : !canImportStatements ? (
                  <span className="text-[8px] text-slate-500">
                    Reconciliation is available on paid plans
                  </span>
                ) : categoryEditorLineId === line.id ? (
                  <>
                    <button type="button" onClick={() => setCategoryEditorLineId(null)} className="rounded-md border border-[#dbe4f3] px-2 py-1 text-[8px] font-bold text-slate-600">Cancel</button>
                    <button type="button" onClick={() => void saveCategory(line.id)} className="rounded-md bg-[#1e4fc1] px-2 py-1 text-[8px] font-bold text-white">Save</button>
                  </>
                ) : line.state === "unmatched" ? (
                  <button type="button" onClick={() => chooseCategory(line.id)} className="inline-flex items-center gap-1 rounded-md border border-[#e5b979] bg-white px-2 py-1 text-[8px] font-bold text-[#a45a00]"><RiPriceTag3Line className="h-3 w-3" /> {line.category ? "Change category" : "Choose category"}</button>
                ) : (
                  <button type="button" onClick={() => confirmLine(line.id)} className="inline-flex items-center gap-1 rounded-md bg-[#1e4fc1] px-2.5 py-1 text-[8px] font-bold text-white hover:bg-blue-800"><RiCheckLine className="h-3 w-3" /> Confirm</button>
                )}
              </div>
            </article>
          ))}
          {!lines.length ? <p className="px-3 py-10 text-center text-[9px] text-slate-500">{canImportStatements ? "No bank statement imported yet. Import a statement or add a manual entry." : "No bank entries yet. Add a manual entry to get started."}</p> : null}
        </div>
      </section>
      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[9px] text-red-800">{error}</p> : null}
        </>
      ) : null}
    </section>
  );
}

function SummaryCard({ label, value, tone = "default", progress }: { label: string; value: string; tone?: "default" | "amber"; progress?: number }) {
  return <article className={`min-w-0 rounded-xl border px-3 py-2.5 ${tone === "amber" ? "border-[#f0d7a2] bg-[#fff8e9]" : "border-[#dfe7f4] bg-white"}`}><p className="text-[8px] font-semibold text-slate-500">{label}</p><p className="mt-1 text-[15px] font-bold text-[#10213c]">{value}</p>{progress !== undefined ? <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#dbe4f3]"><div className="h-full rounded-full bg-[#1e4fc1]" style={{ width: `${progress}%` }} /></div> : null}</article>;
}

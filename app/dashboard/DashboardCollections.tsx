"use client";

import { useEffect, useState } from "react";
import { RiAddLine, RiBankCardLine, RiRefreshLine } from "@remixicon/react";
import { useToastOnChange } from "@/app/components/toast";

type Invoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  billingPlan: "single" | "recurring";
  total: number;
  amountDue: number;
  status: "draft" | "sending" | "sent" | "paid" | "cancelled";
  sentAt: string | null;
  paidAt: string | null;
};

type Tab = "received" | "recurring" | "gateways";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

function isInvoice(value: unknown): value is Invoice {
  return (
    !!value &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string" &&
    "invoiceNumber" in value &&
    typeof value.invoiceNumber === "string" &&
    "customerName" in value &&
    typeof value.customerName === "string" &&
    "customerEmail" in value &&
    typeof value.customerEmail === "string" &&
    "issueDate" in value &&
    typeof value.issueDate === "string" &&
    "dueDate" in value &&
    typeof value.dueDate === "string" &&
    "currency" in value &&
    typeof value.currency === "string" &&
    "billingPlan" in value &&
    (value.billingPlan === "single" || value.billingPlan === "recurring") &&
    "total" in value &&
    typeof value.total === "number" &&
    Number.isFinite(value.total) &&
    "amountDue" in value &&
    typeof value.amountDue === "number" &&
    Number.isFinite(value.amountDue) &&
    "status" in value &&
    ["draft", "sending", "sent", "paid", "cancelled"].includes(
      String(value.status),
    ) &&
    "sentAt" in value &&
    (typeof value.sentAt === "string" || value.sentAt === null) &&
    "paidAt" in value &&
    (typeof value.paidAt === "string" || value.paidAt === null)
  );
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "code",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
}

function formatCurrencyTotals(
  invoices: Invoice[],
  getAmount: (invoice: Invoice) => number,
) {
  const totals = new Map<string, number>();
  for (const invoice of invoices) {
    totals.set(
      invoice.currency,
      (totals.get(invoice.currency) ?? 0) + getAmount(invoice),
    );
  }
  if (totals.size === 0) return "—";
  return [...totals.entries()]
    .map(([currency, amount]) => formatMoney(amount, currency))
    .join(" · ");
}

export default function DashboardCollections({
  search = "",
  onNotice,
}: {
  search?: string;
  onNotice: (message: string) => void;
}) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("received");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  useToastOnChange(error);

  useEffect(() => {
    let isCurrent = true;
    async function loadInvoices() {
      setIsLoading(true);
      setError("");
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) {
        setError("Sign in again to view collections.");
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/invoices`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          let message: string | undefined;
          if (payload && typeof payload === "object" && "message" in payload) {
            if (typeof payload.message === "string") message = payload.message;
            else if (
              Array.isArray(payload.message) &&
              payload.message.every((item) => typeof item === "string")
            ) {
              message = payload.message.join(" ");
            }
          }
          throw new Error(
            message ?? `Could not load collections (HTTP ${response.status}).`,
          );
        }
        if (
          !payload ||
          typeof payload !== "object" ||
          !("invoices" in payload) ||
          !Array.isArray(payload.invoices) ||
          !payload.invoices.every(isInvoice)
        ) {
          throw new Error(
            "The collections service returned invalid invoice data.",
          );
        }
        if (isCurrent) setInvoices(payload.invoices);
      } catch (loadError) {
        if (isCurrent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load collections. Please try again.",
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }
    void loadInvoices();
    return () => {
      isCurrent = false;
    };
  }, [loadAttempt]);

  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");
  const paidThisMonth = paidInvoices.filter(
    (invoice) =>
      invoice.paidAt?.slice(0, 7) === new Date().toISOString().slice(0, 7),
  );
  const awaitingInvoices = invoices.filter(
    (invoice) => invoice.status === "sent",
  );
  const recurringInvoices = invoices.filter(
    (invoice) =>
      invoice.billingPlan === "recurring" && invoice.status !== "cancelled",
  );
  const sourceInvoices =
    activeTab === "received"
      ? paidInvoices
      : activeTab === "recurring"
        ? recurringInvoices
        : [];
  const query = search.trim().toLowerCase();
  const visibleInvoices = sourceInvoices.filter(
    (invoice) =>
      !query ||
      `${invoice.customerName} ${invoice.customerEmail} ${invoice.invoiceNumber} ${invoice.currency}`
        .toLowerCase()
        .includes(query),
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "received", label: "Payments received" },
    { key: "recurring", label: "Recurring invoices" },
    { key: "gateways", label: "Payment gateways" },
  ];

  return (
    <section aria-labelledby="collections-heading">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 inline-flex rounded-full bg-[#e5f7f5] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[#087b74]">
            DaroCollect
          </p>
          <h1
            id="collections-heading"
            className="font-jakarta text-[19px] font-bold tracking-[-0.35px] text-[#10213c] sm:text-[21px]"
          >
            Collections and recurring invoices
          </h1>
          <p className="mt-0.5 max-w-[720px] text-[10px] text-slate-600 sm:text-[11px]">
            Review invoice payments and recurring invoices recorded in your
            workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onNotice(
              "Payment links and gateway reconciliation are not connected yet. You can email an invoice from the Invoices page.",
            )
          }
          className="flex h-8 items-center gap-1 rounded-lg bg-[#1e4fc1] px-3 text-[10px] font-bold text-white transition hover:bg-blue-800"
        >
          <RiAddLine className="h-4 w-4" />
          Create payment link
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-800"
        >
          <span>{error}</span>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            className="inline-flex items-center gap-1 rounded-md border border-red-300 px-2 py-1 font-bold hover:bg-red-100 disabled:opacity-60"
          >
            <RiRefreshLine className="h-3 w-3" />
            Try again
          </button>
        </div>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
        <CollectionMetric
          label="Collected this month"
          value={formatCurrencyTotals(
            paidThisMonth,
            (invoice) => invoice.total,
          )}
        />
        <CollectionMetric
          label="Awaiting payment"
          value={formatCurrencyTotals(
            awaitingInvoices,
            (invoice) => invoice.amountDue,
          )}
        />
        <CollectionMetric
          label="Payments recorded"
          value={String(paidInvoices.length)}
        />
        <CollectionMetric
          label="Recurring invoices"
          value={String(recurringInvoices.length)}
        />
      </div>

      <div
        role="tablist"
        aria-label="Collections views"
        className="mb-2 flex flex-wrap gap-1.5"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            id={`collections-tab-${tab.key}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls="collections-panel"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-3 py-1.5 text-[9px] font-bold transition ${
              activeTab === tab.key
                ? "bg-[#1e4fc1] text-white"
                : "border border-[#dbe4f3] bg-white text-slate-700 hover:border-[#1e4fc1]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id="collections-panel"
        role="tabpanel"
        aria-labelledby={`collections-tab-${activeTab}`}
        className="overflow-hidden rounded-xl border border-[#e1e8f4] bg-white"
      >
        {activeTab === "gateways" ? (
          <div className="flex min-h-40 flex-col items-center justify-center px-4 py-9 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f6ff] text-[#1e4fc1]">
              <RiBankCardLine className="h-5 w-5" />
            </span>
            <h2 className="mt-2 text-[11px] font-bold text-[#10213c]">
              No payment gateways connected
            </h2>
            <p className="mt-1 max-w-[400px] text-[9px] leading-relaxed text-slate-500">
              Payment links, card processing, and automatic bank matching
              aren&apos;t connected yet. Payments marked as paid are shown in
              Payments received.
            </p>
          </div>
        ) : isLoading ? (
          <div role="status" className="space-y-2 p-3">
            <span className="sr-only">Loading collections…</span>
            {[0, 1, 2, 3].map((row) => (
              <div
                key={row}
                className="dashboard-skeleton-block h-8 rounded-md"
              />
            ))}
          </div>
        ) : visibleInvoices.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead className="bg-[#f8faff] text-[9px] font-semibold text-slate-600">
                <tr>
                  {(activeTab === "received"
                    ? [
                        "Customer",
                        "Invoice",
                        "Payment recorded",
                        "Amount",
                        "Status",
                      ]
                    : ["Customer", "Invoice", "Next due", "Amount", "Status"]
                  ).map((heading) => (
                    <th key={heading} scope="col" className="px-3 py-2.5">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-t border-[#edf1f7] text-[9px]"
                  >
                    <td className="px-3 py-2.5 font-semibold text-[#10213c]">
                      <span className="block">{invoice.customerName}</span>
                      <span className="font-normal text-slate-500">
                        {invoice.customerEmail}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-[#1e4fc1]">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {activeTab === "received"
                        ? invoice.paidAt
                          ? new Date(invoice.paidAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "2-digit",
                                year: "numeric",
                              },
                            )
                          : "Payment date unavailable"
                        : formatDate(invoice.dueDate)}
                    </td>
                    <td className="px-3 py-2.5 font-semibold">
                      {formatMoney(
                        activeTab === "received"
                          ? invoice.total
                          : invoice.status === "cancelled"
                            ? 0
                            : invoice.amountDue,
                        invoice.currency,
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-[8px] font-bold ${
                          invoice.status === "paid"
                            ? "bg-[#e5f7f5] text-[#087b74]"
                            : invoice.status === "sent"
                              ? "bg-blue-50 text-blue-800"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {invoice.status === "paid"
                          ? "Payment recorded"
                          : invoice.status === "cancelled"
                            ? "Cancelled"
                          : invoice.status === "sent"
                            ? "Awaiting payment"
                            : "Draft"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-10 text-center">
            <h2 className="text-[11px] font-bold text-[#10213c]">
              {activeTab === "received"
                ? paidInvoices.length
                  ? "No payments match your search"
                  : "No payments recorded yet"
                : recurringInvoices.length
                  ? "No recurring invoices match your search"
                  : "No recurring invoices yet"}
            </h2>
            <p className="mt-1 text-[9px] text-slate-500">
              {activeTab === "received"
                ? "Invoices appear here after they are marked as paid."
                : "Invoices set to recurring will appear here. Recurring scheduling is not automated yet."}
            </p>
          </div>
        )}
      </div>
      <p className="mt-2 text-[9px] text-slate-500">
        Payment methods and automatic matching are not currently recorded.
        Invoice totals are displayed in their original currencies.
      </p>
    </section>
  );
}

function CollectionMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="min-w-0 rounded-xl border border-[#e1e8f4] bg-white p-3">
      <h2 className="truncate text-[9px] font-semibold text-slate-600">
        {label}
      </h2>
      <p className="mt-1 font-jakarta text-[14px] font-bold leading-5 text-[#10213c]">
        {value}
      </p>
    </article>
  );
}

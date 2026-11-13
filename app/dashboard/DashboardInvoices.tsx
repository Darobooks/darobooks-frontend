"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  RiAddLine,
  RiArrowLeftSLine,
  RiDownload2Line,
  RiEditLine,
  RiEyeLine,
} from "@remixicon/react";
import { showToast, useToastOnChange } from "@/app/components/toast";
import { useConfirmDialog } from "@/app/components/ConfirmDialog";
import ActionSpinner from "../components/ActionSpinner";

type InvoiceLine = {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  reference: string | null;
  purchaseOrderNumber: string | null;
  billingPlan: "single" | "recurring";
  groupDiscountPercent: number;
  vatEnabled: boolean;
  whtEnabled: boolean;
  lines: InvoiceLine[];
  subtotal: number;
  vatAmount: number;
  whtAmount: number;
  total: number;
  amountDue: number;
  note: string;
  status: "draft" | "sending" | "sent" | "paid" | "cancelled";
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

type DraftLine = { description: string; quantity: string; rate: string };
type StockCatalogItem = {
  id: string;
  name: string;
  sku: string;
  kind: "product" | "service";
  price: number;
  taxable: boolean;
  onHand: number;
  reorderPoint: number;
};
type Filter = "All" | "Unpaid" | "Overdue" | "Paid" | "Draft" | "Cancelled";

const filters: Filter[] = [
  "All",
  "Unpaid",
  "Overdue",
  "Paid",
  "Draft",
  "Cancelled",
];
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isInvoiceLine(value: unknown): value is InvoiceLine {
  return (
    !!value &&
    typeof value === "object" &&
    "description" in value &&
    typeof value.description === "string" &&
    "quantity" in value &&
    typeof value.quantity === "number" &&
    "rate" in value &&
    typeof value.rate === "number" &&
    "amount" in value &&
    typeof value.amount === "number"
  );
}

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
    "reference" in value &&
    (typeof value.reference === "string" || value.reference === null) &&
    "purchaseOrderNumber" in value &&
    (typeof value.purchaseOrderNumber === "string" ||
      value.purchaseOrderNumber === null) &&
    "billingPlan" in value &&
    (value.billingPlan === "single" || value.billingPlan === "recurring") &&
    "groupDiscountPercent" in value &&
    typeof value.groupDiscountPercent === "number" &&
    "vatEnabled" in value &&
    typeof value.vatEnabled === "boolean" &&
    "whtEnabled" in value &&
    typeof value.whtEnabled === "boolean" &&
    "lines" in value &&
    Array.isArray(value.lines) &&
    value.lines.every(isInvoiceLine) &&
    "subtotal" in value &&
    typeof value.subtotal === "number" &&
    "vatAmount" in value &&
    typeof value.vatAmount === "number" &&
    "whtAmount" in value &&
    typeof value.whtAmount === "number" &&
    "total" in value &&
    typeof value.total === "number" &&
    "amountDue" in value &&
    typeof value.amountDue === "number" &&
    "note" in value &&
    typeof value.note === "string" &&
    "status" in value &&
    (value.status === "draft" ||
      value.status === "sending" ||
      value.status === "sent" ||
      value.status === "paid" ||
      value.status === "cancelled") &&
    "paidAt" in value &&
    (typeof value.paidAt === "string" || value.paidAt === null) &&
    "sentAt" in value &&
    (typeof value.sentAt === "string" || value.sentAt === null) &&
    "createdAt" in value &&
    typeof value.createdAt === "string"
  );
}

function getError(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    return undefined;
  }
  return typeof payload.message === "string" ? payload.message : undefined;
}

function isStockCatalogItem(value: unknown): value is StockCatalogItem {
  return (
    !!value &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "sku" in value &&
    typeof value.sku === "string" &&
    "kind" in value &&
    (value.kind === "product" || value.kind === "service") &&
    "price" in value &&
    typeof value.price === "number" &&
    Number.isFinite(value.price) &&
    "taxable" in value &&
    typeof value.taxable === "boolean" &&
    "onHand" in value &&
    typeof value.onHand === "number" &&
    "reorderPoint" in value &&
    typeof value.reorderPoint === "number"
  );
}

function showDashboardToast(message: string) {
  showToast(message);
}

export default function DashboardInvoices({
  mode,
  initialInvoiceId,
  businessName,
  defaultCurrency,
  vatRate,
  whtRate,
  search = "",
}: {
  mode: "list" | "new" | "view";
  initialInvoiceId?: string;
  businessName: string;
  defaultCurrency: string;
  vatRate: number;
  whtRate: number;
  search?: string;
}) {
  const { confirm, dialog } = useConfirmDialog();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [isLoading, setIsLoading] = useState(mode !== "new");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyInvoice, setBusyInvoice] = useState("");
  const [downloadingInvoice, setDownloadingInvoice] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingStatusId, setEditingStatusId] = useState("");
  const [editedStatus, setEditedStatus] = useState<
    "sent" | "paid" | "cancelled"
  >("sent");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [issueDate, setIssueDate] = useState(localDate());
  const [dueDate, setDueDate] = useState(() => {
    const due = new Date();
    due.setDate(due.getDate() + 14);
    return localDate(due);
  });
  const [reference, setReference] = useState("");
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const [billingPlan, setBillingPlan] = useState<"single" | "recurring">(
    "single",
  );
  const [groupDiscountPercent, setGroupDiscountPercent] = useState("0");
  const [vatEnabled, setVatEnabled] = useState(true);
  const [whtEnabled, setWhtEnabled] = useState(true);
  const [note, setNote] = useState(
    "Payment by bank transfer to the account on this invoice. Thank you for your business.",
  );
  const [lines, setLines] = useState<DraftLine[]>([
    { description: "", quantity: "1", rate: "" },
  ]);
  const [stockItems, setStockItems] = useState<StockCatalogItem[]>([]);
  const [isStockLoading, setIsStockLoading] = useState(false);
  const [stockLoadError, setStockLoadError] = useState("");
  const [selectedStockItemId, setSelectedStockItemId] = useState("");
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [filingInvoiceId, setFilingInvoiceId] = useState("");
  const [filedInvoiceIds, setFiledInvoiceIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [filingReferences, setFilingReferences] = useState<
    Record<string, string>
  >({});
  const [submittedInvoiceIds, setSubmittedInvoiceIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [externalReferences, setExternalReferences] = useState<
    Record<string, string>
  >({});
  const [submissionReferenceDraft, setSubmissionReferenceDraft] = useState("");
  useToastOnChange(error);
  useToastOnChange(stockLoadError);
  useToastOnChange(message, "success");
  const currency = /^[A-Z]{3}$/.test(defaultCurrency) ? defaultCurrency : "USD";

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 10_000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    if (mode !== "list" && mode !== "view") return;
    let isCurrent = true;
    async function loadInvoices() {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) {
        setError("Sign in again to view your invoices.");
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/invoices`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getError(payload) ??
              `Could not load invoices (HTTP ${response.status}).`,
          );
        }
        if (
          !payload ||
          typeof payload !== "object" ||
          !("invoices" in payload) ||
          !Array.isArray(payload.invoices) ||
          !payload.invoices.every(isInvoice)
        ) {
          throw new Error("The invoice service returned invalid invoice data.");
        }
        if (isCurrent) {
          setInvoices(payload.invoices);
          const filingResponse = await fetch(
            `${API_BASE_URL}/dashboard/e-invoicing`,
            { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
          );
          const filingPayload = (await filingResponse.json().catch(() => ({}))) as {
            invoices?: Array<{
              id: string;
              filingStatus?: "not_submitted" | "ready" | "submitted";
              taxAuthorityReference?: string | null;
              externalSubmissionReference?: string | null;
            }>;
          };
          if (filingResponse.ok && Array.isArray(filingPayload.invoices)) {
            const ready = new Set<string>();
            const submitted = new Set<string>();
            const references: Record<string, string> = {};
            const external: Record<string, string> = {};
            filingPayload.invoices.forEach((item) => {
              if (item.filingStatus === "ready" || item.filingStatus === "submitted") {
                ready.add(item.id);
              }
              if (item.filingStatus === "submitted") submitted.add(item.id);
              if (item.taxAuthorityReference) references[item.id] = item.taxAuthorityReference;
              if (item.externalSubmissionReference) external[item.id] = item.externalSubmissionReference;
            });
            setFiledInvoiceIds(ready);
            setSubmittedInvoiceIds(submitted);
            setFilingReferences(references);
            setExternalReferences(external);
          }
        }
      } catch (loadError) {
        if (isCurrent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load invoices. Please try again.",
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
  }, [mode]);

  useEffect(() => {
    if (mode !== "new") return;
    let isCurrent = true;
    const timeout = window.setTimeout(() => {
      async function loadStockItems() {
        setIsStockLoading(true);
        setStockLoadError("");
        try {
          const token = window.sessionStorage.getItem("darobooksAccessToken");
          if (!token) throw new Error("Sign in again to load saved items.");
          const response = await fetch(`${API_BASE_URL}/dashboard/items`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const payload: unknown = await response.json();
          if (!response.ok) {
            throw new Error(
              getError(payload) ??
                `Could not load saved items (HTTP ${response.status}).`,
            );
          }
          if (
            !payload ||
            typeof payload !== "object" ||
            !("items" in payload) ||
            !Array.isArray(payload.items) ||
            !payload.items.every(isStockCatalogItem)
          ) {
            throw new Error(
              "The inventory service returned invalid item data.",
            );
          }
          if (isCurrent) setStockItems(payload.items);
        } catch (loadError) {
          if (isCurrent) {
            setStockLoadError(
              loadError instanceof Error
                ? loadError.message
                : "Could not load saved items.",
            );
          }
        } finally {
          if (isCurrent) setIsStockLoading(false);
        }
      }
      void loadStockItems();
    }, 0);
    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [mode]);

  const totals = useMemo(() => {
    const subtotalCents = lines.reduce((sum, line) => {
      const quantity = Number(line.quantity);
      const rate = Number(line.rate);
      if (
        !Number.isSafeInteger(quantity) ||
        quantity < 1 ||
        !Number.isFinite(rate) ||
        rate <= 0
      ) {
        return sum;
      }
      return sum + Math.round(quantity * rate * 100);
    }, 0);
    const discount = Number(groupDiscountPercent) || 0;
    const discountedCents = Math.round(subtotalCents * (1 - discount / 100));
    const vatCents = vatEnabled
      ? Math.round(discountedCents * (vatRate / 100))
      : 0;
    const whtCents = whtEnabled
      ? Math.round(subtotalCents * (whtRate / 100))
      : 0;
    return {
      subtotal: subtotalCents / 100,
      vat: vatCents / 100,
      wht: whtCents / 100,
      total: (discountedCents + vatCents) / 100,
      due: Math.max(0, discountedCents + vatCents - whtCents) / 100,
    };
  }, [groupDiscountPercent, lines, vatEnabled, vatRate, whtEnabled, whtRate]);

  const today = localDate();
  const counts = {
    All: invoices.length,
    Unpaid: invoices.filter((invoice) => invoice.status === "sent").length,
    Overdue: invoices.filter(
      (invoice) => invoice.status === "sent" && invoice.dueDate < today,
    ).length,
    Paid: invoices.filter((invoice) => invoice.status === "paid").length,
    Draft: invoices.filter((invoice) => invoice.status === "draft").length,
    Cancelled: invoices.filter((invoice) => invoice.status === "cancelled")
      .length,
  };
  const searchTerm = search.trim().toLowerCase();
  const shownInvoices = invoices.filter((invoice) => {
    const overdue = invoice.status === "sent" && invoice.dueDate < today;
    const matchesFilter =
      activeFilter === "All" ||
      (activeFilter === "Unpaid" && invoice.status === "sent" && !overdue) ||
      (activeFilter === "Overdue" && overdue) ||
      (activeFilter === "Paid" && invoice.status === "paid") ||
      (activeFilter === "Draft" && invoice.status === "draft") ||
      (activeFilter === "Cancelled" && invoice.status === "cancelled");
    const matchesSearch =
      !searchTerm ||
      `${invoice.invoiceNumber} ${invoice.customerName} ${invoice.customerEmail} ${invoice.status}`
        .toLowerCase()
        .includes(searchTerm);
    return matchesFilter && matchesSearch;
  });
  const summary = {
    draft: invoices
      .filter((invoice) => invoice.status === "draft")
      .reduce((sum, invoice) => sum + invoice.amountDue, 0),
    awaiting: invoices
      .filter(
        (invoice) => invoice.status === "sent" && invoice.dueDate >= today,
      )
      .reduce((sum, invoice) => sum + invoice.amountDue, 0),
    overdue: invoices
      .filter((invoice) => invoice.status === "sent" && invoice.dueDate < today)
      .reduce((sum, invoice) => sum + invoice.amountDue, 0),
    paidThisMonth: invoices
      .filter(
        (invoice) =>
          invoice.status === "paid" &&
          invoice.paidAt?.slice(0, 7) === today.slice(0, 7),
      )
      .reduce((sum, invoice) => sum + invoice.total, 0),
  };

  function addStockItemToInvoice(itemId: string) {
    const stockItem = stockItems.find((item) => item.id === itemId);
    if (!stockItem) return;
    if (stockItem.kind === "product" && stockItem.onHand < 1) {
      setError(`${stockItem.name} is out of stock and cannot be added.`);
      setSelectedStockItemId("");
      return;
    }
    if (lines.length >= 50) {
      setError("An invoice can contain at most 50 item lines.");
      setSelectedStockItemId("");
      return;
    }

    const newLine = {
      description: stockItem.name,
      quantity: "1",
      rate: String(stockItem.price),
    };
    setLines((current) =>
      current.length === 1 &&
      !current[0].description.trim() &&
      !current[0].rate.trim()
        ? [newLine]
        : [...current, newLine],
    );
    setError("");
    setSelectedStockItemId("");
  }

  async function updateStatus(invoice: Invoice, action: "send" | "paid") {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || busyInvoice) return;
    setBusyInvoice(invoice.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/invoices/${invoice.id}/${action === "send" ? "send" : "mark-paid"}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getError(payload) ??
            `Could not update invoice (HTTP ${response.status}).`,
        );
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("invoice" in payload) ||
        !isInvoice(payload.invoice)
      ) {
        throw new Error("The invoice service returned invalid invoice data.");
      }
      const updatedInvoice = payload.invoice;
      setInvoices((current) =>
        current.map((item) => (item.id === invoice.id ? updatedInvoice : item)),
      );
      if (action === "send") setEditingStatusId("");
      setMessage(
        action === "send"
          ? `Invoice ${invoice.invoiceNumber} was emailed to ${invoice.customerEmail}.`
          : `Invoice ${invoice.invoiceNumber} was marked as paid.`,
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update invoice. Please try again.",
      );
    } finally {
      setBusyInvoice("");
    }
  }

  async function saveCorrectedStatus(invoice: Invoice) {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || busyInvoice) return;
    if (editedStatus === "cancelled") {
      const confirmed = await confirm({
        title: `Cancel invoice ${invoice.invoiceNumber}?`,
        message: "The invoice will be marked as cancelled.",
        confirmLabel: "Cancel invoice",
        destructive: true,
      });
      if (!confirmed) return;
    }
    setBusyInvoice(invoice.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/invoices/${invoice.id}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: editedStatus }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getError(payload) ??
            `Could not correct invoice status (HTTP ${response.status}).`,
        );
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("invoice" in payload) ||
        !isInvoice(payload.invoice)
      ) {
        throw new Error("The invoice service returned invalid invoice data.");
      }
      const correctedInvoice = payload.invoice;
      setInvoices((current) =>
        current.map((item) =>
          item.id === invoice.id ? correctedInvoice : item,
        ),
      );
      setMessage(
        `Invoice ${invoice.invoiceNumber} status updated to ${
          editedStatus === "paid"
            ? "Paid"
            : editedStatus === "cancelled"
              ? "Cancelled"
              : "Awaiting payment"
        }.`,
      );
      setEditingStatusId("");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not correct invoice status. Please try again.",
      );
    } finally {
      setBusyInvoice("");
    }
  }

  async function downloadInvoice(invoice: Invoice) {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || busyInvoice || downloadingInvoice) {
      if (!token) setError("Sign in again to download this invoice.");
      return;
    }

    async function markInvoiceReadyForFilingNested(invoice: Invoice) {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token || filingInvoiceId) {
        if (!token) setError("Sign in again to mark this invoice ready for filing.");
        return;
      }
      setFilingInvoiceId(invoice.id);
      setError("");
      try {
        const response = await fetch(
          `${API_BASE_URL}/dashboard/e-invoicing/invoices/${encodeURIComponent(invoice.id)}/file`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          taxAuthorityReference?: string;
          message?: string;
        };
        if (!response.ok) throw new Error(payload.message ?? "Could not prepare this invoice for filing.");
        setMessage(`Invoice ${invoice.invoiceNumber} is ready for filing${payload.taxAuthorityReference ? ` (${payload.taxAuthorityReference})` : ""}.`);
      } catch (filingError) {
        setError(filingError instanceof Error ? filingError.message : "Could not prepare this invoice for filing.");
      } finally {
        setFilingInvoiceId("");
      }
    }
    void markInvoiceReadyForFilingNested;
    setDownloadingInvoice(invoice.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/invoices/${invoice.id}/download`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) {
        const payload: unknown = await response.json();
        throw new Error(
          getError(payload) ??
            `Could not download invoice (HTTP ${response.status}).`,
        );
      }
      const pdf = await response.blob();
      if (pdf.type !== "application/pdf" || pdf.size === 0) {
        throw new Error(
          "The invoice download service returned an invalid PDF.",
        );
      }
      const downloadUrl = URL.createObjectURL(pdf);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${invoice.invoiceNumber.replace(/[^A-Za-z0-9._-]/g, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      setMessage(`Invoice ${invoice.invoiceNumber} downloaded.`);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Could not download invoice. Please try again.",
      );
    } finally {
      setDownloadingInvoice("");
    }
  }

  async function markInvoiceReadyForFiling(invoice: Invoice) {
    void recordExternalSubmissionInternal;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || filingInvoiceId) {
      if (!token) setError("Sign in again to mark this invoice ready for filing.");
      return;
    }

    async function recordExternalSubmissionInternal(invoice: Invoice) {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      const reference = submissionReferenceDraft.trim();
      if (!token || !reference) {
        if (!token) setError("Sign in again to record the tax authority submission.");
        return;
      }
      setFilingInvoiceId(invoice.id);
      setError("");
      try {
        const response = await fetch(
          `${API_BASE_URL}/dashboard/e-invoicing/invoices/${encodeURIComponent(invoice.id)}/submit`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ externalReference: reference }),
          },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          externalSubmissionReference?: string;
          message?: string;
        };
        if (!response.ok) {
          throw new Error(payload.message ?? "Could not record the tax authority submission.");
        }
        setSubmittedInvoiceIds((current) => {
          const next = new Set(current);
          next.add(invoice.id);
          return next;
        });
        setExternalReferences((current) => ({
          ...current,
          [invoice.id]: payload.externalSubmissionReference ?? reference,
        }));
        setMessage(`External submission recorded for ${invoice.invoiceNumber}.`);
        setSubmissionReferenceDraft("");
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Could not record the tax authority submission.",
        );
      } finally {
        setFilingInvoiceId("");
      }
    }
    setFilingInvoiceId(invoice.id);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/e-invoicing/invoices/${encodeURIComponent(invoice.id)}/file`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        taxAuthorityReference?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message ?? "Could not prepare this invoice for filing.");
      }
      setFiledInvoiceIds((current) => {
        const next = new Set(current);
        next.add(invoice.id);
        return next;
      });
      if (payload.taxAuthorityReference) {
        setFilingReferences((current) => ({
          ...current,
          [invoice.id]: payload.taxAuthorityReference ?? "",
        }));
      }
      setMessage(
        `Invoice ${invoice.invoiceNumber} is ready for filing${payload.taxAuthorityReference ? ` (${payload.taxAuthorityReference})` : ""}.`,
      );
    } catch (filingError) {
      setError(
        filingError instanceof Error
          ? filingError.message
          : "Could not prepare this invoice for filing.",
      );
    } finally {
      setFilingInvoiceId("");
    }
  }

  async function recordExternalSubmission(invoice: Invoice) {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    const reference = submissionReferenceDraft.trim();
    if (!token || !reference) {
      if (!token) setError("Sign in again to record the tax authority submission.");
      return;
    }
    setFilingInvoiceId(invoice.id);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/e-invoicing/invoices/${encodeURIComponent(invoice.id)}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ externalReference: reference }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        externalSubmissionReference?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(
          payload.message ?? "Could not record the tax authority submission.",
        );
      }
      setSubmittedInvoiceIds((current) => new Set(current).add(invoice.id));
      setExternalReferences((current) => ({
        ...current,
        [invoice.id]: payload.externalSubmissionReference ?? reference,
      }));
      setSubmissionReferenceDraft("");
      setMessage(`External submission recorded for ${invoice.invoiceNumber}.`);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Could not record the tax authority submission.",
      );
    } finally {
      setFilingInvoiceId("");
    }
  }

  async function submitInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setError("Sign in again to create an invoice.");
      return;
    }
    const linesPayload = lines.map((line) => ({
      description: line.description.trim(),
      quantity: Number(line.quantity),
      rate: Number(line.rate),
    }));
    if (
      dueDate < issueDate ||
      linesPayload.some(
        (line) =>
          !line.description ||
          !Number.isSafeInteger(line.quantity) ||
          line.quantity < 1 ||
          !Number.isFinite(line.rate) ||
          line.rate <= 0,
      )
    ) {
      setError("Enter valid invoice dates and complete every item line.");
      return;
    }
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const shouldSend = submitter?.value === "send";
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      if (savedDraftId) {
        if (shouldSend) {
          const sendResponse = await fetch(
            `${API_BASE_URL}/invoices/${savedDraftId}/send`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const sendPayload: unknown = await sendResponse.json();
          if (!sendResponse.ok) {
            throw new Error(
              getError(sendPayload) ??
                `Could not send invoice (HTTP ${sendResponse.status}).`,
            );
          }
          showDashboardToast("Your invoice was emailed successfully.");
        } else {
          showDashboardToast("Your invoice was saved as a draft.");
        }
        router.push("/dashboard/invoices");
        return;
      }
      const response = await fetch(`${API_BASE_URL}/invoices`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName,
          customerEmail,
          issueDate,
          dueDate,
          currency,
          reference,
          purchaseOrderNumber,
          billingPlan,
          groupDiscountPercent: Number(groupDiscountPercent),
          vatEnabled,
          whtEnabled,
          lines: linesPayload,
          note,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getError(payload) ??
            `Could not save invoice (HTTP ${response.status}).`,
        );
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("invoice" in payload) ||
        !isInvoice(payload.invoice)
      ) {
        throw new Error("The invoice service returned invalid invoice data.");
      }
      const createdInvoice = payload.invoice;
      if (!shouldSend) {
        showDashboardToast(
          "Your invoice was added as a draft. You can send it later.",
        );
        router.push("/dashboard/invoices");
        return;
      }
      setSavedDraftId(createdInvoice.id);
      if (shouldSend) {
        const sendResponse = await fetch(
          `${API_BASE_URL}/invoices/${createdInvoice.id}/send`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const sendPayload: unknown = await sendResponse.json();
        if (!sendResponse.ok) {
          throw new Error(
            `The invoice was saved as a draft. Retry sending it, or return to invoices. Email delivery failed: ${
              getError(sendPayload) ?? `HTTP ${sendResponse.status}`
            }`,
          );
        }
        showDashboardToast(
          `Invoice ${createdInvoice.invoiceNumber} was emailed to ${createdInvoice.customerEmail}.`,
        );
      }
      router.push("/dashboard/invoices");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save invoice. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function exportInvoices() {
    const headers = [
      "Invoice",
      "Customer",
      "Customer email",
      "Issued",
      "Due",
      "Currency",
      "Total",
      "Balance",
      "Status",
    ];
    const csv = [
      headers,
      ...shownInvoices.map((invoice) => [
        invoice.invoiceNumber,
        invoice.customerName,
        invoice.customerEmail,
        invoice.issueDate,
        invoice.dueDate,
        invoice.currency,
        invoice.total.toFixed(2),
        invoice.status === "paid" || invoice.status === "cancelled"
          ? "0.00"
          : invoice.amountDue.toFixed(2),
        invoice.status,
      ]),
    ]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "darobooks-invoices.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  if (mode === "new") {
    return (
      <section aria-labelledby="new-invoice-heading">
        <form onSubmit={submitInvoice}>
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Back to invoices"
                onClick={() => router.push("/dashboard/invoices")}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dbe4f3] bg-white text-slate-600 hover:bg-slate-50"
              >
                <RiArrowLeftSLine className="h-4 w-4" />
              </button>
              <h1
                id="new-invoice-heading"
                className="font-jakarta text-[18px] font-bold tracking-[-0.3px] text-[#10213c]"
              >
                New invoice
              </h1>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                name="intent"
                value="draft"
                disabled={isSubmitting}
                className="h-8 rounded-lg border border-[#c7d3ec] bg-white px-3 text-[10px] font-bold text-[#10213c] hover:bg-slate-50 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <ActionSpinner label="Saving invoice" /> Saving…
                  </span>
                ) : (
                  "Add invoice"
                )}
              </button>
              <button
                type="submit"
                name="intent"
                value="send"
                disabled={isSubmitting}
                className="h-8 rounded-lg bg-[#1e4fc1] px-3 text-[10px] font-bold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <ActionSpinner label="Saving invoice" /> Saving…
                  </span>
                ) : (
                  "Send invoice"
                )}
              </button>
            </div>
          </header>
          {error && (
            <p
              role="alert"
              className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-800"
            >
              {error}
            </p>
          )}
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.75fr)]">
            <div className="space-y-3">
              <section className="rounded-xl border border-[#e1e8f4] bg-white p-4">
                <h2 className="mb-3 text-[11px] font-bold">
                  Customer and dates
                </h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-[9px] font-semibold text-slate-600 sm:col-span-1">
                    Customer
                    <input
                      required
                      minLength={2}
                      maxLength={160}
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      placeholder="Customer or company"
                      className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-2.5 text-[10px] font-normal outline-none focus:border-[#1e4fc1]"
                    />
                  </label>
                  <label className="text-[9px] font-semibold text-slate-600 sm:col-span-2">
                    Customer email
                    <input
                      required
                      type="email"
                      maxLength={254}
                      value={customerEmail}
                      onChange={(event) => setCustomerEmail(event.target.value)}
                      placeholder="name@example.com"
                      className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-2.5 text-[10px] font-normal outline-none focus:border-[#1e4fc1]"
                    />
                  </label>
                  <label className="text-[9px] font-semibold text-slate-600">
                    Issue date
                    <input
                      required
                      type="date"
                      value={issueDate}
                      onChange={(event) => setIssueDate(event.target.value)}
                      className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-2 text-[10px] font-normal"
                    />
                  </label>
                  <label className="text-[9px] font-semibold text-slate-600">
                    Due date
                    <input
                      required
                      type="date"
                      min={issueDate}
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-2 text-[10px] font-normal"
                    />
                  </label>
                  <label className="text-[9px] font-semibold text-slate-600">
                    Currency
                    <input
                      readOnly
                      value={`${currency} (set in Settings)`}
                      className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] bg-slate-50 px-2 text-[10px] font-normal"
                    />
                  </label>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-[9px] font-semibold text-slate-600">
                    Reference or PO number
                    <input
                      maxLength={120}
                      value={reference}
                      onChange={(event) => setReference(event.target.value)}
                      placeholder="Optional"
                      className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-2.5 text-[10px] font-normal"
                    />
                  </label>
                  <label className="text-[9px] font-semibold text-slate-600">
                    Customer PO number
                    <input
                      maxLength={120}
                      value={purchaseOrderNumber}
                      onChange={(event) =>
                        setPurchaseOrderNumber(event.target.value)
                      }
                      placeholder="Optional"
                      className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-2.5 text-[10px] font-normal"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-xl border border-[#e1e8f4] bg-white p-4">
                <h2 className="mb-3 text-[11px] font-bold">Billing options</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-[9px] font-semibold text-slate-600">
                    Billing plan
                    <select
                      value={billingPlan}
                      onChange={(event) =>
                        setBillingPlan(
                          event.target.value as "single" | "recurring",
                        )
                      }
                      className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] bg-white px-2 text-[10px] font-normal"
                    >
                      <option value="single">Single invoice</option>
                      <option value="recurring">Recurring invoice</option>
                    </select>
                  </label>
                  <label className="text-[9px] font-semibold text-slate-600">
                    Group discount
                    <select
                      value={groupDiscountPercent}
                      onChange={(event) =>
                        setGroupDiscountPercent(event.target.value)
                      }
                      className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] bg-white px-2 text-[10px] font-normal"
                    >
                      {[0, 5, 10, 15, 20].map((value) => (
                        <option key={value} value={value}>
                          {value === 0 ? "None" : `${value}%`}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="mt-2 text-[9px] text-slate-500">
                  Recurring billing is recorded on the invoice; automatic repeat
                  billing is not enabled yet.
                </p>
              </section>

              <section className="rounded-xl border border-[#e1e8f4] bg-white p-4">
                <h2 className="mb-3 text-[11px] font-bold">Items</h2>
                <label className="block text-[9px] font-semibold text-slate-600">
                  Add from saved items
                  <select
                    value={selectedStockItemId}
                    disabled={
                      isStockLoading || !stockItems.length || isSubmitting
                    }
                    onChange={(event) =>
                      addStockItemToInvoice(event.target.value)
                    }
                    className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] bg-white px-2.5 text-[10px] font-normal disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    <option value="">
                      {isStockLoading
                        ? "Loading saved items…"
                        : stockItems.length
                          ? "Choose a product or service"
                          : "No saved items available"}
                    </option>
                    {stockItems.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                        disabled={item.kind === "product" && item.onHand < 1}
                      >
                        {item.name} · {item.sku} ·{" "}
                        {formatMoney(item.price, currency)}
                        {item.kind === "product"
                          ? ` · ${item.onHand} in stock`
                          : " · Service"}
                        {item.kind === "product" && item.onHand < 1
                          ? " · Out of stock"
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
                {stockLoadError ? (
                  <p role="alert" className="mt-2 text-[9px] text-amber-800">
                    Saved items could not be loaded: {stockLoadError} You can
                    still enter invoice lines manually.
                  </p>
                ) : (
                  <p className="mt-2 text-[9px] text-slate-500">
                    Selecting an item fills its description and price. Invoice
                    lines are saved as a snapshot; stock is not reduced when an
                    invoice is created.
                  </p>
                )}
                <div className="space-y-2">
                  {lines.map((line, index) => {
                    const amount =
                      Number(line.quantity) > 0 && Number(line.rate) > 0
                        ? Number(line.quantity) * Number(line.rate)
                        : 0;
                    return (
                      <div
                        key={index}
                        className="grid grid-cols-[minmax(0,1fr)_64px_104px_auto] items-end gap-2"
                      >
                        <label className="min-w-0 text-[9px] font-semibold text-slate-600">
                          {index === 0 ? "Description" : `Item ${index + 1}`}
                          <input
                            required
                            maxLength={250}
                            value={line.description}
                            onChange={(event) =>
                              setLines((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        description: event.target.value,
                                      }
                                    : item,
                                ),
                              )
                            }
                            placeholder="Product or service"
                            className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-2 text-[10px] font-normal"
                          />
                        </label>
                        <label className="text-[9px] font-semibold text-slate-600">
                          {index === 0 ? (
                            "Qty"
                          ) : (
                            <span className="sr-only">Qty</span>
                          )}
                          <input
                            required
                            type="number"
                            min="1"
                            step="1"
                            value={line.quantity}
                            onChange={(event) =>
                              setLines((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, quantity: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-2 text-[10px] font-normal"
                          />
                        </label>
                        <label className="text-[9px] font-semibold text-slate-600">
                          {index === 0 ? (
                            `Rate (${currency})`
                          ) : (
                            <span className="sr-only">Rate</span>
                          )}
                          <input
                            required
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={line.rate}
                            onChange={(event) =>
                              setLines((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, rate: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-2 text-[10px] font-normal"
                          />
                        </label>
                        <div className="pb-2 text-right text-[9px] font-bold">
                          {formatMoney(amount, currency)}
                          {lines.length > 1 && (
                            <button
                              type="button"
                              aria-label={`Remove item ${index + 1}`}
                              onClick={() =>
                                setLines((current) =>
                                  current.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  ),
                                )
                              }
                              className="ml-2 text-red-600"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  disabled={lines.length >= 50}
                  onClick={() =>
                    setLines((current) => [
                      ...current,
                      { description: "", quantity: "1", rate: "" },
                    ])
                  }
                  className="mt-3 rounded-md border border-dashed border-[#c7d3ec] px-3 py-1.5 text-[9px] font-bold text-[#1e4fc1] hover:bg-blue-50 disabled:opacity-50"
                >
                  <RiAddLine className="mr-1 inline h-3.5 w-3.5" />
                  Add a line
                </button>
              </section>

              <label className="block rounded-xl border border-[#e1e8f4] bg-white p-4 text-[10px] font-bold">
                Note to customer
                <textarea
                  maxLength={2000}
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="mt-2 w-full rounded-md border border-[#dbe4f3] p-2 text-[10px] font-normal outline-none focus:border-[#1e4fc1]"
                />
              </label>
            </div>

            <aside className="space-y-3">
              <section className="rounded-xl border border-[#e1e8f4] bg-white p-4">
                <h2 className="text-[11px] font-bold">How it will look</h2>
                <div className="mt-3 rounded-lg border border-[#e1e8f4] p-3">
                  <div className="flex items-start justify-between gap-2 text-[9px]">
                    <strong className="text-[11px]">
                      {businessName || "Your business"}
                    </strong>
                    <span className="text-right text-slate-500">
                      INVOICE
                      <br />
                      Draft
                    </span>
                  </div>
                  <p className="mt-3 text-[10px] font-bold">
                    {customerName || "Customer"}
                  </p>
                  <p className="text-[9px] text-slate-500">
                    {customerEmail || "customer@email.com"}
                  </p>
                  <p className="mt-2 text-[9px] text-slate-500">
                    Due {dueDate ? formatDate(dueDate) : "—"} · {currency}
                  </p>
                </div>
                <p className="mt-2 text-[9px] leading-relaxed text-slate-500">
                  The invoice will be emailed to the customer address you
                  entered.
                </p>
              </section>
              <section className="rounded-xl border border-[#e1e8f4] bg-white p-4">
                <h2 className="mb-3 text-[11px] font-bold">Tax</h2>
                <TaxToggle
                  label={`Add VAT (${vatRate}%)`}
                  description="Charged on the discounted subtotal"
                  checked={vatEnabled}
                  onChange={setVatEnabled}
                />
                <TaxToggle
                  label={`Customer deducts WHT (${whtRate}%)`}
                  description="Recorded as a tax credit for you"
                  checked={whtEnabled}
                  onChange={setWhtEnabled}
                />
              </section>
              <section className="rounded-xl bg-[#1e4fc1] p-4 text-white">
                <h2 className="text-[11px] font-bold">Summary</h2>
                <SummaryRow
                  label="Subtotal"
                  value={formatMoney(totals.subtotal, currency)}
                />
                {Number(groupDiscountPercent) > 0 && (
                  <SummaryRow
                    label={`Discount (${groupDiscountPercent}%)`}
                    value={`−${formatMoney((totals.subtotal * Number(groupDiscountPercent)) / 100, currency)}`}
                  />
                )}
                {vatEnabled && (
                  <SummaryRow
                    label={`VAT ${vatRate}%`}
                    value={formatMoney(totals.vat, currency)}
                  />
                )}
                <div className="my-2 border-t border-white/20" />
                <SummaryRow
                  label="Invoice total"
                  value={formatMoney(totals.total, currency)}
                  strong
                />
                {whtEnabled && (
                  <SummaryRow
                    label={`WHT ${whtRate}% deducted`}
                    value={`−${formatMoney(totals.wht, currency)}`}
                  />
                )}
                <div className="mt-3 flex items-center justify-between gap-2 text-[9px] font-bold text-emerald-200">
                  <span>You will receive</span>
                  <span className="text-[16px] text-white">
                    {formatMoney(totals.due, currency)}
                  </span>
                </div>
              </section>
              <p className="rounded-xl border border-[#ccebe7] bg-[#e9f8f6] p-3 text-[9px] leading-relaxed text-[#176c69]">
                Email delivery uses the configured DaroBooks email provider.
                Payment links are not available for invoices yet.
              </p>
            </aside>
          </div>
        </form>
      </section>
    );
  }

  if (mode === "view") {
    const invoice = invoices.find((item) => item.id === initialInvoiceId);
    if (isLoading) {
      return (
        <section
          role="status"
          className="space-y-3 rounded-xl border border-[#e1e8f4] bg-white p-4"
        >
          <span className="sr-only">Loading invoice details…</span>
          <div className="dashboard-skeleton-block h-8 w-48 rounded-md" />
          <div className="dashboard-skeleton-block h-24 rounded-md" />
          <div className="dashboard-skeleton-block h-40 rounded-md" />
        </section>
      );
    }
    if (error || !invoice) {
      return (
        <section className="rounded-xl border border-[#e1e8f4] bg-white p-5">
          <button
            type="button"
            onClick={() => router.push("/dashboard/invoices")}
            className="mb-4 flex items-center gap-1 text-[10px] font-bold text-[#1e4fc1] hover:underline"
          >
            <RiArrowLeftSLine className="h-4 w-4" />
            Back to invoices
          </button>
          <p
            role={error ? "alert" : "status"}
            className="text-[11px] text-slate-600"
          >
            {error || "This invoice could not be found."}
          </p>
        </section>
      );
    }

    const displayStatus =
      invoice.status === "cancelled"
        ? "Cancelled"
        : invoice.status === "paid"
          ? "Paid"
          : invoice.status === "draft"
            ? "Draft"
            : invoice.status === "sending"
              ? "Sending"
              : invoice.dueDate < today
                ? "Overdue"
                : "Awaiting payment";
    return (
      <section aria-labelledby="invoice-details-heading">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Back to invoices"
              onClick={() => router.push("/dashboard/invoices")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dbe4f3] bg-white text-slate-600 hover:bg-slate-50"
            >
              <RiArrowLeftSLine className="h-4 w-4" />
            </button>
            <div>
              <h1
                id="invoice-details-heading"
                className="font-jakarta text-[18px] font-bold tracking-[-0.3px] text-[#10213c]"
              >
                {invoice.invoiceNumber}
              </h1>
              <p className="text-[9px] text-slate-500">Invoice details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <InvoiceStatus status={displayStatus} />
            <button
              type="button"
              onClick={() => void markInvoiceReadyForFiling(invoice)}
              disabled={
                filingInvoiceId === invoice.id ||
                invoice.status === "cancelled" ||
                filedInvoiceIds.has(invoice.id)
              }
              className="h-8 rounded-lg bg-[#087b74] px-3 text-[10px] font-bold text-white disabled:opacity-50"
            >
              {filingInvoiceId === invoice.id
                ? "Preparing..."
                : filedInvoiceIds.has(invoice.id)
                  ? "Ready for filing"
                  : "Mark ready for filing"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard/invoices")}
              className="h-8 rounded-lg border border-[#dbe4f3] bg-white px-3 text-[10px] font-bold text-[#10213c] hover:bg-slate-50"
            >
              Invoice list
            </button>
          </div>
        </header>
        {(error || message) && (
          <p role={error ? "alert" : "status"} className={`mb-3 rounded-lg border px-3 py-2 text-[10px] ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {error || message}
          </p>
        )}
        {filedInvoiceIds.has(invoice.id) && (
          <section className="mb-3 rounded-xl border border-[#ccebe7] bg-[#e9f8f6] p-3 text-[10px] text-[#176c69]">
            <p className="font-bold">
              {submittedInvoiceIds.has(invoice.id)
                ? "Submitted to tax authority"
                : "Ready for external filing"}
            </p>
            <p className="mt-1">
              Internal DaroBooks reference:{" "}
              {filingReferences[invoice.id] ?? `DARO-${invoice.id}`}
            </p>
            {submittedInvoiceIds.has(invoice.id) && (
              <p className="mt-1">
                Tax authority reference: {externalReferences[invoice.id]}
              </p>
            )}
          </section>
        )}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(250px,0.7fr)]">
          <div className="space-y-3">
            <section className="rounded-xl border border-[#e1e8f4] bg-white p-4">
              <h2 className="mb-3 text-[11px] font-bold">Customer</h2>
              <p className="text-[12px] font-semibold text-[#10213c]">
                {invoice.customerName}
              </p>
              <a
                href={`mailto:${invoice.customerEmail}`}
                className="mt-1 inline-block text-[10px] text-[#1e4fc1] hover:underline"
              >
                {invoice.customerEmail}
              </a>
            </section>

            <section className="rounded-xl border border-[#e1e8f4] bg-white p-4">
              <h2 className="mb-3 text-[11px] font-bold">
                Invoice information
              </h2>
              <dl className="grid gap-x-4 gap-y-3 text-[10px] sm:grid-cols-2">
                <InvoiceDetail
                  label="Invoice number"
                  value={invoice.invoiceNumber}
                />
                <InvoiceDetail
                  label="Billing plan"
                  value={
                    invoice.billingPlan === "recurring"
                      ? "Recurring"
                      : "Single invoice"
                  }
                />
                <InvoiceDetail
                  label="Issue date"
                  value={formatDate(invoice.issueDate)}
                />
                <InvoiceDetail
                  label="Due date"
                  value={formatDate(invoice.dueDate)}
                />
                <InvoiceDetail
                  label="Reference"
                  value={invoice.reference || "—"}
                />
                <InvoiceDetail
                  label="Purchase order"
                  value={invoice.purchaseOrderNumber || "—"}
                />
                <InvoiceDetail
                  label="Sent"
                  value={
                    invoice.sentAt ? formatDateTime(invoice.sentAt) : "Not sent"
                  }
                />
                <InvoiceDetail
                  label="Paid"
                  value={
                    invoice.paidAt ? formatDateTime(invoice.paidAt) : "Not paid"
                  }
                />
              </dl>
            </section>

            <section className="overflow-hidden rounded-xl border border-[#e1e8f4] bg-white">
              <h2 className="px-4 py-3 text-[11px] font-bold">Line items</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse text-left text-[9px]">
                  <thead className="bg-[#f7f9fc] text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Description</th>
                      <th className="px-3 py-2 text-right font-semibold">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-right font-semibold">
                        Rate
                      </th>
                      <th className="px-4 py-2 text-right font-semibold">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines.map((line, index) => (
                      <tr
                        key={`${line.description}-${index}`}
                        className="border-t border-[#edf1f7]"
                      >
                        <td className="px-4 py-2.5 font-medium text-[#10213c]">
                          {line.description}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {line.quantity}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {formatMoney(line.rate, invoice.currency)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold">
                          {formatMoney(line.amount, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <aside className="space-y-3">
            <section className="rounded-xl border border-[#cbd8ef] bg-white p-4">
              <h2 className="mb-2 text-[11px] font-bold">Filing workflow</h2>
              <p className="text-[9px] leading-relaxed text-slate-600">
                Review the customer and tax details, download the invoice record,
                then submit it through the applicable tax authority portal.
              </p>
              <button
                type="button"
                onClick={() => void downloadInvoice(invoice)}
                disabled={downloadingInvoice === invoice.id}
                className="mt-3 w-full rounded-md border border-[#cbd8ef] bg-white px-3 py-2 text-[9px] font-bold text-[#10213c] disabled:opacity-50"
              >
                {downloadingInvoice === invoice.id
                  ? "Preparing download..."
                  : "Download invoice record"}
              </button>
              {filedInvoiceIds.has(invoice.id) && !submittedInvoiceIds.has(invoice.id) && (
                <div className="mt-3 space-y-2 border-t border-[#edf1f7] pt-3">
                  <label className="block text-[9px] font-semibold text-[#10213c]">
                    Tax authority submission reference
                    <input
                      value={submissionReferenceDraft}
                      onChange={(event) =>
                        setSubmissionReferenceDraft(event.target.value)
                      }
                      placeholder="Enter reference after portal submission"
                      className="mt-1 h-8 w-full rounded-md border border-[#cbd8ef] px-2 text-[10px] outline-none focus:border-[#1e4fc1]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void recordExternalSubmission(invoice)}
                    disabled={filingInvoiceId === invoice.id || !submissionReferenceDraft.trim()}
                    className="w-full rounded-md bg-[#087b74] px-3 py-2 text-[9px] font-bold text-white disabled:opacity-50"
                  >
                    Record external submission
                  </button>
                </div>
              )}
              {submittedInvoiceIds.has(invoice.id) && (
                <button
                  type="button"
                  onClick={() => void updateStatus(invoice, "paid")}
                  disabled={invoice.status === "paid" || busyInvoice === invoice.id}
                  className="mt-3 w-full rounded-md bg-[#1e4fc1] px-3 py-2 text-[9px] font-bold text-white disabled:opacity-50"
                >
                  {invoice.status === "paid" ? "Payment recorded" : "Record payment received"}
                </button>
              )}
            </section>
            <section className="rounded-xl border border-[#e1e8f4] bg-white p-4">
              <h2 className="mb-3 text-[11px] font-bold">Amount summary</h2>
              <SummaryRow
                label="Subtotal"
                value={formatMoney(invoice.subtotal, invoice.currency)}
              />
              {invoice.groupDiscountPercent > 0 && (
                <SummaryRow
                  label={`Discount (${invoice.groupDiscountPercent}%)`}
                  value={`−${formatMoney(
                    invoice.subtotal * (invoice.groupDiscountPercent / 100),
                    invoice.currency,
                  )}`}
                />
              )}
              {invoice.vatEnabled && (
                <SummaryRow
                  label="VAT"
                  value={formatMoney(invoice.vatAmount, invoice.currency)}
                />
              )}
              {invoice.whtEnabled && (
                <SummaryRow
                  label="Withholding tax"
                  value={formatMoney(invoice.whtAmount, invoice.currency)}
                />
              )}
              <div className="mt-3 border-t border-[#edf1f7] pt-3">
                <SummaryRow
                  label="Invoice total"
                  value={formatMoney(invoice.total, invoice.currency)}
                  strong
                />
                <SummaryRow
                  label="Balance due"
                  value={formatMoney(
                    invoice.status === "paid" || invoice.status === "cancelled"
                      ? 0
                      : invoice.amountDue,
                    invoice.currency,
                  )}
                  strong
                />
              </div>
            </section>
            <section className="rounded-xl border border-[#e1e8f4] bg-white p-4">
              <h2 className="mb-2 text-[11px] font-bold">Note to customer</h2>
              <p className="whitespace-pre-wrap text-[10px] leading-relaxed text-slate-600">
                {invoice.note || "No note was added."}
              </p>
            </section>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="invoices-heading">
      {dialog}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1
          id="invoices-heading"
          className="font-jakarta text-[21px] font-bold tracking-[-0.35px] text-[#10213c]"
        >
          Invoices
        </h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportInvoices}
            disabled={!shownInvoices.length}
            className="flex h-8 items-center gap-1 rounded-lg border border-[#dbe4f3] bg-white px-3 text-[10px] font-bold hover:bg-slate-50 disabled:opacity-50"
          >
            <RiDownload2Line className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/invoices/new")}
            className="flex h-8 items-center gap-1 rounded-lg bg-[#1e4fc1] px-3 text-[10px] font-bold text-white hover:bg-blue-800"
          >
            <RiAddLine className="h-4 w-4" />
            New invoice
          </button>
        </div>
      </header>
      {(error || message) && (
        <p
          role={error ? "alert" : "status"}
          className={`mb-3 rounded-lg border px-3 py-2 text-[10px] ${
            error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error || message}
        </p>
      )}
      <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <InvoiceMetric
          label="Draft"
          amount={summary.draft}
          currency={currency}
          tone="slate"
        />
        <InvoiceMetric
          label="Awaiting payment"
          amount={summary.awaiting}
          currency={currency}
          tone="blue"
        />
        <InvoiceMetric
          label="Overdue"
          amount={summary.overdue}
          currency={currency}
          tone="red"
        />
        <InvoiceMetric
          label="Paid this month"
          amount={summary.paidThisMonth}
          currency={currency}
          tone="teal"
        />
      </div>
      <div className="overflow-hidden rounded-xl border border-[#e1e8f4] bg-white">
        <div className="flex flex-wrap gap-1 border-b border-[#e8edf5] px-3 py-2">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              aria-pressed={activeFilter === filter}
              onClick={() => setActiveFilter(filter)}
              className={`rounded-md px-2.5 py-1 text-[9px] font-bold ${
                activeFilter === filter
                  ? "bg-[#1e4fc1] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {filter} <span className="ml-1 opacity-75">{counts[filter]}</span>
            </button>
          ))}
        </div>
        {isLoading ? (
          <div role="status" className="space-y-3 p-4">
            <span className="sr-only">Loading invoices…</span>
            {[0, 1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="dashboard-skeleton-block h-9 rounded-md"
              />
            ))}
          </div>
        ) : shownInvoices.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead className="bg-[#f7f9fc] text-[9px] font-semibold text-slate-500">
                <tr>
                  {[
                    "Invoice",
                    "Customer",
                    "Issued",
                    "Due",
                    "Total",
                    "Balance",
                    "Status",
                    "",
                  ].map((heading) => (
                    <th key={heading} className="px-3 py-2.5">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shownInvoices.map((invoice) => {
                  const overdue =
                    invoice.status === "sent" && invoice.dueDate < today;
                  const displayStatus =
                    invoice.status === "cancelled"
                      ? "Cancelled"
                      : invoice.status === "paid"
                        ? "Paid"
                        : invoice.status === "draft"
                          ? "Draft"
                          : overdue
                            ? "Overdue"
                            : invoice.status === "sending"
                              ? "Sending"
                              : "Awaiting payment";
                  return (
                    <tr
                      key={invoice.id}
                      className="border-t border-[#edf1f7] text-[9px]"
                    >
                      <td className="px-3 py-2.5 font-bold text-[#1e4fc1]">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-[#10213c]">
                        <span className="block">{invoice.customerName}</span>
                        <span className="font-normal text-slate-500">
                          {invoice.customerEmail}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {formatDate(invoice.issueDate)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-3 py-2.5">
                        {formatMoney(invoice.total, invoice.currency)}
                      </td>
                      <td className="px-3 py-2.5 font-bold">
                        {invoice.status === "paid" ||
                        invoice.status === "cancelled"
                          ? formatMoney(0, invoice.currency)
                          : formatMoney(invoice.amountDue, invoice.currency)}
                      </td>
                      <td className="px-3 py-2.5">
                        <InvoiceStatus status={displayStatus} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-label={`Update invoice ${invoice.invoiceNumber}`}
                              title="Update invoice"
                              disabled={
                                busyInvoice !== "" ||
                                invoice.status === "cancelled" ||
                                invoice.status === "sending"
                              }
                              onClick={() => {
                                if (editingStatusId === invoice.id) {
                                  setEditingStatusId("");
                                  return;
                                }
                                setEditedStatus(
                                  invoice.status === "draft"
                                    ? "cancelled"
                                    : invoice.status === "paid"
                                      ? "paid"
                                      : "sent",
                                );
                                setEditingStatusId(invoice.id);
                              }}
                              className="dashboard-action-button"
                            >
                              <RiEditLine className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`View invoice ${invoice.invoiceNumber}`}
                              title="View invoice"
                              onClick={() =>
                                router.push(`/dashboard/invoices/${invoice.id}`)
                              }
                              className="dashboard-action-button"
                            >
                              <RiEyeLine className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Download invoice ${invoice.invoiceNumber}`}
                              title="Download invoice PDF"
                              disabled={
                                busyInvoice !== "" || downloadingInvoice !== ""
                              }
                              onClick={() => void downloadInvoice(invoice)}
                              className="dashboard-action-button"
                            >
                              {downloadingInvoice === invoice.id ? (
                                <ActionSpinner
                                  label={`Downloading ${invoice.invoiceNumber}`}
                                />
                              ) : (
                                <RiDownload2Line className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          {editingStatusId === invoice.id && (
                            <div className="flex flex-wrap items-center justify-end gap-1.5 rounded-lg border border-[#dbe4f3] bg-white p-2">
                              <select
                                aria-label={`Update status for ${invoice.invoiceNumber}`}
                                value={editedStatus}
                                onChange={(event) =>
                                  setEditedStatus(
                                    event.target.value as
                                      "sent" | "paid" | "cancelled",
                                  )
                                }
                                className="max-w-[130px] rounded border border-[#c7d3ec] bg-white px-1.5 py-1 text-[9px]"
                              >
                                {invoice.status === "draft" ? (
                                  <option value="cancelled">Cancelled</option>
                                ) : (
                                  <>
                                    <option value="sent">
                                      Awaiting payment
                                    </option>
                                    <option value="paid">Paid</option>
                                    {invoice.status === "sent" && (
                                      <option value="cancelled">
                                        Cancelled
                                      </option>
                                    )}
                                  </>
                                )}
                              </select>
                              {invoice.status === "draft" && (
                                <button
                                  type="button"
                                  disabled={busyInvoice !== ""}
                                  onClick={() =>
                                    void updateStatus(invoice, "send")
                                  }
                                  className="whitespace-nowrap rounded border border-[#c7d3ec] px-2 py-1 text-[9px] font-bold text-[#1e4fc1] hover:bg-blue-50 disabled:opacity-50"
                                >
                                  {busyInvoice === invoice.id ? (
                                    <span className="inline-flex items-center gap-1">
                                      <ActionSpinner
                                        label={`Sending ${invoice.invoiceNumber}`}
                                      />{" "}
                                      Sending…
                                    </span>
                                  ) : (
                                    "Send"
                                  )}
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={
                                  busyInvoice !== "" ||
                                  editedStatus === invoice.status
                                }
                                onClick={() =>
                                  void saveCorrectedStatus(invoice)
                                }
                                className="rounded bg-[#1e4fc1] px-2 py-1 text-[9px] font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                              >
                                {busyInvoice === invoice.id ? (
                                  <span className="inline-flex items-center gap-2">
                                    <ActionSpinner
                                      label={`Saving ${invoice.invoiceNumber}`}
                                    />{" "}
                                    Saving…
                                  </span>
                                ) : (
                                  "Save"
                                )}
                              </button>
                              <button
                                type="button"
                                aria-label={`Close update for ${invoice.invoiceNumber}`}
                                onClick={() => setEditingStatusId("")}
                                className="rounded px-1.5 py-1 text-[9px] font-semibold text-slate-500 hover:bg-slate-100"
                              >
                                Close
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-12 text-center">
            <h2 className="text-[12px] font-bold text-[#10213c]">
              {invoices.length
                ? "No invoices match this view"
                : "No invoices yet"}
            </h2>
            <p className="mt-1 text-[10px] text-slate-500">
              {invoices.length
                ? "Try another filter or search term."
                : "Create your first invoice and send it to your customer."}
            </p>
            {!invoices.length && (
              <button
                type="button"
                onClick={() => router.push("/dashboard/invoices/new")}
                className="mt-4 rounded-lg bg-[#1e4fc1] px-3 py-2 text-[10px] font-bold text-white hover:bg-blue-800"
              >
                New invoice
              </button>
            )}
          </div>
        )}
        {!isLoading && invoices.length > 0 && (
          <footer className="border-t border-[#edf1f7] px-3 py-2 text-[9px] text-slate-500">
            Showing {shownInvoices.length} of {invoices.length} invoices
          </footer>
        )}
      </div>
    </section>
  );
}

function TaxToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-2">
      <span>
        <span className="block text-[9px] font-bold">{label}</span>
        <span className="block text-[8px] text-slate-500">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#078b82]"
      />
    </label>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`mt-2 flex items-center justify-between gap-2 ${strong ? "text-[10px] font-bold" : "text-[9px] text-blue-100"}`}
    >
      <span>{label}</span>
      <span className={strong ? "" : "text-right"}>{value}</span>
    </div>
  );
}

function InvoiceMetric({
  label,
  amount,
  currency,
  tone,
}: {
  label: string;
  amount: number;
  currency: string;
  tone: "slate" | "blue" | "red" | "teal";
}) {
  const styles = {
    slate: "border-t-slate-400",
    blue: "border-t-[#1e4fc1]",
    red: "border-t-red-600",
    teal: "border-t-[#078b82]",
  };
  return (
    <article
      className={`rounded-xl border border-[#e1e8f4] border-t-2 ${styles[tone]} bg-white px-3 py-2.5`}
    >
      <p className="text-[9px] font-semibold text-slate-500">{label}</p>
      <p className="mt-0.5 font-jakarta text-[13px] font-bold text-[#10213c]">
        {formatMoney(amount, currency)}
      </p>
    </article>
  );
}

function InvoiceStatus({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Draft: "bg-slate-100 text-slate-700",
    Sending: "bg-blue-100 text-blue-800",
    "Awaiting payment": "bg-orange-100 text-orange-800",
    Overdue: "bg-red-100 text-red-800",
    Paid: "bg-emerald-100 text-emerald-800",
    Cancelled: "bg-slate-200 text-slate-700",
  };
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[8px] font-bold ${styles[status] ?? styles.Draft}`}
    >
      {status}
    </span>
  );
}

function InvoiceDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-[#10213c]">{value}</dd>
    </div>
  );
}

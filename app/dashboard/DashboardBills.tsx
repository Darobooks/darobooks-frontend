"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  RiAddLine,
  RiCheckLine,
  RiCloseLine,
  RiEyeLine,
  RiSendPlaneLine,
  RiUploadCloudLine,
} from "@remixicon/react";
import ActionSpinner from "../components/ActionSpinner";

type BillStatus =
  "Draft" | "Needs approval" | "Approved" | "Scheduled" | "Paid" | "Cancelled";
type Bill = {
  id: string;
  supplier: string;
  detail: string;
  number: string;
  date: string;
  amount: number;
  status: BillStatus;
  selected?: boolean;
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

const statusClass: Record<BillStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  "Needs approval": "bg-amber-100 text-amber-800",
  Approved: "bg-blue-100 text-[#1e4fc1]",
  Scheduled: "bg-violet-100 text-violet-700",
  Paid: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-red-100 text-red-700",
};

type ReceiptBillDraft = {
  supplier: string;
  number: string;
  date: string;
  amount: string;
  description: string;
};

const EMPTY_BILL_DRAFT: ReceiptBillDraft = {
  supplier: "",
  number: "",
  date: "",
  amount: "",
  description: "",
};

function normalizeReceiptDate(value: string): string {
  const cleaned = value.replace(/[^\dA-Za-z/-]/g, "");
  const iso = cleaned.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

  const dayFirst = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dayFirst) {
    const first = Number(dayFirst[1]);
    const second = Number(dayFirst[2]);
    const year = dayFirst[3];
    const day = first > 12 ? first : second;
    const month = first > 12 ? second : first;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const named = cleaned.match(/^(\d{1,2})[/-]?([A-Za-z]{3,9})[/-]?(\d{4})$/);
  if (named) {
    const date = new Date(`${named[2]} ${named[1]}, ${named[3]}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }
  }
  return "";
}

function parseReceiptText(text: string, suppliers: string[]): ReceiptBillDraft {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const normalized = lines.join("\n");

  const dateMatch =
    normalized.match(/\b(?:20\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]20\d{2}|\d{1,2}[/-]?[A-Za-z]{3,9}[/-]?20\d{2})\b/i);
  const numberMatch = normalized.match(
    /\b(?:invoice|receipt|bill|inv)[ .#:_-]*([A-Z0-9][A-Z0-9/-]{2,})\b/i,
  );
  const amounts = Array.from(
    normalized.matchAll(
      /\b(?:total|amount\s*(?:due|paid)?|balance|grand\s*total)?\s*(?:NGN|N|\$|£|€)?\s*(\d[\d,]*(?:\.\d{1,2})?)\b/gi,
    ),
  )
    .map((match) => Number(match[1].replace(/,/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0);

  const supplierMatch = suppliers.find((supplier) =>
    normalized.toLowerCase().includes(supplier.toLowerCase()),
  );
  const supplier =
    supplierMatch ??
    lines.find((line) =>
      /supplier|vendor|merchant|invoice|receipt/i.test(line),
    )?.replace(/^(supplier|vendor|merchant|invoice|receipt)\s*[:\-]\s*/i, "") ??
    "";

  return {
    supplier: supplier || "",
    number: numberMatch?.[1] ?? "",
    date: normalizeReceiptDate(dateMatch?.[0] ?? ""),
    amount: amounts.length ? String(Math.max(...amounts)) : "",
    description: "Receipt for " + (supplier || "supplier bill"),
  };
}

async function extractReceiptText(file: File): Promise<string> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    const document = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    }
    return pages.join("\n");
  }
  if (file.type.startsWith("image/")) {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    try {
      const result = await worker.recognize(file);
      return result.data.text;
    } finally {
      await worker.terminate();
    }
  }
  throw new Error("Upload an image or PDF receipt.");
}

export default function DashboardBills({
  search,
  currency,
  onNotice,
  initialBillId,
}: {
  search: string;
  currency: string;
  onNotice: (message: string) => void;
  initialBillId?: string;
}) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [showNewBill, setShowNewBill] = useState(false);
  const [receiptName, setReceiptName] = useState("");
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [customers, setCustomers] = useState<string[]>([]);
  const [detailBill, setDetailBill] = useState<Bill | null>(null);
  const [updatingBillId, setUpdatingBillId] = useState("");
  const [isCreatingBill, setIsCreatingBill] = useState(false);
  const [isSchedulingPayment, setIsSchedulingPayment] = useState(false);
  const [isReadingReceipt, setIsReadingReceipt] = useState(false);
  const [billDraft, setBillDraft] = useState<ReceiptBillDraft>(EMPTY_BILL_DRAFT);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const openNewBill = () => {
    setBillDraft({ ...EMPTY_BILL_DRAFT });
    setReceiptName("");
    setShowNewBill(true);
  };

  const handleReceipt = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      onNotice("Choose an image or PDF receipt.");
      event.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onNotice("The receipt must be smaller than 10 MB.");
      event.target.value = "";
      return;
    }
    setReceiptName(file.name);
    setBillDraft({ ...EMPTY_BILL_DRAFT });
    setShowNewBill(true);
    setIsReadingReceipt(true);
    try {
      const text = await extractReceiptText(file);
      const parsed = parseReceiptText(text, suppliers);
      setBillDraft(parsed);
      onNotice(
        text.trim()
          ? "Receipt values extracted. Review or edit them before saving."
          : "No readable text was found. Enter the bill details manually.",
      );
    } catch (error) {
      onNotice(
        error instanceof Error
          ? error.message
          : "Could not read this receipt. Enter the values manually.",
      );
    } finally {
      setIsReadingReceipt(false);
      event.target.value = "";
    }
  };

  useEffect(() => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;

    void fetch(API_BASE_URL + "/dashboard/contacts", {
      headers: { Authorization: "Bearer " + token },
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload?.message ?? "Could not load suppliers.");
        if (!Array.isArray(payload.contacts)) return;
        const supplierNames = payload.contacts
          .filter(
            (contact: { kind?: unknown; name?: unknown }) =>
              contact.kind === "supplier" && typeof contact.name === "string",
          )
          .map((contact: { name: string }) => contact.name.trim())
          .filter(Boolean);
        const customerNames = payload.contacts
          .filter(
            (contact: { kind?: unknown; name?: unknown }) =>
              contact.kind === "customer" && typeof contact.name === "string",
          )
          .map((contact: { name: string }) => contact.name.trim())
          .filter(Boolean);
        setSuppliers(Array.from(new Set<string>(supplierNames)));
        setCustomers(Array.from(new Set<string>(customerNames)));
      })
      .catch((error) =>
        onNotice(
          error instanceof Error ? error.message : "Could not load suppliers.",
        ),
      );

    void fetch(API_BASE_URL + "/dashboard/bills", {
      headers: { Authorization: "Bearer " + token },
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload?.message ?? "Could not load bills.");
        if (!Array.isArray(payload.bills)) return;
        const labels: Record<string, BillStatus> = {
          draft: "Draft",
          needs_approval: "Needs approval",
          approved: "Approved",
          scheduled: "Scheduled",
          paid: "Paid",
          cancelled: "Cancelled",
        };
        setBills(
          payload.bills.map(
            (bill: {
              id: string;
              supplier: string;
              description: string;
              number: string;
              date: string;
              amount: number;
              status: keyof typeof labels;
            }) => ({
              id: bill.id,
              supplier: bill.supplier,
              detail: bill.description,
              number: bill.number,
              date: bill.date,
              amount: bill.amount,
              status: labels[bill.status] ?? "Draft",
            }),
          ),
        );
      })
      .catch((error) =>
        onNotice(
          error instanceof Error ? error.message : "Could not load bills.",
        ),
      );
  }, [onNotice]);

  useEffect(() => {
    if (!initialBillId) return;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    void fetch(`${API_BASE_URL}/dashboard/bills/${initialBillId}`, {
      headers: { Authorization: "Bearer " + token },
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload?.message ?? "Could not load this bill.");
        const bill = payload.bill;
        const labels: Record<string, BillStatus> = {
          draft: "Draft",
          needs_approval: "Needs approval",
          approved: "Approved",
          scheduled: "Scheduled",
          paid: "Paid",
          cancelled: "Cancelled",
        };
        setDetailBill({
          id: String(bill.id),
          supplier: bill.supplier,
          detail: bill.description ?? "",
          number: bill.number,
          date: bill.date,
          amount: Number(bill.amount),
          status: labels[bill.status] ?? "Draft",
        });
      })
      .catch((error) =>
        onNotice(
          error instanceof Error ? error.message : "Could not load this bill.",
        ),
      );
  }, [initialBillId, onNotice]);

  const filteredBills = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return bills;
    return bills.filter((bill) =>
      `${bill.supplier} ${bill.detail} ${bill.number} ${bill.status}`
        .toLowerCase()
        .includes(term),
    );
  }, [bills, search]);

  const toggleBill = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };
  const money = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,      currencyDisplay: "code",      maximumFractionDigits: 0,
    }).format(amount);
  const paymentBills = bills.filter(
    (bill) => selected.includes(bill.id) && bill.status !== "Paid",
  );
  const paymentTotal = paymentBills.reduce((sum, bill) => sum + bill.amount, 0);

  const schedulePayment = async () => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || !selected.length || isSchedulingPayment) return;
    setIsSchedulingPayment(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/bills/schedule`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ billIds: selected }),
      });
      if (!response.ok) {
        onNotice("Could not schedule the payment run.");
        return;
      }
      setBills((current) =>
        current.map((bill) =>
          selected.includes(bill.id) ? { ...bill, status: "Scheduled" } : bill,
        ),
      );
      setSelected([]);
      onNotice("Payment run scheduled.");
    } catch {
      onNotice(
        "Could not schedule the payment run. Check your connection and try again.",
      );
    } finally {
      setIsSchedulingPayment(false);
    }
  };

  const changeStatus = async (
    id: string,
    status: "needs_approval" | "approved" | "scheduled" | "paid" | "cancelled",
  ) => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    setUpdatingBillId(id);
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/bills/${id}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        onNotice(payload?.message ?? "Could not update the bill.");
        return;
      }
      const statusLabels: Record<typeof status, BillStatus> = {
        needs_approval: "Needs approval",
        approved: "Approved",
        scheduled: "Scheduled",
        paid: "Paid",
        cancelled: "Cancelled",
      };
      setBills((current) =>
        current.map((bill) =>
          bill.id === id ? { ...bill, status: statusLabels[status] } : bill,
        ),
      );
      setDetailBill((current) =>
        current?.id === id
          ? { ...current, status: statusLabels[status] }
          : current,
      );
      onNotice(
        status === "cancelled" ? "Bill cancelled." : "Bill status updated.",
      );
    } catch {
      onNotice(
        "Could not update the bill. Check your connection and try again.",
      );
    } finally {
      setUpdatingBillId("");
    }
  };

  const createBill = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    const form = new FormData(event.currentTarget);
    if (!token || isCreatingBill) return;
    setIsCreatingBill(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/bills`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplier: form.get("supplier"),
          number: form.get("number"),
          date: form.get("date"),
          amount: Number(form.get("amount")),
          description: form.get("description"),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        onNotice(payload?.message ?? "Could not create the bill.");
        return;
      }
      setBills((current) => [
        {
          id: payload.bill.id,
          supplier: payload.bill.supplier,
          detail: payload.bill.description,
          number: payload.bill.number,
          date: payload.bill.date,
          amount: payload.bill.amount,
          status: "Draft",
        },
        ...current,
      ]);
      setShowNewBill(false);
      onNotice("New bill created as a draft.");
    } catch {
      onNotice(
        "Could not create the bill. Check your connection and try again.",
      );
    } finally {
      setIsCreatingBill(false);
    }
  };

  const metric = (label: string, value: string, count: string) => (
    <div
      key={label}
      className="min-w-0 flex-1 border-r border-[#edf1f7] px-3 py-2 last:border-r-0"
    >
      <p className="text-[8px] font-semibold text-slate-500">{label}</p>
      <p className="mt-1 truncate text-[12px] font-bold text-[#10213c] sm:text-[14px]">
        {value}
      </p>
      <p className="mt-1 text-[8px] text-slate-400">{count}</p>
    </div>
  );

  if (initialBillId) {
    return detailBill ? (
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/bills"
          className="text-[10px] font-bold text-[#1e4fc1]"
        >
          ← Back to bills
        </Link>
        <section className="mt-3 rounded-xl border border-[#e1e8f4] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-semibold text-slate-500">
                Bill {detailBill.number}
              </p>
              <h1 className="mt-1 text-xl font-bold text-[#10213c]">
                {detailBill.supplier}
              </h1>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[9px] font-bold ${statusClass[detailBill.status]}`}
            >
              {detailBill.status}
            </span>
          </div>
          <dl className="mt-6 grid gap-4 border-y border-[#edf1f7] py-5 sm:grid-cols-2">
            <div>
              <dt className="text-[9px] text-slate-500">Bill date</dt>
              <dd className="mt-1 text-[11px] font-bold">{detailBill.date}</dd>
            </div>
            <div>
              <dt className="text-[9px] text-slate-500">Amount</dt>
              <dd className="mt-1 text-[16px] font-bold text-[#10213c]">
                {money(detailBill.amount)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[9px] text-slate-500">Description</dt>
              <dd className="mt-1 text-[11px]">
                {detailBill.detail || "No description"}
              </dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            {detailBill.status === "Draft" && (
              <button
                type="button"
                disabled={updatingBillId !== ""}
                onClick={() =>
                  void changeStatus(detailBill.id, "needs_approval")
                }
                className="inline-flex h-8 items-center gap-2 rounded-lg bg-[#1e4fc1] px-3 text-[10px] font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {updatingBillId === detailBill.id ? (
                  <ActionSpinner label="Updating bill" />
                ) : null}
                Submit for approval
              </button>
            )}
            {detailBill.status === "Needs approval" && (
              <button
                type="button"
                disabled={updatingBillId !== ""}
                onClick={() => void changeStatus(detailBill.id, "approved")}
                className="inline-flex h-8 items-center gap-2 rounded-lg bg-[#1e4fc1] px-3 text-[10px] font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {updatingBillId === detailBill.id ? (
                  <ActionSpinner label="Updating bill" />
                ) : null}
                Approve
              </button>
            )}
            {detailBill.status === "Approved" && (
              <button
                type="button"
                disabled={updatingBillId !== ""}
                onClick={() => void changeStatus(detailBill.id, "scheduled")}
                className="inline-flex h-8 items-center gap-2 rounded-lg bg-[#1e4fc1] px-3 text-[10px] font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {updatingBillId === detailBill.id ? (
                  <ActionSpinner label="Updating bill" />
                ) : null}
                Schedule
              </button>
            )}
            {detailBill.status === "Scheduled" && (
              <button
                type="button"
                disabled={updatingBillId !== ""}
                onClick={() => void changeStatus(detailBill.id, "paid")}
                className="inline-flex h-8 items-center gap-2 rounded-lg bg-[#1e4fc1] px-3 text-[10px] font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {updatingBillId === detailBill.id ? (
                  <ActionSpinner label="Updating bill" />
                ) : null}
                Mark paid
              </button>
            )}
            {!(["Paid", "Cancelled"] as BillStatus[]).includes(
              detailBill.status,
            ) && (
              <button
                type="button"
                disabled={updatingBillId !== ""}
                className="inline-flex h-8 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-[10px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                onClick={() => void changeStatus(detailBill.id, "cancelled")}
              >
                {updatingBillId === detailBill.id ? (
                  <ActionSpinner label="Updating bill" />
                ) : null}
                Cancel bill
              </button>
            )}
          </div>
        </section>
      </div>
    ) : (
      <p className="py-16 text-center text-[10px] text-slate-500">
        Loading bill details…
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-[18px] font-bold tracking-tight sm:text-[22px]">
          Bills and expenses
        </h1>
        <div className="flex shrink-0 gap-2">
          <input
            ref={receiptInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={(event) => void handleReceipt(event)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => receiptInputRef.current?.click()}
            className="hidden h-8 items-center gap-1 rounded-md border border-[#dbe4f3] bg-white px-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50 sm:flex"
          >
            <RiUploadCloudLine className="h-3.5 w-3.5" /> Upload receipt
          </button>
          <button
            type="button"
            onClick={openNewBill}
            className="flex h-8 items-center gap-1 rounded-md bg-[#1e4fc1] px-3 text-[10px] font-bold text-white hover:bg-blue-800"
          >
            <RiAddLine className="h-3.5 w-3.5" /> New bill
          </button>
        </div>
      </div>

      <section className="mb-4 flex overflow-x-auto rounded-lg border border-[#e1e8f4] bg-white shadow-[0_1px_2px_rgba(15,23,42,.02)]">
        {(
          [
            "Draft",
            "Needs approval",
            "Approved",
            "Scheduled",
            "Paid",
          ] as BillStatus[]
        ).map((status) => {
          const matchingBills = bills.filter((bill) => bill.status === status);
          const total = matchingBills.reduce(
            (sum, bill) => sum + bill.amount,
            0,
          );
          return metric(
            status,
            money(total),
            `${matchingBills.length} bill${matchingBills.length === 1 ? "" : "s"}`,
          );
        })}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_230px] xl:grid-cols-[minmax(0,1fr)_260px]">
        <section className="min-w-0 overflow-hidden rounded-lg border border-[#e1e8f4] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#edf1f7] text-[8px] text-slate-500">
                  <th className="w-8 px-3 py-2.5" />
                  <th className="px-2 py-2.5 font-medium">Supplier</th>
                  <th className="px-2 py-2.5 font-medium">Bill</th>
                  <th className="px-2 py-2.5 font-medium">Date</th>
                  <th className="px-2 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-2 py-2.5 font-medium">Status</th>
                  <th className="px-2 py-2.5 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill) => (
                  <tr
                    key={bill.id}
                    className="border-b border-[#edf1f7] text-[9px] last:border-b-0 hover:bg-slate-50/70"
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(bill.id)}
                        disabled={bill.status === "Paid"}
                        onChange={() => toggleBill(bill.id)}
                        className="h-3 w-3 accent-[#1e4fc1]"
                        aria-label={`Select bill from ${bill.supplier}`}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <p className="font-bold text-[#10213c]">
                        {bill.supplier}
                      </p>
                      <p className="mt-0.5 text-[8px] text-slate-500">
                        {bill.detail}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-slate-600">
                      {bill.number}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-slate-600">
                      {bill.date}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-right font-bold">
                      {money(bill.amount)}
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-[8px] font-semibold ${statusClass[bill.status]}`}
                      >
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/dashboard/bills/${bill.id}`}
                          aria-label={`View bill ${bill.number}`}
                          title="View bill"
                          className="dashboard-action-button"
                        >
                          <RiEyeLine className="h-4 w-4" />
                        </Link>
                        {bill.status === "Draft" && (
                          <button
                            type="button"
                            disabled={updatingBillId !== ""}
                            onClick={() =>
                              void changeStatus(bill.id, "needs_approval")
                            }
                            aria-label="Submit for approval"
                            title="Submit for approval"
                            className="dashboard-action-button"
                          >
                            {updatingBillId === bill.id ? (
                              <ActionSpinner label="Updating bill" />
                            ) : (
                              <RiSendPlaneLine className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {bill.status === "Needs approval" && (
                          <button
                            type="button"
                            disabled={updatingBillId !== ""}
                            onClick={() =>
                              void changeStatus(bill.id, "approved")
                            }
                            aria-label="Approve bill"
                            title="Approve"
                            className="dashboard-action-button"
                          >
                            {updatingBillId === bill.id ? (
                              <ActionSpinner label="Updating bill" />
                            ) : (
                              <RiCheckLine className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {bill.status === "Approved" && (
                          <button
                            type="button"
                            disabled={updatingBillId !== ""}
                            onClick={() =>
                              void changeStatus(bill.id, "scheduled")
                            }
                            aria-label="Schedule payment"
                            title="Schedule payment"
                            className="dashboard-action-button"
                          >
                            {updatingBillId === bill.id ? (
                              <ActionSpinner label="Updating bill" />
                            ) : (
                              <RiUploadCloudLine className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {bill.status === "Scheduled" && (
                          <button
                            type="button"
                            disabled={updatingBillId !== ""}
                            onClick={() => void changeStatus(bill.id, "paid")}
                            aria-label="Mark bill paid"
                            title="Mark paid"
                            className="dashboard-action-button"
                          >
                            {updatingBillId === bill.id ? (
                              <ActionSpinner label="Updating bill" />
                            ) : (
                              <RiCheckLine className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {!(["Paid", "Cancelled"] as BillStatus[]).includes(
                          bill.status,
                        ) && (
                          <button
                            type="button"
                            disabled={updatingBillId !== ""}
                            onClick={() =>
                              void changeStatus(bill.id, "cancelled")
                            }
                            aria-label="Cancel bill"
                            title="Cancel"
                            className="dashboard-action-button dashboard-action-button-danger"
                          >
                            {updatingBillId === bill.id ? (
                              <ActionSpinner label="Updating bill" />
                            ) : (
                              <RiCloseLine className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredBills.length === 0 && (
              <p className="py-10 text-center text-[10px] text-slate-500">
                No bills match your search.
              </p>
            )}
          </div>
        </section>

        <aside className="space-y-3">
          <section className="rounded-lg border border-[#e1e8f4] bg-white p-3">
            <h2 className="text-[10px] font-bold">Payment run Â· Friday</h2>
            <div className="mt-3 space-y-3">
              {paymentBills.length ? (
                paymentBills.map((bill) => (
                  <label
                    key={bill.id}
                    className="flex items-start gap-2 text-[9px]"
                  >
                    <input
                      type="checkbox"
                      checked
                      readOnly
                      className="mt-0.5 h-3 w-3 accent-[#1e4fc1]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">
                        {bill.supplier}
                      </span>
                    </span>
                    <span className="font-bold">{money(bill.amount)}</span>
                  </label>
                ))
              ) : (
                <p className="text-[9px] leading-4 text-slate-500">
                  Select bills from the list to add them to this payment run.
                </p>
              )}
            </div>
            <div className="mt-4 flex justify-between border-t border-[#edf1f7] pt-3 text-[10px] font-bold">
              <span>Total to pay</span>
              <span>{money(paymentTotal)}</span>
            </div>
            <button
              type="button"
              disabled={!paymentBills.length || isSchedulingPayment}
              onClick={() => void schedulePayment()}
              className="mt-4 inline-flex h-8 w-full items-center justify-center gap-2 rounded-md bg-[#1e4fc1] text-[9px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSchedulingPayment ? (
                <>
                  <ActionSpinner label="Scheduling payment run" /> Scheduling…
                </>
              ) : (
                "Schedule payment"
              )}
            </button>
          </section>
          <label className="flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-[#ccd7e8] bg-white px-4 py-10 text-center hover:border-[#1e4fc1]">
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(event) => void handleReceipt(event)}
            />
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dce4f1] text-slate-500">
              <RiUploadCloudLine className="h-5 w-5" />
            </span>
            <span className="mt-3 text-[10px] font-bold">
              {receiptName || "Snap or drop a receipt"}
            </span>
            <span className="mt-1 max-w-[180px] text-[8px] leading-4 text-slate-500">
              {receiptName
                ? "Receipt selected and ready to attach."
                : "We read the supplier, date and amount for you to confirm."}
            </span>
          </label>
        </aside>
      </div>

      {showNewBill && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/30 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="New bill"
        >
          <form
            className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl"
            onSubmit={(event) => void createBill(event)}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-bold">New bill</h2>
              <button
                type="button"
                onClick={() => setShowNewBill(false)}
                aria-label="Close"
              >
                <RiCloseLine className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-[9px] font-semibold text-slate-600">
                Supplier / Customer
                <input
                  name="supplier"
                  required
                  list="bill-suppliers"
                  value={billDraft.supplier}
                  onChange={(event) =>
                    setBillDraft((current) => ({
                      ...current,
                      supplier: event.target.value,
                    }))
                  }
                  placeholder="Supplier or customer name"
                  className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] bg-white px-3 text-[10px] outline-none"
                />
                <datalist id="bill-suppliers">
                  {[...suppliers, ...customers].map((contact) => (
                    <option key={contact} value={contact} />
                  ))}
                </datalist>
                {suppliers.length === 0 && customers.length === 0 && (
                  <span className="mt-1 block text-[8px] font-normal text-slate-500">
                    Add suppliers or customers in Contacts first.
                  </span>
                )}
              </label>
              <label className="text-[9px] font-semibold text-slate-600">
                Bill number
                <input
                  name="number"
                  required
                  value={billDraft.number}
                  onChange={(event) =>
                    setBillDraft((current) => ({
                      ...current,
                      number: event.target.value,
                    }))
                  }
                  className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-3 text-[10px] outline-none"
                />
              </label>
              <label className="text-[9px] font-semibold text-slate-600">
                Bill date
                <input
                  name="date"
                  required
                  type="date"
                  value={billDraft.date}
                  onChange={(event) =>
                    setBillDraft((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-3 text-[10px] outline-none"
                />
              </label>
              <label className="text-[9px] font-semibold text-slate-600">
                Amount
                <input
                  name="amount"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={billDraft.amount}
                  onChange={(event) =>
                    setBillDraft((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-3 text-[10px] outline-none"
                />
              </label>
              {isReadingReceipt ? (
                <p className="sm:col-span-2 rounded-md bg-blue-50 px-3 py-2 text-[9px] font-semibold text-[#1e4fc1]">
                  Reading receipt values… You can edit the form when extraction finishes.
                </p>
              ) : receiptName ? (
                <p className="sm:col-span-2 text-[8px] text-slate-500">
                  Extracted from {receiptName}. Check all values before saving.
                </p>
              ) : null}
              <label className="text-[9px] font-semibold text-slate-600 sm:col-span-2">
                Description
                <input
                  name="description"
                  value={billDraft.description}
                  onChange={(event) =>
                    setBillDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="What was this bill for?"
                  className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-3 text-[10px] outline-none"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={isCreatingBill}
                onClick={() => setShowNewBill(false)}
                className="h-9 rounded-md border border-[#dbe4f3] px-4 text-[10px] font-bold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingBill}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-[#1e4fc1] px-4 text-[10px] font-bold text-white disabled:opacity-50"
              >
                {isCreatingBill ? (
                  <>
                    <ActionSpinner label="Creating bill" /> Saving…
                  </>
                ) : (
                  "Save bill"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

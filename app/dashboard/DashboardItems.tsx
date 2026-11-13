"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  RiAddLine,
  RiDeleteBinLine,
  RiDownload2Line,
  RiEditLine,
  RiEyeLine,
  RiCloseLine,
} from "@remixicon/react";
import { useToastOnChange } from "@/app/components/toast";
import ActionSpinner from "../components/ActionSpinner";
import { useConfirmDialog } from "@/app/components/ConfirmDialog";

type ItemStatus = "In stock" | "Low stock" | "Out of stock" | "Service";
type ItemFilter = "All items" | "Low stock" | "Out of stock";
type ItemKind = "product" | "service";

type StockItem = {
  id: string;
  name: string;
  sku: string;
  price: number;
  taxable: boolean;
  vatEnabled: boolean;
  whtEnabled: boolean;
  onHand: number;
  reorderPoint: number;
  kind: ItemKind;
};

type ItemForm = {
  name: string;
  sku: string;
  price: string;
  taxable: boolean;
  vatEnabled: boolean;
  whtEnabled: boolean;
  onHand: string;
  reorderPoint: string;
  kind: ItemKind;
};
type Supplier = { id: string; name: string; email?: string };
type PurchaseOrderLine = {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
};
type PurchaseOrder = {
  id: string;
  orderNumber: string;
  supplierName: string;
  currency: string;
  status: "open" | "received" | "cancelled";
  total: number;
  createdAt: string;
  lines: PurchaseOrderLine[];
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

const filterOptions: ItemFilter[] = ["All items", "Low stock", "Out of stock"];
const emptyForm: ItemForm = {
  name: "",
  sku: "",
  price: "",
  taxable: true,
  vatEnabled: true,
  whtEnabled: true,
  onHand: "0",
  reorderPoint: "0",
  kind: "product",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isStockItem(value: unknown): value is StockItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.sku === "string" &&
    (value.kind === "product" || value.kind === "service") &&
    typeof value.price === "number" &&
    Number.isFinite(value.price) &&
    typeof value.taxable === "boolean" &&
    typeof value.onHand === "number" &&
    Number.isInteger(value.onHand) &&
    typeof value.reorderPoint === "number" &&
    Number.isInteger(value.reorderPoint)
  );
}

function isSupplier(value: unknown): value is Supplier {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string"
  );
}

function isPurchaseOrder(value: unknown): value is PurchaseOrder {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.orderNumber === "string" &&
    typeof value.supplierName === "string" &&
    typeof value.currency === "string" &&
    (value.status === "open" ||
      value.status === "received" ||
      value.status === "cancelled") &&
    typeof value.total === "number" &&
    Number.isFinite(value.total) &&
    typeof value.createdAt === "string" &&
    Array.isArray(value.lines) &&
    value.lines.every(
      (line) =>
        isRecord(line) &&
        typeof line.id === "string" &&
        typeof line.itemId === "string" &&
        typeof line.itemName === "string" &&
        typeof line.sku === "string" &&
        typeof line.quantityOrdered === "number" &&
        typeof line.quantityReceived === "number" &&
        typeof line.unitCost === "number",
    )
  );
}

function getApiError(payload: unknown, fallback: string) {
  if (isRecord(payload) && typeof payload.message === "string") {
    return payload.message;
  }
  return fallback;
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "code",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

function itemStatus(item: StockItem): ItemStatus {
  if (item.kind === "service") return "Service";
  if (item.onHand === 0) return "Out of stock";
  if (item.onHand <= item.reorderPoint) return "Low stock";
  return "In stock";
}

export default function DashboardItems({
  search = "",
  currency = "USD",
  onNotice,
  initialItemId,
}: {
  search?: string;
  currency?: string;
  onNotice: (message: string) => void;
  initialItemId?: string;
}) {
  const { confirm, dialog } = useConfirmDialog();
  const [items, setItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyItemId, setBusyItemId] = useState("");
  const [activeFilter, setActiveFilter] = useState<ItemFilter>("All items");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});
  const [isPurchaseOrderOpen, setIsPurchaseOrderOpen] = useState(false);
  const [isSavingPurchaseOrder, setIsSavingPurchaseOrder] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [selectedOrderItems, setSelectedOrderItems] = useState<
    Record<string, boolean>
  >({});
  const [orderQuantities, setOrderQuantities] = useState<
    Record<string, string>
  >({});
  const [orderCosts, setOrderCosts] = useState<Record<string, string>>({});
  const [receivingOrderId, setReceivingOrderId] = useState("");
  const importFileRef = useRef<HTMLInputElement>(null);
  useToastOnChange(error);

  const loadItems = useCallback(async (): Promise<boolean> => {
    try {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) throw new Error("Sign in again to manage items and stock.");
      const response = await fetch(`${API_BASE_URL}/dashboard/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getApiError(payload, "Could not load items."));
      }
      if (
        !isRecord(payload) ||
        !Array.isArray(payload.items) ||
        !payload.items.every(isStockItem)
      ) {
        throw new Error("The inventory service returned invalid item data.");
      }
      setItems(payload.items);
      setError("");
      return true;
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load items. Please try again.",
      );
      setItems([]);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPurchaseOrders = useCallback(async () => {
    try {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) throw new Error("Sign in again to view purchase orders.");
      const response = await fetch(
        `${API_BASE_URL}/dashboard/purchase-orders`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiError(payload, "Could not load purchase orders."),
        );
      }
      if (
        !isRecord(payload) ||
        !Array.isArray(payload.purchaseOrders) ||
        !payload.purchaseOrders.every(isPurchaseOrder)
      ) {
        throw new Error("The purchase order service returned invalid data.");
      }
      setPurchaseOrders(payload.purchaseOrders);
      return true;
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load purchase orders. Please try again.",
      );
      return false;
    }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/dashboard/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload: unknown = await response.json();
      if (!response.ok) return;
      if (
        !isRecord(payload) ||
        !Array.isArray(payload.contacts) ||
        !payload.contacts.every(isRecord)
      ) {
        return;
      }
      const nextSuppliers = payload.contacts
        .filter((contact) => contact.kind === "supplier")
        .map((contact) => ({
          id: String(contact.id),
          name: String(contact.name),
          email:
            typeof contact.email === "string" && contact.email.trim()
              ? contact.email.trim()
              : undefined,
        }))
        .filter((supplier) => supplier.name);
      setSuppliers(nextSuppliers);
    } catch {
      setSuppliers([]);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadItems();
      void loadPurchaseOrders();
      void loadSuppliers();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadItems, loadPurchaseOrders, loadSuppliers]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const status = itemStatus(item);
      const matchesFilter =
        activeFilter === "All items" ||
        (activeFilter === "Low stock" && status === "Low stock") ||
        (activeFilter === "Out of stock" && status === "Out of stock");
      const matchesSearch =
        !query ||
        `${item.name} ${item.sku} ${status}`.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, items, search]);

  const itemRecordsById = useMemo(() => {
    const records = new Map<
      string,
      Array<{
        id: string;
        supplierName: string;
        supplierEmail?: string;
        orderNumber: string;
        orderStatus: "open" | "received" | "cancelled";
        createdAt: string;
        quantity: number;
        unitCost: number;
        currency: string;
      }>
    >();

    for (const order of purchaseOrders) {
      const supplierEmail = suppliers.find(
        (supplier) =>
          supplier.name.trim().toLowerCase() ===
          order.supplierName.trim().toLowerCase(),
      )?.email;

      for (const line of order.lines) {
        const existing = records.get(line.itemId) ?? [];
        existing.push({
          id: line.id,
          supplierName: order.supplierName,
          supplierEmail,
          orderNumber: order.orderNumber,
          orderStatus: order.status,
          createdAt: order.createdAt,
          quantity: line.quantityOrdered,
          unitCost: line.unitCost,
          currency: order.currency,
        });
        records.set(line.itemId, existing);
      }
    }

    return records;
  }, [purchaseOrders, suppliers]);

  const products = items.filter((item) => item.kind === "product");
  const lowStockCount = products.filter(
    (item) => itemStatus(item) === "Low stock",
  ).length;
  const outOfStockCount = products.filter(
    (item) => itemStatus(item) === "Out of stock",
  ).length;
  const stockValue = products.reduce(
    (total, item) => total + item.price * item.onHand,
    0,
  );
  const suggestedItems = products.filter(
    (item) => item.onHand <= item.reorderPoint,
  );

  const openCreateForm = () => {
    setError("");
    setEditingItemId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEditForm = (item: StockItem) => {
    setError("");
    setEditingItemId(item.id);
    setForm({
      name: item.name,
      sku: item.sku,
      price: String(item.price),
      taxable: item.taxable,
      vatEnabled: item.vatEnabled,
      whtEnabled: item.whtEnabled,
      onHand: String(item.onHand),
      reorderPoint: String(item.reorderPoint),
      kind: item.kind,
    });
    setIsFormOpen(true);
  };

  const saveItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) throw new Error("Sign in again to manage items and stock.");
      const response = await fetch(
        `${API_BASE_URL}/dashboard/items${editingItemId ? `/${encodeURIComponent(editingItemId)}` : ""}`,
        {
          method: editingItemId ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            price: Number(form.price),
            taxable: form.taxable,
            vatEnabled: form.vatEnabled,
            whtEnabled: form.whtEnabled,
            onHand: form.kind === "service" ? 0 : Number(form.onHand),
            reorderPoint:
              form.kind === "service" ? 0 : Number(form.reorderPoint),
          }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getApiError(payload, "Could not save this item."));
      }
      if (!isRecord(payload) || !isStockItem(payload.item)) {
        throw new Error("The inventory service returned invalid item data.");
      }
      setIsFormOpen(false);
      setForm(emptyForm);
      if (!(await loadItems())) return;
      onNotice(editingItemId ? "Item updated." : "Item added.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this item. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteItem = async (item: StockItem) => {
    const confirmed = await confirm({
      title: `Delete ${item.name}?`,
      message: "This cannot be undone.",
      confirmLabel: "Delete item",
      destructive: true,
    });
    if (!confirmed) return;
    setBusyItemId(item.id);
    setError("");
    try {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) throw new Error("Sign in again to manage items and stock.");
      const response = await fetch(
        `${API_BASE_URL}/dashboard/items/${encodeURIComponent(item.id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getApiError(payload, "Could not delete this item."));
      }
      if (!(await loadItems())) return;
      onNotice("Item deleted.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete this item. Please try again.",
      );
    } finally {
      setBusyItemId("");
    }
  };

  const openPurchaseOrder = async () => {
    setError("");
    try {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) throw new Error("Sign in again to create purchase orders.");
      const response = await fetch(`${API_BASE_URL}/dashboard/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getApiError(payload, "Could not load suppliers."));
      }
      if (
        !isRecord(payload) ||
        !Array.isArray(payload.contacts) ||
        !payload.contacts.every(isRecord)
      ) {
        throw new Error("The contacts service returned invalid supplier data.");
      }
      const availableSuppliers = payload.contacts
        .filter((contact) => contact.kind === "supplier")
        .filter(isSupplier);
      if (!availableSuppliers.length) {
        throw new Error(
          "Add a supplier in Contacts before creating a purchase order.",
        );
      }
      const initialSelection = Object.fromEntries(
        suggestedItems.map((item) => [item.id, true]),
      );
      const initialQuantities = Object.fromEntries(
        suggestedItems.map((item) => [
          item.id,
          String(Math.max(item.reorderPoint - item.onHand, 1)),
        ]),
      );
      setSuppliers(availableSuppliers);
      setSupplierId(availableSuppliers[0].id);
      setSelectedOrderItems(initialSelection);
      setOrderQuantities(initialQuantities);
      setOrderCosts({});
      setIsPurchaseOrderOpen(true);
    } catch (openError) {
      setError(
        openError instanceof Error
          ? openError.message
          : "Could not open a purchase order. Please try again.",
      );
    }
  };

  const createPurchaseOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSavingPurchaseOrder) return;
    const lines = products
      .filter((item) => selectedOrderItems[item.id])
      .map((item) => ({
        itemId: item.id,
        quantity: Number(orderQuantities[item.id]),
        unitCost: Number(orderCosts[item.id]),
      }));
    if (
      !supplierId ||
      !lines.length ||
      lines.some(
        (line) =>
          !Number.isInteger(line.quantity) ||
          line.quantity < 1 ||
          !Number.isFinite(line.unitCost) ||
          line.unitCost < 0 ||
          Math.round(line.unitCost * 100) !== line.unitCost * 100,
      )
    ) {
      setError(
        "Choose a supplier and product lines with a whole quantity and valid unit cost.",
      );
      return;
    }
    setIsSavingPurchaseOrder(true);
    setError("");
    try {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) throw new Error("Sign in again to create purchase orders.");
      const response = await fetch(
        `${API_BASE_URL}/dashboard/purchase-orders`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ supplierId, lines }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiError(payload, "Could not create the purchase order."),
        );
      }
      setIsPurchaseOrderOpen(false);
      if (!(await loadItems()) || !(await loadPurchaseOrders())) return;
      onNotice(getApiError(payload, "Purchase order created successfully."));
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not create the purchase order. Please try again.",
      );
    } finally {
      setIsSavingPurchaseOrder(false);
    }
  };

  const receivePurchaseOrder = async (order: PurchaseOrder) => {
    setReceivingOrderId(order.id);
    setError("");
    try {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) throw new Error("Sign in again to receive purchase orders.");
      const response = await fetch(
        `${API_BASE_URL}/dashboard/purchase-orders/${encodeURIComponent(order.id)}/receive`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getApiError(payload, "Could not receive this purchase order."),
        );
      }
      if (!(await loadItems()) || !(await loadPurchaseOrders())) return;
      onNotice(getApiError(payload, "Stock received and inventory updated."));
    } catch (receiveError) {
      setError(
        receiveError instanceof Error
          ? receiveError.message
          : "Could not receive this purchase order. Please try again.",
      );
    } finally {
      setReceivingOrderId("");
    }
  };

  const importItems = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    try {
      if (file.size > 2_000_000) {
        throw new Error("Choose a CSV file smaller than 2 MB.");
      }
      const rows = parseCsv(await file.text());
      const header = rows.shift()?.map((cell) =>
        normalizeCsvHeader(cell),
      );
      if (
        !header ||
        ["name", "sku", "price"].some((column) =>
          findCsvColumn(header, column) === -1,
        )
      ) {
        throw new Error(
          "The CSV must include Item, SKU, and Price columns.",
        );
      }
      const importedItems = rows
        .filter((row) => row.some((cell) => cell.trim() !== ""))
        .map((row, index) => {
          if (row.length !== header.length) {
            throw new Error(
              `CSV row ${index + 2} has the wrong number of columns.`,
            );
          }
          const columnIndex = (key: string) => findCsvColumn(header, key);
          const value = (key: string) => {
            const index = columnIndex(key);
            return (index === -1 ? "" : (row[index] ?? "").trim()).replace(
              /^'(?=[=+\-@])/,
              "",
            );
          };
          const taxableValue = value("taxable").toLowerCase();
          const kindValue = value("kind").toLowerCase();
          const price = Number(value("price").replace(/,/g, ""));
          const onHand = value("onhand")
            ? Number(value("onhand"))
            : 0;
          const reorderPoint = value("reorderpoint")
            ? Number(value("reorderpoint"))
            : 0;
          if (!Number.isFinite(price) || price < 0) {
            throw new Error(`CSV row ${index + 2} has an invalid price.`);
          }
          if (
            (kindValue && kindValue !== "product" && kindValue !== "service") ||
            !Number.isInteger(onHand) ||
            onHand < 0 ||
            !Number.isInteger(reorderPoint) ||
            reorderPoint < 0
          ) {
            throw new Error(
              `CSV row ${index + 2} has invalid item field values.`,
            );
          }
          return {
            name: value("name"),
            sku: value("sku"),
            kind: kindValue || "product",
            price,
            taxable:
              taxableValue === ""
                ? true
                : taxableValue === "true" || taxableValue === "1",
            onHand,
            reorderPoint,
          };
        });
      if (importedItems.length < 1 || importedItems.length > 500) {
        throw new Error("Import between 1 and 500 item rows at a time.");
      }
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) throw new Error("Sign in again to import items.");
      const response = await fetch(`${API_BASE_URL}/dashboard/items/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: importedItems }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getApiError(payload, "Could not import items."));
      }
      if (!(await loadItems())) return;
      onNotice(getApiError(payload, "Items imported successfully."));
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Could not import items. Please check the CSV and try again.",
      );
    }
  };

  const exportItems = () => {
    const header = [
      "Item",
      "SKU",
      "Type",
      "Price",
      "Tax",
      "On hand",
      "Reorder point",
    ];
    const rows = items.map((item) => [
      item.name,
      item.sku,
      item.kind,
      String(item.price),
      String(item.taxable),
      String(item.onHand),
      String(item.reorderPoint),
    ]);
    downloadCsv("darobooks-items.csv", [header, ...rows]);
  };

  if (initialItemId) {
    const viewedItem = items.find((item) => item.id === initialItemId);

    if (!isLoading && !viewedItem) {
      return (
        <section>
          <Link
            href="/dashboard/items"
            className="text-[10px] font-bold text-[#1e4fc1]"
          >
            ← Back to items and stock
          </Link>
          <div className="mt-3 rounded-xl border border-[#e1e8f4] bg-white p-8 text-center text-[11px] text-slate-500">
            Item not found.
          </div>
        </section>
      );
    }

    if (viewedItem) {
      const viewedItemRecords = itemRecordsById.get(viewedItem.id) ?? [];
      const viewedStatus = itemStatus(viewedItem);

      return (
        <section>
          <Link
            href="/dashboard/items"
            className="text-[10px] font-bold text-[#1e4fc1]"
          >
            ← Back to items and stock
          </Link>
          <div className="mt-3 overflow-hidden rounded-xl border border-[#e1e8f4] bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf1f7] p-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {viewedItem.kind === "service" ? "Service" : "Product"} · {viewedItem.sku}
                </p>
                <h1 className="mt-1 text-xl font-bold text-[#10213c]">
                  {viewedItem.name}
                </h1>
              </div>
              <span className="rounded-full bg-[#edf3ff] px-3 py-1 text-[9px] font-bold text-[#365ca6]">
                {viewedStatus}
              </span>
            </div>
            <dl className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-[9px] text-slate-500">Price</dt>
                <dd className="mt-1 text-[14px] font-bold text-[#10213c]">
                  {formatMoney(viewedItem.price, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] text-slate-500">Tax</dt>
                <dd className="mt-1 text-[11px] font-semibold">
                  {viewedItem.taxable ? "Taxable" : "Non-taxable"}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] text-slate-500">On hand</dt>
                <dd className="mt-1 text-[14px] font-bold text-[#10213c]">
                  {viewedItem.onHand}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] text-slate-500">Stock value</dt>
                <dd className="mt-1 text-[14px] font-bold text-[#10213c]">
                  {formatMoney(viewedItem.price * viewedItem.onHand, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] text-slate-500">Reorder point</dt>
                <dd className="mt-1 text-[11px] font-semibold">
                  {viewedItem.kind === "service" ? "Not applicable" : viewedItem.reorderPoint}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] text-slate-500">VAT</dt>
                <dd className="mt-1 text-[11px] font-semibold">
                  {viewedItem.vatEnabled ? "Enabled" : "Disabled"}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] text-slate-500">WHT</dt>
                <dd className="mt-1 text-[11px] font-semibold">
                  {viewedItem.whtEnabled ? "Enabled" : "Disabled"}
                </dd>
              </div>
            </dl>
            <div className="border-t border-[#edf1f7] p-5">
              <h2 className="text-[12px] font-bold text-[#10213c]">Purchase history</h2>
              {viewedItemRecords.length ? (
                <div className="mt-3 divide-y divide-[#edf1f7] rounded-lg border border-[#e1e8f4]">
                  {viewedItemRecords.map((record) => (
                    <div key={record.id} className="grid gap-2 p-3 sm:grid-cols-4">
                      <span className="font-semibold text-[#10213c]">{record.orderNumber}</span>
                      <span>{record.supplierName}</span>
                      <span>{record.quantity} ordered</span>
                      <span className="sm:text-right">{formatMoney(record.unitCost, record.currency)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[10px] text-slate-500">
                  No purchase records for this item yet.
                </p>
              )}
            </div>
          </div>
        </section>
      );
    }
  }

  return (
    <section aria-labelledby="items-heading">
      {dialog}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 inline-flex rounded-full bg-[#e5f7f5] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#087b74]">
            DaroStock
          </p>
          <h1
            id="items-heading"
            className="font-jakarta text-[21px] font-bold tracking-[-0.4px] text-[#10213c]"
          >
            Items and stock
          </h1>
          <p className="mt-1 text-[11px] text-slate-600">
            Your catalogue of products and services, with quantity on hand, cost
            and reorder alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={importFileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              void importItems(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => importFileRef.current?.click()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d5dfef] bg-white px-3 text-[10px] font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <RiDownload2Line className="h-4 w-4" />
            Import items
          </button>
          <button
            type="button"
            onClick={exportItems}
            disabled={!items.length}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d5dfef] bg-white px-3 text-[10px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1e4fc1] px-3 text-[10px] font-bold text-white transition hover:bg-blue-800"
          >
            <RiAddLine className="h-4 w-4" />
            New item
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-800"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              void loadItems();
            }}
            disabled={isLoading}
            className="font-bold underline disabled:opacity-60"
          >
            Retry
          </button>
        </div>
      )}

      <section
        aria-label="Stock summary"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        <Metric label="Items" value={String(items.length)} />
        <Metric label="Stock value" value={formatMoney(stockValue, currency)} />
        <Metric label="Low stock" value={String(lowStockCount)} />
        <Metric label="Out of stock" value={String(outOfStockCount)} />
      </section>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(260px,0.85fr)]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-[#dfe7f4] bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#e8edf5] px-3 py-2.5">
            {filterOptions.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                aria-pressed={activeFilter === filter}
                className={`rounded-full border px-3 py-1 text-[10px] font-semibold transition ${
                  activeFilter === filter
                    ? "border-[#1e4fc1] bg-[#1e4fc1] text-white"
                    : "border-[#d8e1ef] bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[790px] border-collapse text-left">
              <thead className="bg-[#f8fafc] text-[9px] font-semibold text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Item</th>
                  <th className="px-2 py-2.5">SKU</th>
                  <th className="px-2 py-2.5">Price</th>
                  <th className="px-2 py-2.5">Tax</th>
                  <th className="px-2 py-2.5 text-right">On hand</th>
                  <th className="px-2 py-2.5 text-right">Value</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1f7]">
                {filteredItems.map((item) => {
                  const status = itemStatus(item);
                  const statusClass =
                    status === "In stock"
                      ? "bg-[#e5f7f5] text-[#087b74]"
                      : status === "Low stock"
                        ? "bg-[#fff2dc] text-[#a66500]"
                        : status === "Out of stock"
                          ? "bg-[#ffebeb] text-[#ba3232]"
                          : "bg-[#edf3ff] text-[#365ca6]";
                  const itemRecords = itemRecordsById.get(item.id) ?? [];
                  const connectedEmails = Array.from(
                    new Set(
                      itemRecords
                        .map((record) => record.supplierEmail)
                        .filter((email): email is string => Boolean(email)),
                    ),
                  );
                  const isExpanded = Boolean(expandedItemIds[item.id]);

                  return (
                    <Fragment key={item.id}>
                      <tr key={item.id} className="text-[10px] text-[#10213c]">
                        <td className="max-w-[190px] px-3 py-2.5 font-semibold">
                          <span className="block truncate">{item.name}</span>
                        </td>
                        <td className="px-2 py-2.5 text-slate-600">{item.sku}</td>
                        <td className="whitespace-nowrap px-2 py-2.5">
                          {formatMoney(item.price, currency)}
                        </td>
                        <td className="px-2 py-2.5 text-slate-600">
                          {item.taxable ? "Taxable" : "Non-taxable"}
                        </td>
                        <td className="px-2 py-2.5 text-right">{item.onHand}</td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-right">
                          {formatMoney(item.price * item.onHand, currency)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-[8px] font-bold ${statusClass}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end gap-1">
                            <Link
                              href={`/dashboard/items/${item.id}`}
                              className="dashboard-action-button"
                              aria-label={`View ${item.name}`}
                              title="View item and stock"
                            >
                              <RiEyeLine className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedItemIds((current) => ({
                                  ...current,
                                  [item.id]: !current[item.id],
                                }))
                              }
                              className="dashboard-action-button"
                              aria-label={isExpanded ? `Hide records for ${item.name}` : `Show records for ${item.name}`}
                            >
                              {isExpanded ? "Hide" : `Records (${itemRecords.length})`}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditForm(item)}
                              aria-label={`Edit ${item.name}`}
                              className="dashboard-action-button"
                            >
                              <RiEditLine className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteItem(item)}
                              disabled={busyItemId === item.id}
                              aria-label={`Delete ${item.name}`}
                              className="dashboard-action-button dashboard-action-button-danger"
                            >
                              <RiDeleteBinLine className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${item.id}-details`}>
                          <td colSpan={8} className="bg-slate-50 px-4 py-3">
                            <div className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.8fr)]">
                              <div className="rounded-xl border border-[#dfe7f4] bg-white p-3">
                                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                  Connected email
                                </p>
                                {connectedEmails.length ? (
                                  <ul className="mt-2 space-y-1 text-[10px] text-slate-700">
                                    {connectedEmails.map((email) => (
                                      <li key={email}>
                                        <a
                                          href={`mailto:${email}`}
                                          className="break-all text-[#1e4fc1] underline"
                                        >
                                          {email}
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="mt-2 text-[10px] text-slate-500">
                                    No connected email yet.
                                  </p>
                                )}
                              </div>
                              <div className="rounded-xl border border-[#dfe7f4] bg-white p-3">
                                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                  Item records
                                </p>
                                {itemRecords.length ? (
                                  <div className="mt-2 space-y-2">
                                    {itemRecords.map((record) => (
                                      <div
                                        key={record.id}
                                        className="rounded-lg border border-[#edf1f7] bg-slate-50 p-2"
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <span className="font-semibold text-[#10213c]">
                                            {record.orderNumber}
                                          </span>
                                          <span className="rounded-full bg-[#edf3ff] px-2 py-0.5 text-[8px] font-bold uppercase text-[#365ca6]">
                                            {record.orderStatus}
                                          </span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-2 text-[9px] text-slate-600">
                                          <span>{record.supplierName}</span>
                                          <span>•</span>
                                          <span>
                                            {record.quantity} ordered
                                          </span>
                                          <span>•</span>
                                          <span>
                                            {formatMoney(record.unitCost, record.currency)}
                                          </span>
                                        </div>
                                        <div className="mt-1 text-[9px] text-slate-500">
                                          {new Date(record.createdAt).toLocaleDateString(undefined, {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mt-2 text-[10px] text-slate-500">
                                    No records for this item yet.
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {!isLoading && !filteredItems.length && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-[11px] text-slate-500"
                    >
                      {search.trim() || activeFilter !== "All items"
                        ? "No items match this filter or search."
                        : "No items yet. Add your first product or service to get started."}
                    </td>
                  </tr>
                )}
                {isLoading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-[11px] text-slate-500"
                    >
                      Loading items…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-3">
          <section className="rounded-xl border border-[#dfe7f4] bg-white p-4">
            <h2 className="text-[12px] font-bold text-[#10213c]">
              Reorder suggestions
            </h2>
            <p className="mt-1 text-[9px] text-slate-500">
              Items at or below their reorder point
            </p>
            {suggestedItems.length ? (
              <ul className="mt-3 divide-y divide-[#edf1f7]">
                {suggestedItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-2 first:pt-0"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-semibold text-[#10213c]">
                        {item.name}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        {item.onHand === 0
                          ? "Out of stock"
                          : `${item.onHand} on hand · reorder level ${item.reorderPoint}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] font-bold text-[#10213c]">
                      {Math.max(item.reorderPoint - item.onHand, 1)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[10px] text-slate-500">
                {isLoading
                  ? "Loading stock levels…"
                  : "No items need reordering right now."}
              </p>
            )}
            <button
              type="button"
              onClick={() => void openPurchaseOrder()}
              className="mt-3 w-full rounded-lg bg-[#078b80] px-3 py-2 text-[10px] font-bold text-white transition hover:bg-[#06776e]"
            >
              Create purchase order
            </button>
          </section>

          <section className="rounded-xl border border-[#dfe7f4] bg-white p-4">
            <h2 className="text-[12px] font-bold text-[#10213c]">
              Recent purchase orders
            </h2>
            {purchaseOrders.length ? (
              <ul className="mt-3 divide-y divide-[#edf1f7]">
                {purchaseOrders.slice(0, 4).map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center justify-between gap-2 py-2 first:pt-0"
                  >
                    <span className="min-w-0">
                      <span className="block text-[10px] font-semibold">
                        {order.orderNumber} · {order.supplierName}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        {formatMoney(order.total, order.currency)} ·{" "}
                        {order.status}
                      </span>
                    </span>
                    {order.status === "open" && (
                      <button
                        type="button"
                        disabled={receivingOrderId === order.id}
                        onClick={() => void receivePurchaseOrder(order)}
                        className="shrink-0 rounded-md bg-[#e5f7f5] px-2 py-1 text-[8px] font-bold text-[#087b74] hover:bg-[#d2efec] disabled:opacity-50"
                      >
                        {receivingOrderId === order.id
                          ? "Receiving…"
                          : "Receive"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[9px] text-slate-500">
                No purchase orders yet.
              </p>
            )}
          </section>
        </aside>
      </div>

      {isFormOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              setIsFormOpen(false);
            }
          }}
        >
          <form
            onSubmit={saveItem}
            aria-labelledby="item-form-title"
            className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#dfe7f4] bg-white p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="item-form-title"
                  className="text-[18px] font-bold text-[#10213c]"
                >
                  {editingItemId ? "Edit item" : "New item"}
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  Item data is saved to your workspace inventory.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close form"
                disabled={isSubmitting}
                onClick={() => setIsFormOpen(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-[10px] font-semibold text-slate-700">
                Type
                <select
                  value={form.kind}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      kind: event.target.value as ItemKind,
                    }))
                  }
                  className="mt-1 block h-10 w-full rounded-lg border border-[#dbe4f3] bg-white px-3 text-[11px] outline-none focus:border-[#1e4fc1]"
                >
                  <option value="product">Product</option>
                  <option value="service">Service</option>
                </select>
              </label>
              <label className="text-[10px] font-semibold text-slate-700">
                Item name
                <input
                  autoFocus
                  required
                  minLength={2}
                  maxLength={160}
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="mt-1 block h-10 w-full rounded-lg border border-[#dbe4f3] px-3 text-[11px] outline-none focus:border-[#1e4fc1]"
                />
              </label>
              <label className="text-[10px] font-semibold text-slate-700">
                SKU
                <input
                  required
                  maxLength={48}
                  value={form.sku}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sku: event.target.value,
                    }))
                  }
                  className="mt-1 block h-10 w-full rounded-lg border border-[#dbe4f3] px-3 text-[11px] outline-none focus:border-[#1e4fc1]"
                />
              </label>
              <label className="text-[10px] font-semibold text-slate-700">
                Price ({currency})
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      price: event.target.value,
                    }))
                  }
                  className="mt-1 block h-10 w-full rounded-lg border border-[#dbe4f3] px-3 text-[11px] outline-none focus:border-[#1e4fc1]"
                />
              </label>
              <label className="flex items-center gap-2 text-[10px] font-medium text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.taxable}
                  onChange={(event) => {
                    const taxable = event.target.checked;
                    setForm((current) => ({
                      ...current,
                      taxable,
                      vatEnabled: taxable ? current.vatEnabled : false,
                      whtEnabled: taxable ? current.whtEnabled : false,
                    }));
                  }}
                  className="h-4 w-4 accent-[#1e4fc1]"
                />
                Taxable
              </label>
              <label className="flex items-center gap-2 text-[10px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.vatEnabled}
                  disabled={!form.taxable}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      vatEnabled: event.target.checked,
                      taxable: current.taxable || event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[#1e4fc1] disabled:opacity-50"
                />
                VAT active
              </label>
              <label className="flex items-center gap-2 text-[10px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.whtEnabled}
                  disabled={!form.taxable}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      whtEnabled: event.target.checked,
                      taxable: current.taxable || event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[#1e4fc1] disabled:opacity-50"
                />
                WHT active
              </label>
              {form.kind === "product" && (
                <>
                  <label className="text-[10px] font-semibold text-slate-700">
                    Quantity on hand
                    <input
                      required
                      type="number"
                      min="0"
                      step="1"
                      value={form.onHand}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          onHand: event.target.value,
                        }))
                      }
                      className="mt-1 block h-10 w-full rounded-lg border border-[#dbe4f3] px-3 text-[11px] outline-none focus:border-[#1e4fc1]"
                    />
                  </label>
                  <label className="text-[10px] font-semibold text-slate-700">
                    Reorder point
                    <input
                      required
                      type="number"
                      min="0"
                      step="1"
                      value={form.reorderPoint}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          reorderPoint: event.target.value,
                        }))
                      }
                      className="mt-1 block h-10 w-full rounded-lg border border-[#dbe4f3] px-3 text-[11px] outline-none focus:border-[#1e4fc1]"
                    />
                  </label>
                </>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-3 text-[11px] text-red-700">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsFormOpen(false)}
                className="rounded-lg border border-[#dbe4f3] px-4 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-[#1e4fc1] px-4 py-2 text-[11px] font-bold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <ActionSpinner label="Saving item" /> Saving…
                  </span>
                ) : editingItemId ? (
                  "Save changes"
                ) : (
                  "Create item"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
              {isPurchaseOrderOpen && (
                <div
                  className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4"
                  role="presentation"
                  onMouseDown={(event) => {
                    if (
                      event.target === event.currentTarget &&
                      !isSavingPurchaseOrder
                    ) {
                      setIsPurchaseOrderOpen(false);
                    }
                  }}
                >
                  <form
                    onSubmit={createPurchaseOrder}
                    aria-labelledby="purchase-order-title"
                    className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#dfe7f4] bg-white p-5 shadow-xl"
                  >
                    <h2
                      id="purchase-order-title"
                      className="text-[18px] font-bold text-[#10213c]"
                    >
                      Create purchase order
                    </h2>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Receiving an order adds the received quantities to stock.
                    </p>
                    <label className="mt-4 block text-[10px] font-semibold text-slate-700">
                      Supplier
                      <select
                        required
                        value={supplierId}
                        onChange={(event) => setSupplierId(event.target.value)}
                        className="mt-1 block h-10 w-full rounded-lg border border-[#dbe4f3] bg-white px-3 text-[11px]"
                      >
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="mt-4 overflow-x-auto rounded-lg border border-[#e1e8f4]">
                      <table className="w-full min-w-[560px] text-left text-[9px]">
                        <thead className="bg-[#f8fafc] text-slate-500">
                          <tr>
                            <th className="p-2">Product</th>
                            <th className="p-2">Quantity</th>
                            <th className="p-2">Unit cost ({currency})</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#edf1f7]">
                          {products.map((item) => (
                            <tr key={item.id}>
                              <td className="p-2">
                                <label className="flex items-center gap-2 font-semibold">
                                  <input
                                    type="checkbox"
                                    checked={
                                      selectedOrderItems[item.id] ?? false
                                    }
                                    onChange={(event) =>
                                      setSelectedOrderItems((current) => ({
                                        ...current,
                                        [item.id]: event.target.checked,
                                      }))
                                    }
                                  />
                                  {item.name}{" "}
                                  <span className="font-normal text-slate-500">
                                    ({item.sku})
                                  </span>
                                </label>
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  disabled={!selectedOrderItems[item.id]}
                                  value={orderQuantities[item.id] ?? ""}
                                  onChange={(event) =>
                                    setOrderQuantities((current) => ({
                                      ...current,
                                      [item.id]: event.target.value,
                                    }))
                                  }
                                  className="w-24 rounded-md border border-[#dbe4f3] px-2 py-1.5 disabled:bg-slate-50"
                                  aria-label={`Quantity of ${item.name}`}
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  disabled={!selectedOrderItems[item.id]}
                                  value={orderCosts[item.id] ?? ""}
                                  onChange={(event) =>
                                    setOrderCosts((current) => ({
                                      ...current,
                                      [item.id]: event.target.value,
                                    }))
                                  }
                                  className="w-28 rounded-md border border-[#dbe4f3] px-2 py-1.5 disabled:bg-slate-50"
                                  aria-label={`Unit cost of ${item.name}`}
                                />
                              </td>
                            </tr>
                          ))}
                          {!products.length && (
                            <tr>
                              <td
                                colSpan={3}
                                className="p-5 text-center text-slate-500"
                              >
                                Add a product before creating a purchase order.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={isSavingPurchaseOrder}
                        onClick={() => setIsPurchaseOrderOpen(false)}
                        className="rounded-lg border border-[#dbe4f3] px-4 py-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingPurchaseOrder || !products.length}
                        className="rounded-lg bg-[#078b80] px-4 py-2 text-[10px] font-bold text-white hover:bg-[#06776e] disabled:cursor-wait disabled:opacity-60"
                      >
                        {isSavingPurchaseOrder ? (
                          <span className="inline-flex items-center gap-2">
                            <ActionSpinner label="Creating purchase order" />{" "}
                            Creating…
                          </span>
                        ) : (
                          "Create purchase order"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#dfe7f4] bg-white px-3 py-3">
      <p className="text-[10px] font-semibold text-slate-600">{label}</p>
      <p className="mt-1 text-[17px] font-bold tracking-[-0.3px] text-[#10213c]">
        {value}
      </p>
    </div>
  );
}

function normalizeCsvHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function findCsvColumn(headers: string[], field: string): number {
  const aliases: Record<string, string[]> = {
    name: ["name", "item", "itemname", "productname", "servicename"],
    sku: ["sku", "stockkeepingunit", "productcode", "itemcode"],
    kind: ["kind", "type", "itemtype", "producttype"],
    price: ["price", "unitprice", "sellingprice", "itemprice"],
    taxable: ["taxable", "tax", "taxstatus", "istaxable"],
    onhand: ["onhand", "stock", "quantityonhand", "stockonhand", "quantity"],
    reorderpoint: ["reorderpoint", "reorderlevel", "minimumstock", "lowstocklevel"],
  };

  return headers.findIndex((header) => aliases[field]?.includes(header));
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (inQuotes) {
        inQuotes = false;
      } else if (!cell) {
        inQuotes = true;
      } else {
        throw new Error("The CSV contains a quote in an invalid position.");
      }
    } else if (character === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value !== "") || rows.length > 0) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (inQuotes) throw new Error("The CSV has an unclosed quoted field.");
  row.push(cell);
  if (row.some((value) => value !== "") || rows.length > 0) rows.push(row);
  return rows;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const safeValue = /^[=+\-@]/.test(value.trimStart())
            ? `'${value}`
            : value;
          return `"${safeValue.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
  const objectUrl = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
